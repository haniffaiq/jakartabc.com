import { describe, expect, it } from 'vitest'

import { Media } from './Media'

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
})
