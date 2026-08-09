import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

export type MediaCopyEntry = {
  key: string
  relativePath: string
  sha256: string
  size: number
  sourcePath: string
}

export type RemoteMediaObject = {
  sha256: string
  size: number
}

export type MediaObjectStore = {
  inspectObject(key: string): Promise<RemoteMediaObject | null>
  putObject(entry: MediaCopyEntry): Promise<void>
}

export type MediaCopyResult = {
  copied: number
  exitCode: 0 | 1
  mismatched: number
  missing: number
  planned: number
  skipped: number
}

export function parseMediaCopyArgs(args: string[]) {
  const options = { dryRun: false, source: 'apps/web/uploads', verifyOnly: false }

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === '--') {
      continue
    } else if (argument === '--source') {
      const source = args[index + 1]
      if (!source || source.startsWith('--')) throw new Error('--source requires a directory.')
      options.source = source
      index += 1
    } else if (argument === '--dry-run') {
      options.dryRun = true
    } else if (argument === '--verify-only') {
      options.verifyOnly = true
    } else {
      throw new Error(`Unknown argument: ${argument}`)
    }
  }

  if (options.dryRun && options.verifyOnly) {
    throw new Error('--dry-run and --verify-only cannot be combined.')
  }
  return options
}

type S3CommandClient = {
  send(command: HeadObjectCommand | GetObjectCommand | PutObjectCommand): Promise<unknown>
}

async function sha256Body(body: unknown) {
  if (!body) throw new Error('MinIO returned an empty object body during verification.')
  const hash = createHash('sha256')

  if (
    typeof body === 'object' &&
    'transformToByteArray' in body &&
    typeof body.transformToByteArray === 'function'
  ) {
    hash.update(await body.transformToByteArray())
    return hash.digest('hex')
  }
  if (typeof body === 'object' && Symbol.asyncIterator in body) {
    for await (const chunk of body as AsyncIterable<Uint8Array>) hash.update(chunk)
    return hash.digest('hex')
  }

  throw new Error('MinIO returned an unsupported object body during verification.')
}

function isNotFound(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const statusCode =
    '$metadata' in error &&
    error.$metadata &&
    typeof error.$metadata === 'object' &&
    'httpStatusCode' in error.$metadata
      ? error.$metadata.httpStatusCode
      : undefined
  const name = 'name' in error ? error.name : undefined
  return statusCode === 404 || name === 'NotFound' || name === 'NoSuchKey'
}

export function createS3MediaObjectStore(
  client: S3CommandClient,
  bucket: string,
): MediaObjectStore {
  if (!bucket.trim()) throw new Error('MINIO_BUCKET is required.')

  return {
    inspectObject: async (key) => {
      let head: { ContentLength?: number; Metadata?: Record<string, string> }
      try {
        head = (await client.send(
          new HeadObjectCommand({ Bucket: bucket, Key: key }),
        )) as typeof head
      } catch (error) {
        if (isNotFound(error)) return null
        throw error
      }

      if (typeof head.ContentLength !== 'number') {
        throw new Error(`MinIO did not return a content length for ${key}.`)
      }
      const metadataSha256 = head.Metadata?.sha256
      if (metadataSha256) return { sha256: metadataSha256, size: head.ContentLength }

      const object = (await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }))) as {
        Body?: unknown
      }
      return { sha256: await sha256Body(object.Body), size: head.ContentLength }
    },
    putObject: async (entry) => {
      await client.send(
        new PutObjectCommand({
          Body: createReadStream(entry.sourcePath),
          Bucket: bucket,
          ContentLength: entry.size,
          Key: entry.key,
          Metadata: { sha256: entry.sha256 },
        }),
      )
    },
  }
}

export async function runMediaCopyCommand({
  args,
  log = console.log,
  store,
}: {
  args: string[]
  log?: (line: string) => void
  store: MediaObjectStore
}) {
  const options = parseMediaCopyArgs(args)
  const entries = await planMediaCopy(options.source)
  entries.forEach(({ key }) => log(key))
  const result = await executeMediaCopy({ ...options, entries, store })
  log(
    `copied=${result.copied} skipped=${result.skipped} planned=${result.planned} missing=${result.missing} mismatched=${result.mismatched}`,
  )
  return result.exitCode
}

