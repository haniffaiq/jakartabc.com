import { describe, expect, it } from 'vitest'

import { SiteSettings } from './SiteSettings'

describe('SiteSettings global', () => {
  it('keeps settings publicly readable and revalidates the site after change', () => {
    expect(SiteSettings.slug).toBe('site-settings')
    expect(SiteSettings.access?.read?.({ req: { user: null } } as never)).toBe(true)
    expect(SiteSettings.hooks?.afterChange).toHaveLength(1)
  })
})
