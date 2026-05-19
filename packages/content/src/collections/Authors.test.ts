import { describe, expect, it } from 'vitest'

import { Authors } from './Authors'

describe('Authors collection', () => {
  it('has expected slug + fields', () => {
    expect(Authors.slug).toBe('authors')
    const fieldNames = Authors.fields.map((field) => ('name' in field ? field.name : ''))

    expect(fieldNames).toEqual(
      expect.arrayContaining(['name', 'role', 'bio', 'photo', 'linkedinUrl', 'email']),
    )
  })

  it('bio + role are localized', () => {
    const bio = Authors.fields.find((field) => 'name' in field && field.name === 'bio')
    const role = Authors.fields.find((field) => 'name' in field && field.name === 'role')

    expect(bio && 'localized' in bio && bio.localized).toBe(true)
    expect(role && 'localized' in role && role.localized).toBe(true)
  })
})
