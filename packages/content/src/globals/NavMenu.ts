import type { GlobalConfig } from 'payload'
import { makeGlobalRevalidateHook } from '../hooks/revalidate'

export const NavMenu: GlobalConfig = {
  slug: 'nav-menu',
  admin: { group: 'Site' },
  fields: [
    {
      name: 'items',
      type: 'array',
      localized: true,
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'href', type: 'text', required: true },
        { name: 'external', type: 'checkbox', defaultValue: false },
      ],
    },
  ],
  hooks: {
    afterChange: [makeGlobalRevalidateHook(() => ['site:nav'])],
  },
}
