import { fileURLToPath } from 'node:url'

import type { Payload } from 'payload'
import { z } from 'zod'

const BootstrapAdminCredentials = z.object({
  BOOTSTRAP_ADMIN_EMAIL: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),
  BOOTSTRAP_ADMIN_PASSWORD: z
    .string()
    .min(16)
    .regex(/[a-z]/)
    .regex(/[A-Z]/)
    .regex(/[0-9]/)
    .regex(/[^A-Za-z0-9]/),
})

type BootstrapEnvironment = Record<string, string | undefined>

type BootstrapPayload = Pick<Payload, 'create' | 'find'>

export type BootstrapCredentials = {
  email: string
  password: string
}

export class BootstrapAdminError extends Error {
  override name = 'BootstrapAdminError'
}

export function parseBootstrapAdminCredentials(input: BootstrapEnvironment): BootstrapCredentials {
  const result = BootstrapAdminCredentials.safeParse(input)

  if (!result.success) {
    const invalidFields = [
      ...new Set(result.error.issues.map((issue) => issue.path[0]).filter(Boolean)),
    ]

    throw new BootstrapAdminError(
      `Invalid bootstrap admin credentials: ${invalidFields.join(', ')}`,
    )
  }

  return {
    email: result.data.BOOTSTRAP_ADMIN_EMAIL,
    password: result.data.BOOTSTRAP_ADMIN_PASSWORD,
  }
}

export async function bootstrapAdmin(
  payload: BootstrapPayload,
  credentials: BootstrapCredentials,
): Promise<void> {
  const existingAdmin = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { role: { equals: 'admin' } },
  })

  if (existingAdmin.docs.length > 0) {
    throw new BootstrapAdminError('Admin bootstrap refused: an admin user already exists')
  }

  const existingTarget = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { email: { equals: credentials.email } },
  })

  if (existingTarget.docs.length > 0) {
    throw new BootstrapAdminError('Admin bootstrap refused: target email already exists')
  }

  await payload.create({
    collection: 'users',
    overrideAccess: true,
    data: {
      email: credentials.email,
      password: credentials.password,
      role: 'admin',
    },
  })
}

type BootstrapRunnerOptions = {
  env: BootstrapEnvironment
  getPayload: () => Promise<BootstrapPayload>
  writeInfo: (message: string) => void
  writeError: (message: string) => void
}

export async function runBootstrapAdmin(options: BootstrapRunnerOptions): Promise<0 | 1> {
  try {
    const credentials = parseBootstrapAdminCredentials(options.env)
    const payload = await options.getPayload()

    await bootstrapAdmin(payload, credentials)
    options.writeInfo('Initial admin created')

    return 0
  } catch (error) {
    options.writeError(
      error instanceof BootstrapAdminError ? error.message : 'Admin bootstrap failed',
    )

    return 1
  }
}

async function main() {
  return runBootstrapAdmin({
    env: process.env,
    getPayload: async () => {
      const [{ getPayload }, { default: config }] = await Promise.all([
        import('payload'),
        import('../payload.config'),
      ])

      return getPayload({ config })
    },
    writeInfo: (message) => console.info(message),
    writeError: (message) => console.error(message),
  })
}

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url)

if (isDirectRun) {
  void main().then((exitCode) => process.exit(exitCode))
}
