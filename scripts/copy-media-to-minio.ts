import { createHash } from 'node:crypto'
import { lstat, open, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

export const MEDIA_COPY_MAX_BYTES = 5_000_000
export const DEFAULT_MEDIA_SOURCE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../apps/web/uploads',
)

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
  putObject(entry: MediaCopyEntry): Promise<'already-exists' | 'uploaded' | void>
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
  const options = { dryRun: false, source: DEFAULT_MEDIA_SOURCE, verifyOnly: false }

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
  send(command: GetObjectCommand | PutObjectCommand): Promise<unknown>
}

function assertWithinMediaLimit(size: number, source: string) {
  if (size > MEDIA_COPY_MAX_BYTES) {
    throw new Error(
      `${source} exceeds the ${MEDIA_COPY_MAX_BYTES.toLocaleString('en-US')} bytes media limit.`,
    )
  }
}

async function sha256Body(body: unknown, declaredSize?: number) {
  if (!body) throw new Error('MinIO returned an empty object body during verification.')
  if (typeof declaredSize === 'number') assertWithinMediaLimit(declaredSize, 'Remote media')
  const hash = createHash('sha256')
  let size = 0

  const update = (chunk: Uint8Array) => {
    size += chunk.byteLength
    assertWithinMediaLimit(size, 'Remote media')
    hash.update(chunk)
  }

  if (typeof body === 'object' && Symbol.asyncIterator in body) {
    for await (const chunk of body as AsyncIterable<Uint8Array>) update(chunk)
  } else if (
    typeof body === 'object' &&
    'transformToWebStream' in body &&
    typeof body.transformToWebStream === 'function'
  ) {
    const reader = body.transformToWebStream().getReader()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        update(value)
      }
    } finally {
      reader.releaseLock()
    }
  } else {
    throw new Error('MinIO returned an unsupported object body during verification.')
  }

  return { sha256: hash.digest('hex'), size }
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

function isPreconditionFailed(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const statusCode =
    '$metadata' in error &&
    error.$metadata &&
    typeof error.$metadata === 'object' &&
    'httpStatusCode' in error.$metadata
      ? error.$metadata.httpStatusCode
      : undefined
  return statusCode === 412 || ('name' in error && error.name === 'PreconditionFailed')
}

export function createS3MediaObjectStore(
  client: S3CommandClient,
  bucket: string,
): MediaObjectStore {
  if (!bucket.trim()) throw new Error('MINIO_BUCKET is required.')

  return {
    inspectObject: async (key) => {
      try {
        const object = (await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }))) as {
          Body?: unknown
          ContentLength?: number
        }
        return await sha256Body(object.Body, object.ContentLength)
      } catch (error) {
        if (isNotFound(error)) return null
        throw error
      }
    },
    putObject: async (entry) => {
      const snapshot = await readBoundedSnapshot(entry.sourcePath)
      const snapshotSha256 = createHash('sha256').update(snapshot).digest('hex')
      if (snapshot.length !== entry.size || snapshotSha256 !== entry.sha256) {
        throw new SourceMediaChangedError(entry.key)
      }

      try {
        await client.send(
          new PutObjectCommand({
            Body: snapshot,
            Bucket: bucket,
            ContentLength: entry.size,
            IfNoneMatch: '*',
            Key: entry.key,
            Metadata: { sha256: entry.sha256 },
          }),
        )
        return 'uploaded'
      } catch (error) {
        if (isPreconditionFailed(error)) return 'already-exists'
        throw error
      }
    },
  }
}

class SourceMediaChangedError extends Error {
  constructor(key: string) {
    super(`Source media changed after planning: ${key}`)
    this.name = 'SourceMediaChangedError'
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

async function readBoundedSnapshot(filename: string) {
  const handle = await open(filename, 'r')
  try {
    const fileStat = await handle.stat()
    if (!fileStat.isFile()) throw new Error(`Media source is not a regular file: ${filename}`)
    assertWithinMediaLimit(fileStat.size, 'Local media')

    const snapshot = Buffer.allocUnsafe(fileStat.size)
    let offset = 0
    while (offset < snapshot.length) {
      const { bytesRead } = await handle.read(snapshot, offset, snapshot.length - offset, offset)
      if (bytesRead === 0) throw new SourceMediaChangedError(filename)
      offset += bytesRead
    }
    const extra = Buffer.allocUnsafe(1)
    const { bytesRead: extraBytes } = await handle.read(extra, 0, 1, offset)
    if (extraBytes !== 0) throw new SourceMediaChangedError(filename)
    return snapshot
  } finally {
    await handle.close()
  }
}

export async function planMediaCopy(
  source: string,
  prefix = 'media',
  {
    readSnapshot = readBoundedSnapshot,
  }: { readSnapshot?: (filename: string) => Promise<Buffer> } = {},
): Promise<MediaCopyEntry[]> {
  const sourceRoot = path.resolve(source)
  const sourceStat = await lstat(sourceRoot)
  if (sourceStat.isSymbolicLink()) {
    throw new Error(`Refusing symbolic link as media source root: ${sourceRoot}`)
  }
  if (!sourceStat.isDirectory()) throw new Error(`Media source is not a directory: ${sourceRoot}`)

  const safePrefix = normalizePrefix(prefix)
  const files = await listFiles(sourceRoot)
  const entries: MediaCopyEntry[] = []
  for (const sourcePath of files) {
    const fileStat = await lstat(sourcePath)
    if (fileStat.isSymbolicLink() || !fileStat.isFile()) {
      throw new Error(`Refusing non-regular media source: ${sourcePath}`)
    }
    assertWithinMediaLimit(fileStat.size, 'Local media')
    const snapshot = await readSnapshot(sourcePath)
    assertWithinMediaLimit(snapshot.length, 'Local media')
    if (snapshot.length !== fileStat.size) throw new SourceMediaChangedError(sourcePath)
    const relativePath = path.relative(sourceRoot, sourcePath).split(path.sep).join('/')
    entries.push({
      key: `${safePrefix}/${relativePath}`,
      relativePath,
      sha256: createHash('sha256').update(snapshot).digest('hex'),
      size: snapshot.length,
      sourcePath,
    })
  }

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

    let uploadResult: 'already-exists' | 'uploaded' | void
    try {
      uploadResult = await store.putObject(entry)
    } catch (error) {
      if (error instanceof SourceMediaChangedError) {
        result.mismatched += 1
        result.exitCode = 1
        continue
      }
      throw error
    }
    const uploaded = await store.inspectObject(entry.key)
    if (!uploaded) {
      result.missing += 1
      result.exitCode = 1
    } else if (!matches(entry, uploaded)) {
      result.mismatched += 1
      result.exitCode = 1
    } else {
      if (uploadResult === 'already-exists') result.skipped += 1
      else result.copied += 1
    }
  }

  return result
}
