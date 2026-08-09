import { createHash } from 'node:crypto'
import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'
import { afterEach, describe, expect, it } from 'vitest'

import * as copyModule from './copy-media-to-minio'

type Entry = {
  key: string
  relativePath: string
  sha256: string
  size: number
  sourcePath: string
}

type RemoteObject = { sha256: string; size: number }
type Store = {
  inspectObject(key: string): Promise<RemoteObject | null>
  putObject(entry: Entry): Promise<void>
}

type CopyResult = {
  copied: number
  exitCode: number
  mismatched: number
  missing: number
  planned: number
  skipped: number
}

const tempDirectories: string[] = []
const planMediaCopy = copyModule.planMediaCopy as unknown as (
  source: string,
  prefix?: string,
) => Promise<Entry[]>
const executeMediaCopy = copyModule.executeMediaCopy as unknown as (args: {
  dryRun?: boolean
  entries: Entry[]
  store: Store
  verifyOnly?: boolean
}) => Promise<CopyResult>
const parseMediaCopyArgs = copyModule.parseMediaCopyArgs as unknown as (args: string[]) => {
  dryRun: boolean
  source: string
  verifyOnly: boolean
}
const createS3MediaObjectStore = copyModule.createS3MediaObjectStore as unknown as (
  client: { send(command: { input: Record<string, unknown> }): Promise<Record<string, unknown>> },
  bucket: string,
) => Store
const runMediaCopyCommand = copyModule.runMediaCopyCommand as unknown as (options: {
  args: string[]
  log: (line: string) => void
  store: Store
}) => Promise<number>

async function temporarySource() {
  const directory = await mkdtemp(path.join(tmpdir(), 'jakartabc-media-'))
  tempDirectories.push(directory)
  return directory
}

afterEach(async () => {
  await Promise.all(
    tempDirectories.splice(0).map((directory) => rm(directory, { force: true, recursive: true })),
  )
})

