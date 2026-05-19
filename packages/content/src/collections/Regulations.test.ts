import { describe, expect, it } from 'vitest'

import { Regulations } from './Regulations'

describe('Regulations collection', () => {
  it('has code (unique) + localized title + url + effectiveDate + notes', () => {
    expect(Regulations.slug).toBe('regulations')
    const fields = Regulations.fields as {
      name?: string
      localized?: boolean
      required?: boolean
      unique?: boolean
    }[]
    const code = fields.find((field) => field.name === 'code')
    const title = fields.find((field) => field.name === 'title')

    expect(code).toMatchObject({ required: true, unique: true })
    expect(title).toMatchObject({ localized: true })
    expect(fields.map((field) => field.name)).toEqual(
      expect.arrayContaining(['url', 'effectiveDate', 'notes']),
    )
  })
})
