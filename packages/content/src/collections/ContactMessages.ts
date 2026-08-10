import type { CollectionConfig } from 'payload'

import { adminOnly } from '../access/roles'
import { createSubmissionDeliveryFields } from '../fields/submissionDelivery'

export const ContactMessages: CollectionConfig = {
  slug: 'contact-messages',
  admin: {
    group: 'Sales',
    useAsTitle: 'name',
    defaultColumns: ['createdAt', 'name', 'company', 'status'],
  },
  access: {
    create: () => false,
    read: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  fields: [
    ...createSubmissionDeliveryFields(),
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', required: true, index: true },
    { name: 'company', type: 'text' },
    { name: 'message', type: 'textarea', required: true },
    {
      name: 'locale',
      type: 'select',
      required: true,
      options: ['en', 'id'],
      defaultValue: 'en',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'new',
      options: ['new', 'contacted', 'converted', 'dropped'],
    },
    { name: 'notes', type: 'textarea' },
  ],
  timestamps: true,
}
