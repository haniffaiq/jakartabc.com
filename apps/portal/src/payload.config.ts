import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  serverURL: process.env.NEXT_PUBLIC_PORTAL_URL,
  admin: { disable: true },
  collections: [
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
  editor: lexicalEditor({}),
  secret: process.env.PORTAL_PAYLOAD_SECRET!,
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: postgresAdapter({ pool: { connectionString: process.env.DATABASE_URL } }),
})
