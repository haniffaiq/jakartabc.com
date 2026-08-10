import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import * as mediaModule from './Media'

const { Media, validateMediaFile } = mediaModule

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43])
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const webp = Buffer.from('RIFF\u0004\u0000\u0000\u0000WEBP', 'binary')
const tempDirectories: string[] = []

const request = (role?: 'admin' | 'editor' | 'client') => ({
  req: { user: role ? { role } : null },
})

function runBeforeOperation({
  data = {},
  file,
  operation = 'create',
}: {
  data?: Record<string, unknown>
  file?: Record<string, unknown>
  operation?: 'create' | 'update'
}) {
  const hook = Media.hooks?.beforeOperation?.[0]
  return hook?.({
    args: { data },
    collection: { config: Media },
    context: {},
    operation,
    req: { context: {}, file },
  } as never)
}

function runBeforeChange({
  data = {},
  file,
  operation = 'update',
  originalDoc = {},
}: {
  data?: Record<string, unknown>
  file?: Record<string, unknown>
  operation?: 'create' | 'update'
  originalDoc?: Record<string, unknown>
}) {
  const hook = Media.hooks?.beforeChange?.[0]
  return Promise.resolve().then(() =>
    hook?.({
      collection: Media,
      context: {},
      data,
      operation,
      originalDoc,
      req: { context: {}, file },
    } as never),
  )
}

afterEach(async () => {
  await Promise.all(
    tempDirectories.splice(0).map((directory) => rm(directory, { force: true, recursive: true })),
  )
})

