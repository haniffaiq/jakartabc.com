import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'
import {
  Authors,
  BookingLeads,
  Categories,
  ContactMessages,
  Footer,
  Insights,
  Media,
  NavMenu,
  Regulations,
  Services,
  SiteSettings,
  Users,
} from '@jakartabc/content'
import { env } from './env'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  serverURL: env.NEXT_PUBLIC_SITE_URL,
  admin: {
    user: Users.slug,
    meta: {
      titleSuffix: ' · Jakarta BC Admin',
    },
  },
  editor: lexicalEditor({}),
  collections: [
    Media,
    Authors,
    Categories,
    Insights,
    Regulations,
    Services,
    ContactMessages,
    BookingLeads,
    Users,
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
    // Migrations live in apps/web/src/migrations/ and are applied by the
    // `web-migrate` init container (compose) on each `up`. Disable push
    // entirely — we never want runtime schema mutation.
    push: false,
  }),
  upload: {
    limits: { fileSize: 5_000_000 },
  },
})
