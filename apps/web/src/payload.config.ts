import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import { buildConfig } from 'payload'
import {
  Authors,
  BookingLeads,
  Categories,
  ContactMessages,
  Footer,
  Insights,
  NavMenu,
  Regulations,
  Services,
  SiteSettings,
  Users,
  adminOnly,
} from '@jakartabc/content'
import { getMediaStoragePath, Media } from '@jakartabc/content/collections/Media'
import { revalidateCacheTask } from '@jakartabc/content/cache/revalidateTask'
import { REVALIDATE_CACHE_QUEUE } from '@jakartabc/content/hooks/revalidate'
import { env } from './env'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export function generateMediaFileURL({
  filename,
  prefix,
}: {
  filename: string
  prefix?: null | string
}) {
  const storagePath = getMediaStoragePath(prefix, filename)
  const key = [storagePath.prefix, storagePath.filename]
    .filter((segment): segment is string => Boolean(segment))
    .flatMap((segment) => segment.split('/'))
    .filter(Boolean)
    .map(encodeURIComponent)
    .join('/')

  return `${env.MINIO_PUBLIC_URL.replace(/\/$/, '')}/${key}`
}

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
  jobs: {
    access: {
      cancel: adminOnly,
      queue: adminOnly,
      run: adminOnly,
    },
    autoRun: [
      {
        cron: '*/10 * * * * *',
        disableScheduling: true,
        limit: 10,
        queue: REVALIDATE_CACHE_QUEUE,
      },
    ],
    deleteJobOnComplete: true,
    tasks: [revalidateCacheTask],
  },
  plugins: [
    s3Storage({
      alwaysInsertFields: true,
      bucket: env.MINIO_BUCKET,
      collections: {
        media: {
          disableLocalStorage: true,
          generateFileURL: generateMediaFileURL,
          prefix: 'media',
        },
      },
      config: {
        credentials: {
          accessKeyId: env.MINIO_ACCESS_KEY,
          secretAccessKey: env.MINIO_SECRET_KEY,
        },
        endpoint: env.MINIO_ENDPOINT,
        forcePathStyle: env.MINIO_FORCE_PATH_STYLE,
        region: env.MINIO_REGION,
      },
      disableLocalStorage: true,
    }),
  ],
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
    abortOnLimit: true,
    limits: { fileSize: 5_000_000 },
  },
})
