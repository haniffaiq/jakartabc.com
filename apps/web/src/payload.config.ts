import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'
import {
  Authors,
  Categories,
  Footer,
  Media,
  NavMenu,
  Regulations,
  Services,
  SiteSettings,
} from '@jakartabc/content'
import { env } from './env'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  serverURL: env.NEXT_PUBLIC_SITE_URL,
  admin: {
    user: 'users',
    meta: {
      titleSuffix: ' · Jakarta BC Admin',
    },
  },
  editor: lexicalEditor({}),
  collections: [
    Media,
    Authors,
    Regulations,
    Services,
    Categories,
    {
      slug: 'users',
      auth: {
        tokenExpiration: 60 * 60 * 24 * 14,
        maxLoginAttempts: 5,
        lockTime: 10 * 60 * 1000,
        useAPIKey: false,
      },
      admin: { useAsTitle: 'email' },
      fields: [
        { name: 'name', type: 'text' },
        {
          name: 'role',
          type: 'select',
          defaultValue: 'client',
          options: ['admin', 'editor', 'client'],
        },
      ],
    },
  ],
  globals: [SiteSettings, NavMenu, Footer],
  localization: {
    locales: ['en', 'id'],
    defaultLocale: 'en',
    fallback: true,
  },
  secret: env.PAYLOAD_SECRET,
  typescript: {
    outputFile: path.resolve(dirname, '../../../packages/content/src/generated/payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: env.DATABASE_URL,
    },
  }),
  upload: {
    limits: { fileSize: 5_000_000 },
  },
})
