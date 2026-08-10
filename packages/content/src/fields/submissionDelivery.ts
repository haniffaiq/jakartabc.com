import type { Field } from 'payload'

export function createSubmissionDeliveryFields(): Field[] {
  return [
    {
      name: 'submissionId',
      type: 'text',
      unique: true,
      index: true,
      admin: { readOnly: true },
    },
    {
      name: 'deliveryStatus',
      type: 'select',
      required: true,
      index: true,
      defaultValue: 'pending',
      options: ['pending', 'sent', 'failed'],
      admin: { readOnly: true },
    },
    {
      name: 'deliveryAttempts',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
      admin: { readOnly: true },
    },
    {
      name: 'lastDeliveryAttemptAt',
      type: 'date',
      admin: { readOnly: true },
    },
    {
      name: 'deliveredAt',
      type: 'date',
      admin: { readOnly: true },
    },
    {
      name: 'deliveryError',
      type: 'textarea',
      maxLength: 500,
      admin: { readOnly: true },
    },
  ]
}
