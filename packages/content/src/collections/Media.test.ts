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

  it('reads and validates temporary upload files in the pre-operation hook', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'jakartabc-media-upload-'))
    tempDirectories.push(directory)
    const tempFilePath = path.join(directory, 'upload.tmp')
    await writeFile(tempFilePath, png)
    const hook = Media.hooks?.beforeOperation?.[0]
    const args = {
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
})
