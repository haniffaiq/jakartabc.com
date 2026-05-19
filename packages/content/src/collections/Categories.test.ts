import { describe, expect, it } from 'vitest'

import { Categories } from './Categories'

describe('Categories collection', () => {
  it('has slug + localized name', () => {
    expect(Categories.slug).toBe('categories')

    const name = Categories.fields.find((field) => 'name' in field && field.name === 'name')

    expect(name && 'localized' in name && name.localized).toBe(true)
  })
})
