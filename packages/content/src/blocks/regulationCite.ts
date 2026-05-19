import type { Block } from 'payload'

export const regulationCite: Block = {
  slug: 'regulationCite',
  fields: [
    {
      name: 'regulation',
      type: 'relationship',
      relationTo: 'regulations',
      required: true,
    },
    {
      name: 'inline',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Render inline rather than block',
      },
    },
  ],
}
