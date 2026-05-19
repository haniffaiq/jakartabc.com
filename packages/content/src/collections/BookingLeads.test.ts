import { describe, expect, it } from 'vitest'

import { BookingLeads } from './BookingLeads'

describe('BookingLeads collection', () => {
  it('has expected fields', () => {
    expect(BookingLeads.slug).toBe('booking-leads')

    const names = (BookingLeads.fields as { name?: string }[]).map((field) => field.name)

    expect(names).toEqual(
      expect.arrayContaining([
        'name',
        'email',
        'company',
        'phone',
        'service',
        'preferredWindows',
        'message',
        'locale',
        'status',
        'notes',
      ]),
    )
  })

  it('surfaces sales-friendly columns and searchable lead identifiers in admin', () => {
    expect(BookingLeads.admin).toMatchObject({
      group: 'Sales',
      useAsTitle: 'name',
      defaultColumns: ['createdAt', 'name', 'company', 'service', 'preferredWindows', 'status'],
      listSearchableFields: ['name', 'email', 'company'],
    })
  })

  it('allows public create and restricts read/update/delete to authenticated admin users', () => {
    const access = BookingLeads.access!
    const anonymousRequest = { req: { user: undefined } } as any
    const adminRequest = { req: { user: { collection: 'users' } } } as any

    expect(access.create!(anonymousRequest)).toBe(true)
    expect(access.read!(anonymousRequest)).toBe(false)
    expect(access.update!(anonymousRequest)).toBe(false)
    expect(access.delete!(anonymousRequest)).toBe(false)
    expect(access.read!(adminRequest)).toBe(true)
    expect(access.update!(adminRequest)).toBe(true)
    expect(access.delete!(adminRequest)).toBe(true)
  })
})
