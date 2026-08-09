import { describe, expect, it } from 'vitest'

import { Media } from './Media'

const request = (role?: 'admin' | 'editor' | 'client') => ({
  req: { user: role ? { role } : null },
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

    expect(upload && typeof upload === 'object' && upload.mimeTypes).toEqual(
      expect.arrayContaining(['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
    )
  })

  it('keeps reads public and restricts writes to editorial roles', () => {
    const access = Media.access!

    expect(access.read?.(request() as never)).toBe(true)
    expect(access.read?.(request('client') as never)).toBe(true)
    expect(access.create?.(request('editor') as never)).toBe(true)
    expect(access.update?.(request('admin') as never)).toBe(true)
    expect(access.delete?.(request('client') as never)).toBe(false)
  })
})
