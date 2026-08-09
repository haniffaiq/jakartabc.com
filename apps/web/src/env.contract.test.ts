import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

const repositoryFile = (path: string) => readFileSync(resolve(process.cwd(), '../..', path), 'utf8')

const requiredWebEnvironment = [
  'DATABASE_URL',
  'PAYLOAD_SECRET',
  'REDIS_URL',
  'REDIS_KEY_PREFIX',
  'MINIO_ENDPOINT',
  'MINIO_REGION',
  'MINIO_BUCKET',
  'MINIO_ACCESS_KEY',
  'MINIO_SECRET_KEY',
  'MINIO_PUBLIC_URL',
  'MINIO_FORCE_PATH_STYLE',
  'TRUSTED_PROXY_SECRET',
  'NEXT_PUBLIC_SITE_URL',
  'REVALIDATE_SECRET',
  'EMAIL_PROVIDER',
  'RESEND_API_KEY',
  'EMAIL_FROM',
  'SALES_EMAIL',
  'TURNSTILE_SECRET_KEY',
  'NEXT_PUBLIC_TURNSTILE_SITE_KEY',
] as const

const serverOnlyBuildPlaceholders = requiredWebEnvironment.filter(
  (name) => name !== 'NEXT_PUBLIC_SITE_URL' && name !== 'NEXT_PUBLIC_TURNSTILE_SITE_KEY',
)

function serviceBlock(compose: string, service: string, nextSection: string) {
  const start = compose.indexOf(`  ${service}:`)
  const end = compose.indexOf(nextSection, start)
  if (start < 0 || end < 0) throw new Error(`Missing ${service} service boundary`)
  return compose.slice(start, end)
}

function buildArgs(service: string) {
  const end = service.indexOf('    env_file:')
  if (end < 0) throw new Error('Missing env_file after build args')
  return service.slice(0, end)
}

function workflowEnvironment(workflow: string) {
  const block = /\n    env:\n([\s\S]*?)\n\n    steps:/.exec(workflow)?.[1]
  if (!block) throw new Error('Missing workflow environment block')

  return Object.fromEntries(
    block.split('\n').flatMap((line) => {
      const match = /^      ([A-Z0-9_]+):\s*(.+)$/.exec(line)
      if (!match) return []
      const [, name, rawValue] = match
      if (!name || !rawValue) return []
      return [[name, rawValue.replace(/^(['"])(.*)\1$/, '$2')]]
    }),
  )
}

async function expectValidProductionEnvironment(input: Record<string, string | undefined>) {
  const original = process.env
  process.env = { ...original, ...input, NODE_ENV: 'production' }
  vi.resetModules()

  try {
    const { parseServerEnv } = await import('./env')
    expect(parseServerEnv(process.env).NODE_ENV).toBe('production')
  } finally {
    process.env = original
  }
}

describe('CI and Docker environment contract', () => {
  it.each([['.github/workflows/ci.yml'], ['.github/workflows/lighthouse.yml']])(
    '%s supplies every required web build variable',
    async (path) => {
      const workflow = repositoryFile(path)

      for (const name of requiredWebEnvironment) {
        expect(workflow, `${path} does not supply ${name}`).toMatch(
          new RegExp(`^\\s+${name}:`, 'm'),
        )
      }

      await expectValidProductionEnvironment(workflowEnvironment(workflow))
    },
  )

  it('uses literal non-secret server placeholders in the web builder', async () => {
    const dockerfile = repositoryFile('apps/web/Dockerfile')

    for (const name of serverOnlyBuildPlaceholders) {
      expect(dockerfile, `web builder lacks ${name}`).toMatch(
        new RegExp(`\\b${name}=(?!\\$)[^\\s\\\\]+`),
      )
      expect(dockerfile, `web builder accepts ${name} as a build argument`).not.toMatch(
        new RegExp(`^ARG ${name}(?:=|$)`, 'm'),
      )
    }

    const buildEnvironment = Object.fromEntries(
      [...dockerfile.matchAll(/\b([A-Z][A-Z0-9_]+)=([^\s\\]+)/g)].map((match) => [
        match[1],
        match[2],
      ]),
    )
    await expectValidProductionEnvironment({
      ...buildEnvironment,
      DEFAULT_LOCALE: 'en',
      NEXT_PUBLIC_SITE_URL: 'https://build.example.test',
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: 'build-only-turnstile-site-key',
    })
  })

  it('keeps private runtime values out of Compose build arguments', () => {
    const compose = repositoryFile('docker-compose.yml')
    const services = [
      serviceBlock(compose, 'web-migrate', '\n  web:'),
      serviceBlock(compose, 'web', '\n  portal:'),
      serviceBlock(compose, 'portal', '\nvolumes:'),
    ]

    for (const service of services) {
      expect(service).toContain('env_file: .env')
      for (const name of serverOnlyBuildPlaceholders) {
        expect(buildArgs(service)).not.toContain(`${name}:`)
      }
    }
  })

  it('uses a non-secret placeholder instead of secret build args in the portal builder', () => {
    const dockerfile = repositoryFile('apps/portal/Dockerfile')

    expect(dockerfile).toMatch(/\bPAYLOAD_SECRET=(?!\$)[^\s\\]+/)
    expect(dockerfile).not.toMatch(/^ARG PAYLOAD_SECRET(?:=|$)/m)
    expect(dockerfile).not.toContain('PAYLOAD_SECRET=$PAYLOAD_SECRET')
  })

  it('allows required variable names through Turbo without embedding values', () => {
    const turbo = repositoryFile('turbo.json')

    for (const name of requiredWebEnvironment) {
      expect(turbo, `Turbo does not allow ${name}`).toContain(`"${name}"`)
    }
    expect(turbo).not.toMatch(/(?:postgres|redis):\/\/|build-only-/)
  })
})
