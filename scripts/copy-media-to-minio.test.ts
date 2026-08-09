import { createHash } from 'node:crypto'
import { access, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
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
  options?: { readSnapshot: (filename: string) => Promise<Buffer> },
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
    const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
    expect(parseMediaCopyArgs(['--verify-only'])).toEqual({
      dryRun: false,
      source: path.join(repositoryRoot, 'apps/web/uploads'),
      verifyOnly: true,
    })
    expect(() => parseMediaCopyArgs(['--dry-run', '--verify-only'])).toThrow(/cannot be combined/i)
    expect(() => parseMediaCopyArgs(['--unknown'])).toThrow(/unknown argument/i)
  })

  it('hashes remote bytes instead of trusting forged SHA-256 metadata', async () => {
    const sent: string[] = []
    const body = Buffer.from('authoritative remote bytes')
    const store = createS3MediaObjectStore(
      {
        send: async (command) => {
          sent.push(command.constructor.name)
          return {
            Body: Readable.from([body]),
            ContentLength: body.length,
            Metadata: { sha256: 'abc123' },
          }
        },
      },
      'jakartabc',
    )

    await expect(store.inspectObject('media/logo.png')).resolves.toEqual({
      sha256: createHash('sha256').update(body).digest('hex'),
      size: body.length,
    })
    expect(sent).toEqual(['GetObjectCommand'])
  })

  it('downloads and hashes an existing object when legacy metadata is absent', async () => {
    const body = Buffer.from('legacy')
    const sent: string[] = []
    const store = createS3MediaObjectStore(
      {
        send: async (command) => {
          sent.push(command.constructor.name)
          return { Body: Readable.from([body]), ContentLength: body.length }
        },
      },
      'jakartabc',
    )

    await expect(store.inspectObject('media/legacy.png')).resolves.toEqual({
      sha256: createHash('sha256').update(body).digest('hex'),
      size: body.length,
    })
    expect(sent).toEqual(['GetObjectCommand'])
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
      IfNoneMatch: '*',
      Key: 'media/logo.png',
      Metadata: { sha256: entry.sha256 },
    })
    expect(uploadInput?.Body).toEqual(Buffer.from('logo'))
  })

  it('rejects a same-length source mutation before PUT despite forgeable metadata', async () => {
    const source = await temporarySource()
    const sourcePath = path.join(source, 'logo.png')
    await writeFile(sourcePath, 'AAAA')
    const [entry] = await planMediaCopy(source)
    await writeFile(sourcePath, 'BBBB')
    let remote: Buffer | null = null
    let forgedMetadata: Record<string, string> | undefined
    let writes = 0
    const store = createS3MediaObjectStore(
      {
        send: async (command) => {
          if (command.constructor.name === 'GetObjectCommand') {
            if (!remote) {
              throw Object.assign(new Error('missing'), { $metadata: { httpStatusCode: 404 } })
            }
            return {
              Body: Readable.from([remote]),
              ContentLength: remote.length,
              Metadata: forgedMetadata,
            }
          }
          if (command.constructor.name === 'PutObjectCommand') {
            writes += 1
            const chunks: Buffer[] = []
            for await (const chunk of command.input.Body as AsyncIterable<Buffer>)
              chunks.push(chunk)
            remote = Buffer.concat(chunks)
            forgedMetadata = command.input.Metadata as Record<string, string>
            return {}
          }
          return { Body: Readable.from(remote ? [remote] : []) }
        },
      },
      'jakartabc',
    )

    const result = await executeMediaCopy({ entries: [entry], store })

    expect(result).toMatchObject({ copied: 0, exitCode: 1, mismatched: 1 })
    expect(writes).toBe(0)
  })

  it.each([
    ['matching', Buffer.from('logo'), { exitCode: 0, mismatched: 0, skipped: 1 }],
    ['different', Buffer.from('evil'), { exitCode: 1, mismatched: 1, skipped: 0 }],
  ])(
    'classifies a %s object that wins the conditional PUT race',
    async (_case, racedBody, expected) => {
      const source = await temporarySource()
      await writeFile(path.join(source, 'logo.png'), 'logo')
      const [entry] = await planMediaCopy(source)
      let gets = 0
      let puts = 0
      const store = createS3MediaObjectStore(
        {
          send: async (command) => {
            if (command.constructor.name === 'GetObjectCommand') {
              gets += 1
              if (gets === 1) {
                throw Object.assign(new Error('missing'), { $metadata: { httpStatusCode: 404 } })
              }
              return { Body: Readable.from([racedBody]), ContentLength: racedBody.length }
            }
            puts += 1
            expect(command.input.IfNoneMatch).toBe('*')
            throw Object.assign(new Error('race'), {
              $metadata: { httpStatusCode: 412 },
              name: 'PreconditionFailed',
            })
          },
        },
        'jakartabc',
      )

      const result = await executeMediaCopy({ entries: [entry], store })

      expect(result).toMatchObject({ copied: 0, ...expected })
      expect(puts).toBe(1)
      expect(gets).toBe(2)
    },
  )

  it('plans many files with at most one snapshot read in flight', async () => {
    const source = await temporarySource()
    for (let index = 0; index < 20; index += 1) {
      await writeFile(path.join(source, `${String(index).padStart(2, '0')}.png`), `file-${index}`)
    }
    let active = 0
    let maximumActive = 0

    const entries = await planMediaCopy(source, 'media', {
      readSnapshot: async (filename) => {
        active += 1
        maximumActive = Math.max(maximumActive, active)
        await delay(2)
        const snapshot = await readFile(filename)
        active -= 1
        return snapshot
      },
    })

    expect(entries).toHaveLength(20)
    expect(maximumActive).toBe(1)
  })

  it('rejects a local source file over five megabytes during planning', async () => {
    const source = await temporarySource()
    await writeFile(path.join(source, 'oversized.png'), Buffer.alloc(5_000_001))

    await expect(planMediaCopy(source)).rejects.toThrow(/5,000,000 bytes/i)
  })

  it('rejects a symlink used as the source root', async () => {
    const parent = await temporarySource()
    const realSource = path.join(parent, 'real')
    const linkedSource = path.join(parent, 'linked')
    await mkdir(realSource)
    await symlink(realSource, linkedSource, 'dir')

    await expect(planMediaCopy(linkedSource)).rejects.toThrow(/symbolic link/i)
  })

  it('rejects an oversized remote object while streaming its bytes', async () => {
    const store = createS3MediaObjectStore(
      {
        send: async () => ({
          Body: Readable.from([Buffer.alloc(5_000_000), Buffer.from([1])]),
          ContentLength: 5_000_001,
        }),
      },
      'jakartabc',
    )

    await expect(store.inspectObject('media/oversized.png')).rejects.toThrow(/5,000,000 bytes/i)
  })

  it('prefers bounded async iteration over transformToByteArray', async () => {
    let transformed = false
    const body = Object.assign(Readable.from([Buffer.from('bytes')]), {
      transformToByteArray: async () => {
        transformed = true
        throw new Error('unbounded transform must not run')
      },
    })
    const store = createS3MediaObjectStore(
      { send: async () => ({ Body: body, ContentLength: 5 }) },
      'jakartabc',
    )

    await expect(store.inspectObject('media/logo.png')).resolves.toEqual({
      sha256: createHash('sha256').update('bytes').digest('hex'),
      size: 5,
    })
    expect(transformed).toBe(false)
  })

  it('streams the web-stream fallback without buffering the whole object', async () => {
    const body = {
      transformToWebStream: () =>
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(Buffer.from('web'))
            controller.enqueue(Buffer.from('-stream'))
            controller.close()
          },
        }),
    }
    const store = createS3MediaObjectStore(
      { send: async () => ({ Body: body, ContentLength: 10 }) },
      'jakartabc',
    )

    await expect(store.inspectObject('media/logo.png')).resolves.toEqual({
      sha256: createHash('sha256').update('web-stream').digest('hex'),
      size: 10,
    })
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
