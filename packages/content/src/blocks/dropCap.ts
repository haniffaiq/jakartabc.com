import type { Block } from 'payload'

export const dropCap: Block = {
  slug: 'dropCap',
  fields: [
    {
      name: 'enabled',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Mark the next paragraph with a drop cap',
      },
    },
  ],
}
