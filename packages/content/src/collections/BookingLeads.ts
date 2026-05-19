import type { CollectionConfig } from 'payload'

export const BookingLeads: CollectionConfig = {
  slug: 'booking-leads',
  admin: {
    group: 'Sales',
    useAsTitle: 'name',
    defaultColumns: ['createdAt', 'name', 'company', 'service', 'status'],
  },
  access: {
    create: () => true,
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', required: true, index: true },
    { name: 'company', type: 'text' },
    { name: 'phone', type: 'text' },
    { name: 'service', type: 'relationship', relationTo: 'services', required: true },
    {
      name: 'preferredWindows',
      type: 'select',
      hasMany: true,
      options: [
        'mon-am',
        'mon-pm',
        'tue-am',
        'tue-pm',
        'wed-am',
        'wed-pm',
        'thu-am',
        'thu-pm',
        'fri-am',
        'fri-pm',
      ],
    },
    { name: 'message', type: 'textarea', required: true },
    { name: 'locale', type: 'select', required: true, options: ['en', 'id'], defaultValue: 'en' },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'new',
      options: [
        { label: 'New', value: 'new' },
        { label: 'Contacted', value: 'contacted' },
        { label: 'Converted', value: 'converted' },
        { label: 'Dropped', value: 'dropped' },
      ],
    },
    { name: 'notes', type: 'textarea', admin: { description: 'Internal sales notes' } },
  ],
  timestamps: true,
}
