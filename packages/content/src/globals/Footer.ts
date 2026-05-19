import { lexicalEditor } from '@payloadcms/richtext-lexical'
import type { GlobalConfig } from 'payload'
import { makeGlobalRevalidateHook } from '../hooks/revalidate'

export const isSafeFooterHref = (value: unknown) => {
  if (typeof value !== 'string') {
    return 'Footer link href is required.'
  }

  const href = value.trim()
  if (!href || /[\\\u0000-\u001f\u007f]/u.test(href)) {
    return 'Use a relative, http(s), or mailto link.'
  }

  try {
    if (href.startsWith('/')) {
      const base = 'https://jakartabc.local'
      const url = new URL(href, base)
      return url.origin === base || 'Use a relative, http(s), or mailto link.'
    }

    const url = new URL(href)
    return ['https:', 'http:', 'mailto:'].includes(url.protocol) || 'Use a relative, http(s), or mailto link.'
  } catch {
    return 'Use a relative, http(s), or mailto link.'
  }
}

export const Footer: GlobalConfig = {
  slug: 'footer',
  admin: { group: 'Site' },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'address',
      type: 'array',
      localized: true,
      fields: [{ name: 'line', type: 'text', required: true }],
    },
    { name: 'email', type: 'email', required: true },
    {
      name: 'licenses',
      type: 'array',
      localized: true,
      fields: [{ name: 'label', type: 'text', required: true }],
    },
    {
      name: 'legalLinks',
      type: 'array',
      localized: true,
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'href', type: 'text', required: true, validate: isSafeFooterHref },
      ],
    },
    { name: 'notice', type: 'richText', localized: true, editor: lexicalEditor({}) },
  ],
  hooks: {
    afterChange: [makeGlobalRevalidateHook(() => ['site:footer'])],
  },
}
