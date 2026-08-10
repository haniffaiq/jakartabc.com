import { describe, expect, it } from 'vitest'

import { createSubmissionDeliveryFields } from './submissionDelivery'

type TestField = {
  name?: string
  type?: string
  required?: boolean
  unique?: boolean
  index?: boolean
  defaultValue?: unknown
  min?: number
  maxLength?: number
  options?: unknown[]
  admin?: { readOnly?: boolean }
}

function fieldsByName() {
  return Object.fromEntries(
    (createSubmissionDeliveryFields() as TestField[]).map((field) => [field.name, field]),
  )
}

describe('submission delivery fields', () => {
  it('defines nullable unique submission identity and indexed delivery state', () => {
    const fields = fieldsByName()

    expect(fields.submissionId).toMatchObject({
      type: 'text',
      unique: true,
      index: true,
      admin: { readOnly: true },
    })
    expect(fields.submissionId?.required).not.toBe(true)

    expect(fields.deliveryStatus).toMatchObject({
      type: 'select',
      required: true,
      index: true,
      defaultValue: 'pending',
      options: ['pending', 'sent', 'failed'],
      admin: { readOnly: true },
    })
  })

  it('defines attempt defaults, nullable timestamps, and bounded operational error', () => {
    const fields = fieldsByName()

    expect(fields.deliveryAttempts).toMatchObject({
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
      admin: { readOnly: true },
    })
    expect(fields.lastDeliveryAttemptAt).toMatchObject({
      type: 'date',
      admin: { readOnly: true },
    })
    expect(fields.deliveredAt).toMatchObject({ type: 'date', admin: { readOnly: true } })
    expect(fields.deliveryError).toMatchObject({
      type: 'textarea',
      maxLength: 500,
      admin: { readOnly: true },
    })
    expect(fields.lastDeliveryAttemptAt?.required).not.toBe(true)
    expect(fields.deliveredAt?.required).not.toBe(true)
    expect(fields.deliveryError?.required).not.toBe(true)
  })

  it('returns fresh field and option objects on every call', () => {
    const first = createSubmissionDeliveryFields() as TestField[]
    const second = createSubmissionDeliveryFields() as TestField[]
    const firstStatus = first.find((field) => field.name === 'deliveryStatus')
    const secondStatus = second.find((field) => field.name === 'deliveryStatus')

    expect(first).not.toBe(second)
    expect(firstStatus).not.toBe(secondStatus)
    expect(firstStatus?.options).not.toBe(secondStatus?.options)
    expect(firstStatus?.admin).not.toBe(secondStatus?.admin)

    firstStatus?.options?.push('corrupted')
    if (firstStatus?.admin) firstStatus.admin.readOnly = false

    expect(secondStatus?.options).toEqual(['pending', 'sent', 'failed'])
    expect(secondStatus?.admin).toEqual({ readOnly: true })
  })
})