describe('local media to MinIO copy', () => {
  it('exposes an injectable planner and executor', () => {
    const exports = copyModule as Record<string, unknown>

    expect(typeof exports.planMediaCopy).toBe('function')
    expect(typeof exports.executeMediaCopy).toBe('function')
    expect(typeof exports.parseMediaCopyArgs).toBe('function')
    expect(typeof exports.createS3MediaObjectStore).toBe('function')
    expect(typeof exports.runMediaCopyCommand).toBe('function')
  })

  it('maps nested files to deterministic prefixed keys with size and SHA-256', async () => {
    const source = await temporarySource()
    await mkdir(path.join(source, 'nested'))
    await writeFile(path.join(source, 'z.webp'), 'webp')
    await writeFile(path.join(source, 'nested', 'a.png'), 'png')

    const entries = await planMediaCopy(source, 'media')

    expect(entries.map(({ key }) => key)).toEqual(['media/nested/a.png', 'media/z.webp'])
    expect(entries[0]).toMatchObject({
      relativePath: 'nested/a.png',
      sha256: createHash('sha256').update('png').digest('hex'),
      size: 3,
    })
  })

  it('performs no writes during a dry run', async () => {
    const entry = entryFixture()
    const writes: string[] = []
    const store = fakeStore(null, writes)

    const result = await executeMediaCopy({ dryRun: true, entries: [entry], store })

    expect(result).toMatchObject({ exitCode: 0, planned: 1 })
    expect(writes).toEqual([])
  })

  it('skips an object whose content length and SHA-256 match', async () => {
    const entry = entryFixture()
    const writes: string[] = []

    const result = await executeMediaCopy({
      entries: [entry],
      store: fakeStore({ sha256: entry.sha256, size: entry.size }, writes),
    })

    expect(result).toMatchObject({ exitCode: 0, skipped: 1 })
    expect(writes).toEqual([])
  })

  it('returns nonzero and never overwrites a mismatching object', async () => {
    const entry = entryFixture()
    const writes: string[] = []

    const result = await executeMediaCopy({
      entries: [entry],
      store: fakeStore({ sha256: 'different', size: entry.size }, writes),
    })

    expect(result).toMatchObject({ exitCode: 1, mismatched: 1 })
    expect(writes).toEqual([])
  })

  it('copies a missing object, verifies it, and never deletes the source', async () => {
    const source = await temporarySource()
    const sourcePath = path.join(source, 'logo.png')
    await writeFile(sourcePath, 'logo')
    const [entry] = await planMediaCopy(source)
    let remote: RemoteObject | null = null
    const store: Store = {
      inspectObject: async () => remote,
      putObject: async (candidate) => {
        remote = { sha256: candidate.sha256, size: candidate.size }
      },
    }

    const result = await executeMediaCopy({ entries: [entry], store })

    expect(result).toMatchObject({ copied: 1, exitCode: 0 })
    await expect(access(sourcePath)).resolves.toBeUndefined()
  })

  it('reports a missing object in verify-only mode without writing', async () => {
    const writes: string[] = []

    const result = await executeMediaCopy({
      entries: [entryFixture()],
      store: fakeStore(null, writes),
      verifyOnly: true,
    })

    expect(result).toMatchObject({ exitCode: 1, missing: 1 })
    expect(writes).toEqual([])
  })

  it('parses source and mutually exclusive run modes', () => {
    expect(parseMediaCopyArgs(['--', '--source', 'legacy/uploads', '--dry-run'])).toEqual({
      dryRun: true,
      source: 'legacy/uploads',
      verifyOnly: false,
    })
    expect(parseMediaCopyArgs(['--verify-only'])).toEqual({
      dryRun: false,
      source: 'apps/web/uploads',
      verifyOnly: true,
    })
    expect(() => parseMediaCopyArgs(['--dry-run', '--verify-only'])).toThrow(/cannot be combined/i)
    expect(() => parseMediaCopyArgs(['--unknown'])).toThrow(/unknown argument/i)
  })

  it('uses HEAD metadata for a matching S3 object', async () => {
    const sent: string[] = []
    const store = createS3MediaObjectStore(
      {
        send: async (command) => {
          sent.push(command.constructor.name)
          return { ContentLength: 42, Metadata: { sha256: 'abc123' } }
        },
      },
      'jakartabc',
    )

    await expect(store.inspectObject('media/logo.png')).resolves.toEqual({
      sha256: 'abc123',
      size: 42,
    })
    expect(sent).toEqual(['HeadObjectCommand'])
  })

  it('downloads and hashes an existing object when legacy metadata is absent', async () => {
    const body = Buffer.from('legacy')
    const sent: string[] = []
    const store = createS3MediaObjectStore(
      {
        send: async (command) => {
          sent.push(command.constructor.name)
          if (command.constructor.name === 'HeadObjectCommand')
            return { ContentLength: body.length }
          return { Body: Readable.from([body]) }
        },
      },
      'jakartabc',
    )

    await expect(store.inspectObject('media/legacy.png')).resolves.toEqual({
      sha256: createHash('sha256').update(body).digest('hex'),
      size: body.length,
    })
    expect(sent).toEqual(['HeadObjectCommand', 'GetObjectCommand'])
  })

  it('uploads with explicit content length and SHA-256 metadata', async () => {
    const source = await temporarySource()
    await writeFile(path.join(source, 'logo.png'), 'logo')
    const [entry] = await planMediaCopy(source)
    let uploadInput: Record<string, unknown> | undefined
    const store = createS3MediaObjectStore(
      {
        send: async (command) => {
          uploadInput = command.input
          return {}
        },
      },
      'jakartabc',
    )

    await store.putObject(entry)

    expect(uploadInput).toMatchObject({
      Bucket: 'jakartabc',
      ContentLength: 4,
      Key: 'media/logo.png',
      Metadata: { sha256: entry.sha256 },
    })
    expect(uploadInput?.Body).toBeInstanceOf(Readable)
  })

  it('runs dry without writes and logs only keys plus aggregate counts', async () => {
    const source = await temporarySource()
    await writeFile(path.join(source, 'logo.png'), 'logo')
    const lines: string[] = []
    const writes: string[] = []

    const exitCode = await runMediaCopyCommand({
      args: ['--source', source, '--dry-run'],
      log: (line) => lines.push(line),
      store: fakeStore(null, writes),
    })

    expect(exitCode).toBe(0)
    expect(writes).toEqual([])
    expect(lines).toEqual(['media/logo.png', 'copied=0 skipped=0 planned=1 missing=0 mismatched=0'])
  })
})

function entryFixture(): Entry {
  return {
    key: 'media/logo.png',
    relativePath: 'logo.png',
    sha256: 'abc123',
    size: 42,
    sourcePath: '/tmp/logo.png',
  }
}

function fakeStore(remote: RemoteObject | null, writes: string[]): Store {
  return {
    inspectObject: async () => remote,
    putObject: async ({ key }) => {
      writes.push(key)
    },
  }
}
