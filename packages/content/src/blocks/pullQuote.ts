import type { Block } from 'payload'

export const pullQuote: Block = {
  slug: 'pullQuote',
  fields: [
    {
      name: 'quote',
      type: 'textarea',
      required: true,
      localized: true,
    },
    {
      name: 'attribution',
      type: 'text',
      localized: true,
    },
  ],
}