describe('Media collection', () => {
  it('has slug media + upload config + alt required + localized', () => {
    expect(Media.slug).toBe('media')
    expect(Media.upload).toBeTruthy()
    const alt = Media.fields.find((field) => 'name' in field && field.name === 'alt')
    expect(alt).toMatchObject({ required: true, localized: true })
  })

  it('whitelists image mimeTypes only', () => {
    const upload = Media.upload

    expect(upload && typeof upload === 'object' && upload.mimeTypes).toEqual([
      'image/jpeg',
      'image/png',
      'image/webp',
    ])
  })

  it('keeps reads public and restricts writes to editorial roles', () => {
    const access = Media.access!

    expect(access.read?.(request() as never)).toBe(true)
    expect(access.read?.(request('client') as never)).toBe(true)
    expect(access.create?.(request('editor') as never)).toBe(true)
    expect(access.update?.(request('admin') as never)).toBe(true)
    expect(access.delete?.(request('client') as never)).toBe(false)
  })

  it('preserves upload guards and revalidates dependents after durable mutations', () => {
    expect(Media.hooks?.beforeOperation).toHaveLength(1)
    expect(Media.hooks?.beforeChange).toHaveLength(1)
    expect(Media.hooks?.afterChange).toHaveLength(1)
    expect(Media.hooks?.afterDelete).toHaveLength(1)
  })

  it('validates bytes before Payload probes image dimensions', () => {
    expect(typeof (mediaModule as Record<string, unknown>).validateMediaFile).toBe('function')
    expect(Media.hooks?.beforeOperation).toHaveLength(1)
  })

  it.each([
    ['image/jpeg', jpeg],
    ['image/png', png],
    ['image/webp', webp],
  ])('accepts %s only when its signature matches', (mimetype, data) => {
    expect(() =>
      validateMediaFile({ data, mimetype, name: 'image', size: data.length }),
    ).not.toThrow()
  })

  it('rejects a declared MIME type that disagrees with the signature', () => {
    expect(() =>
      validateMediaFile({ data: png, mimetype: 'image/jpeg', name: 'fake.jpg', size: png.length }),
    ).toThrow(/does not match/i)
  })

  it.each([
    ['image/avif', Buffer.from('000000186674797061766966', 'hex')],
    ['image/heif', Buffer.from('000000186674797068656963', 'hex')],
    ['image/jxl', Buffer.from([0xff, 0x0a])],
    ['image/x-icns', Buffer.from('icns')],
    ['image/svg+xml', Buffer.from('<svg>')],
  ])('rejects unsupported %s before image probing', (mimetype, data) => {
    expect(() => validateMediaFile({ data, mimetype, name: 'unsafe', size: data.length })).toThrow(
      /not allowed/i,
    )
  })

  it('rejects files larger than five decimal megabytes', () => {
    expect(() =>
      validateMediaFile({ data: jpeg, mimetype: 'image/jpeg', name: 'huge.jpg', size: 5_000_001 }),
    ).toThrow(/5,000,000 bytes/i)
  })

  it('rejects inconsistent declared and buffered lengths', () => {
    expect(() =>
      validateMediaFile({
        data: jpeg,
        mimetype: 'image/jpeg',
        name: 'short.jpg',
        size: jpeg.length + 1,
      }),
    ).toThrow(/size does not match/i)
  })

  it('rejects a truncated buffered upload even when its visible bytes are valid', () => {
    expect(() =>
      validateMediaFile({
        data: png,
        mimetype: 'image/png',
        name: 'truncated.png',
        size: png.length,
        truncated: true,
      } as never),
    ).toThrow(/truncated/i)
  })

  it('rejects an actually oversized buffered upload', () => {
    const oversized = Buffer.concat([png, Buffer.alloc(5_000_001 - png.length)])
    expect(() =>
      validateMediaFile({
        data: oversized,
        mimetype: 'image/png',
        name: 'oversized.png',
        size: oversized.length,
      }),
    ).toThrow(/5,000,000 bytes/i)
  })

  it('canonicalizes a missing prefix on update without a replacement file', async () => {
    await expect(
      runBeforeOperation({ data: { alt: 'updated' }, operation: 'update' }),
    ).resolves.toMatchObject({ data: { alt: 'updated', prefix: 'media' } })
  })

  it.each([
    ['filename', 'renamed.png'],
    ['mimeType', 'image/jpeg'],
    ['filesize', 999],
    ['prefix', 'other'],
    ['url', 'https://cdn.example.test/media/renamed.png'],
    ['thumbnailURL', 'https://cdn.example.test/media/renamed-thumb.png'],
    ['width', 999],
    ['height', 999],
    ['sizes', { thumb: { filename: 'renamed-thumb.png' } }],
  ])('rejects a no-file update that changes server-owned %s', async (field, value) => {
    const originalDoc = {
      filename: 'original.png',
      filesize: png.length,
      height: 200,
      mimeType: 'image/png',
      prefix: 'media',
      sizes: { thumb: { filename: 'original-400x400.png' } },
      thumbnailURL: 'https://cdn.example.test/media/original-400x400.png',
      url: 'https://cdn.example.test/media/original.png',
      width: 300,
    }

    await expect(runBeforeChange({ data: { [field]: value }, originalDoc })).rejects.toMatchObject({
      data: { errors: [{ path: field }] },
      status: 400,
    })
    expect(originalDoc.url).toBe('https://cdn.example.test/media/original.png')
  })

  it.each([
    [{ alt: 'Updated', focalX: 25, focalY: 75 }],
    [
      {
        filename: 'original.png',
        filesize: png.length,
        mimeType: 'image/png',
        prefix: 'media',
        url: 'https://cdn.example.test/media/original.png',
      },
    ],
  ])('allows no-file metadata/focal edits with omitted or unchanged identity', async (data) => {
    const originalDoc = {
      filename: 'original.png',
      filesize: png.length,
      mimeType: 'image/png',
      prefix: 'media',
      url: 'https://cdn.example.test/media/original.png',
    }

    await expect(runBeforeChange({ data, originalDoc })).resolves.toEqual(data)
    expect(originalDoc.url).toBe('https://cdn.example.test/media/original.png')
  })

  it('allows Payload to change upload identity when an actual replacement file exists', async () => {
    const data = {
      filename: 'replacement.png',
      filesize: png.length,
      height: 400,
      mimeType: 'image/png',
      prefix: 'media',
      url: 'https://cdn.example.test/media/replacement.png',
      width: 400,
    }

    await expect(
      runBeforeChange({
        data,
        file: { data: png, mimetype: 'image/png', name: 'replacement.png', size: png.length },
        originalDoc: {
          filename: 'original.png',
          url: 'https://cdn.example.test/media/original.png',
        },
      }),
    ).resolves.toEqual(data)
  })

  it.each(['../media', '..\\media', '%2e%2e%2fmedia', 'media\u0000'])(
    'rejects unsafe API prefix %j',
    async (prefix) => {
      await expect(
        runBeforeOperation({ data: { prefix }, operation: 'update' }),
      ).rejects.toMatchObject({
        data: { errors: [{ message: expect.stringMatching(/prefix/i), path: 'prefix' }] },
        status: 400,
      })
    },
  )

  it.each(['../logo.png', '..\\logo.png', '%2e%2e%2flogo.png', 'logo\u0000.png'])(
    'rejects unsafe upload filename %j',
    async (name) => {
      await expect(
        runBeforeOperation({
          data: { prefix: 'media' },
          file: { data: png, mimetype: 'image/png', name, size: png.length },
        }),
      ).rejects.toMatchObject({
        data: { errors: [{ message: expect.stringMatching(/filename/i), path: 'file' }] },
        status: 400,
      })
    },
  )

  it('reads and validates temporary upload files in the pre-operation hook', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'jakartabc-media-upload-'))
    tempDirectories.push(directory)
    const tempFilePath = path.join(directory, 'upload.tmp')
    await writeFile(tempFilePath, png)
    const hook = Media.hooks?.beforeOperation?.[0]
    const args = {
      args: { data: { prefix: 'media' } },
      collection: { config: Media },
      context: {},
      operation: 'create',
      req: {
        context: {},
        file: {
          data: Buffer.alloc(0),
          mimetype: 'image/jpeg',
          name: 'fake.jpg',
          size: png.length,
          tempFilePath,
        },
      },
    }

    await expect(hook?.(args as never)).rejects.toMatchObject({
      data: {
        errors: [{ message: expect.stringMatching(/does not match/i), path: 'file' }],
      },
      status: 400,
    })
  })

  it('rejects a truncated temporary upload before reading it', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'jakartabc-media-upload-'))
    tempDirectories.push(directory)
    const tempFilePath = path.join(directory, 'upload.tmp')
    await writeFile(tempFilePath, png)

    await expect(
      runBeforeOperation({
        data: { prefix: 'media' },
        file: {
          data: Buffer.alloc(0),
          mimetype: 'image/png',
          name: 'truncated.png',
          size: png.length,
          tempFilePath,
          truncated: true,
        },
      }),
    ).rejects.toMatchObject({
      data: { errors: [{ message: expect.stringMatching(/truncated/i), path: 'file' }] },
      status: 400,
    })
  })

  it('rejects an oversized temporary upload before reading its bytes', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'jakartabc-media-upload-'))
    tempDirectories.push(directory)
    const tempFilePath = path.join(directory, 'upload.tmp')
    const oversized = Buffer.concat([png, Buffer.alloc(5_000_001 - png.length)])
    await writeFile(tempFilePath, oversized)

    await expect(
      runBeforeOperation({
        data: { prefix: 'media' },
        file: {
          data: Buffer.alloc(0),
          mimetype: 'image/png',
          name: 'oversized.png',
          size: oversized.length,
          tempFilePath,
        },
      }),
    ).rejects.toMatchObject({
      data: { errors: [{ message: expect.stringMatching(/5,000,000 bytes/i), path: 'file' }] },
      status: 400,
    })
  })
})
