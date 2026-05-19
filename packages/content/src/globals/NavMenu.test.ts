import { describe, expect, it } from 'vitest'
import { NavMenu } from './NavMenu'

describe('NavMenu global', () => {
  it('has slug nav-menu + localized items array', () => {
    expect(NavMenu.slug).toBe('nav-menu')
    const items = (NavMenu.fields as any[]).find((f) => f.name === 'items')
    expect(items.type).toBe('array')
    expect(items.localized).toBe(true)
  })

  it('defines label href external fields and site nav revalidate hook', () => {
    const items = (NavMenu.fields as any[]).find((f) => f.name === 'items')
    const fieldNames = items.fields.map((field: { name: string }) => field.name)

    expect(fieldNames).toEqual(['label', 'href', 'external'])
    expect(NavMenu.hooks?.afterChange).toHaveLength(1)
  })
})