function requiredEnvironment(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required.`)
  return value
}

async function main() {
  const forcePathStyle = requiredEnvironment('MINIO_FORCE_PATH_STYLE')
  if (forcePathStyle !== 'true' && forcePathStyle !== 'false') {
    throw new Error('MINIO_FORCE_PATH_STYLE must be true or false.')
  }

  const client = new S3Client({
    credentials: {
      accessKeyId: requiredEnvironment('MINIO_ACCESS_KEY'),
      secretAccessKey: requiredEnvironment('MINIO_SECRET_KEY'),
    },
    endpoint: requiredEnvironment('MINIO_ENDPOINT'),
    forcePathStyle: forcePathStyle === 'true',
    region: requiredEnvironment('MINIO_REGION'),
  })
  const store = createS3MediaObjectStore(client, requiredEnvironment('MINIO_BUCKET'))
  return runMediaCopyCommand({ args: process.argv.slice(2), store })
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : undefined
if (invokedPath === fileURLToPath(import.meta.url)) {
  main()
    .then((exitCode) => {
      process.exitCode = exitCode
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : 'Media copy failed.')
      process.exitCode = 1
    })
}

function normalizePrefix(prefix: string) {
  const segments = prefix.replaceAll('\\', '/').split('/').filter(Boolean)
  if (segments.length === 0 || segments.some((segment) => segment === '.' || segment === '..')) {
    throw new Error('Media prefix must contain only safe path segments.')
  }
  return segments.join('/')
}

async function listFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const candidate = path.join(directory, entry.name)
    if (entry.isSymbolicLink()) {
      throw new Error(`Refusing symbolic link in media source: ${candidate}`)
    }
    if (entry.isDirectory()) {
      files.push(...(await listFiles(candidate)))
    } else if (entry.isFile()) {
      files.push(candidate)
    }
  }

  return files
}

async function sha256File(filename: string) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(filename)) hash.update(chunk as Buffer)
  return hash.digest('hex')
}

export async function planMediaCopy(source: string, prefix = 'media'): Promise<MediaCopyEntry[]> {
  const sourceRoot = path.resolve(source)
  const sourceStat = await stat(sourceRoot)
  if (!sourceStat.isDirectory()) throw new Error(`Media source is not a directory: ${sourceRoot}`)

  const safePrefix = normalizePrefix(prefix)
  const files = await listFiles(sourceRoot)
  const entries = await Promise.all(
    files.map(async (sourcePath) => {
      const fileStat = await stat(sourcePath)
      const relativePath = path.relative(sourceRoot, sourcePath).split(path.sep).join('/')
      return {
        key: `${safePrefix}/${relativePath}`,
        relativePath,
        sha256: await sha256File(sourcePath),
        size: fileStat.size,
        sourcePath,
      }
    }),
  )

  return entries.sort((left, right) => left.key.localeCompare(right.key))
}

function matches(entry: MediaCopyEntry, remote: RemoteMediaObject) {
  return entry.size === remote.size && entry.sha256 === remote.sha256
}

export async function executeMediaCopy({
  dryRun = false,
  entries,
  store,
  verifyOnly = false,
}: {
  dryRun?: boolean
  entries: MediaCopyEntry[]
  store: MediaObjectStore
  verifyOnly?: boolean
}): Promise<MediaCopyResult> {
  if (dryRun && verifyOnly) throw new Error('--dry-run and --verify-only cannot be combined.')

  const result: MediaCopyResult = {
    copied: 0,
    exitCode: 0,
    mismatched: 0,
    missing: 0,
    planned: 0,
    skipped: 0,
  }

  for (const entry of [...entries].sort((left, right) => left.key.localeCompare(right.key))) {
    const remote = await store.inspectObject(entry.key)
    if (remote && matches(entry, remote)) {
      result.skipped += 1
      continue
    }
    if (remote) {
      result.mismatched += 1
      result.exitCode = 1
      continue
    }
    if (verifyOnly) {
      result.missing += 1
      result.exitCode = 1
      continue
    }
    if (dryRun) {
      result.planned += 1
      continue
    }

    await store.putObject(entry)
    const uploaded = await store.inspectObject(entry.key)
    if (!uploaded) {
      result.missing += 1
      result.exitCode = 1
    } else if (!matches(entry, uploaded)) {
      result.mismatched += 1
      result.exitCode = 1
    } else {
      result.copied += 1
    }
  }

  return result
}
