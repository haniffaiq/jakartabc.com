import { describe, expect, it } from 'vitest'

import { ContactMessages } from './ContactMessages'

describe('ContactMessages collection', () => {
  it('has expected fields and sales admin defaults', () => {
    expect(ContactMessages.slug).toBe('contact-messages')
    expect(ContactMessages.admin).toMatchObject({
      group: 'Sales',
      useAsTitle: 'name',
      defaultColumns: ['createdAt', 'name', 'company', 'status'],
    })

    const names = (ContactMessages.fields as { name?: string }[]).map((field) => field.name)

    expect(names).toEqual(
      expect.arrayContaining(['name', 'email', 'company', 'message', 'locale', 'status', 'notes']),
    )
  })

  it('denies direct create and restricts staff actions to admins', () => {
    const access = ContactMessages.access!

    expect(access.create?.({ req: {} } as never)).toBe(false)
    expect(access.read?.({ req: {} } as never)).toBe(false)
    expect(access.update?.({ req: {} } as never)).toBe(false)
    expect(access.delete?.({ req: {} } as never)).toBe(false)

    expect(access.read?.({ req: { user: { role: 'admin' } } } as never)).toBe(true)
    expect(access.update?.({ req: { user: { role: 'admin' } } } as never)).toBe(true)
    expect(access.delete?.({ req: { user: { role: 'admin' } } } as never)).toBe(true)

    for (const role of ['editor', 'client']) {
      expect(access.read?.({ req: { user: { role } } } as never)).toBe(false)
      expect(access.update?.({ req: { user: { role } } } as never)).toBe(false)
      expect(access.delete?.({ req: { user: { role } } } as never)).toBe(false)
    }
  })

  it('indexes email and tracks lead status defaults', () => {
    const fields = ContactMessages.fields as {
      name?: string
      index?: boolean
      defaultValue?: string
      options?: string[]
    }[]
    const email = fields.find((field) => field.name === 'email')
    const status = fields.find((field) => field.name === 'status')

    expect(email).toMatchObject({ index: true })
    expect(status).toMatchObject({
      defaultValue: 'new',
      options: ['new', 'contacted', 'converted', 'dropped'],
    })
  })
})
