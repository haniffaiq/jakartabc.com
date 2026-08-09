import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import {
  bootstrapAdmin,
  parseBootstrapAdminCredentials,
  runBootstrapAdmin,
} from './bootstrap-admin'

const validCredentials = {
  email: 'admin@example.test',
  password: 'Strong-Password-123!',
}

function payloadClient() {
  return {
    find: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  }
}

describe('bootstrapAdmin', () => {
  it('creates exactly one initial admin through explicit access override', async () => {
    const payload = payloadClient()
    payload.find.mockResolvedValueOnce({ docs: [] }).mockResolvedValueOnce({ docs: [] })
    payload.create.mockResolvedValue({ id: 1 })

    await bootstrapAdmin(payload as never, validCredentials)

    expect(payload.find).toHaveBeenNthCalledWith(1, {
      collection: 'users',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where: { role: { equals: 'admin' } },
    })
    expect(payload.find).toHaveBeenNthCalledWith(2, {
      collection: 'users',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where: { email: { equals: 'admin@example.test' } },
    })
    expect(payload.create).toHaveBeenCalledOnce()
    expect(payload.create).toHaveBeenCalledWith({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: 'admin@example.test',
        password: validCredentials.password,
        role: 'admin',
      },
    })
  })

  it('fails closed without mutation when any admin already exists', async () => {
    const payload = payloadClient()
    payload.find.mockResolvedValueOnce({ docs: [{ id: 7 }] })

    await expect(bootstrapAdmin(payload as never, validCredentials)).rejects.toThrow(
      'Admin bootstrap refused: an admin user already exists',
    )

    expect(payload.find).toHaveBeenCalledOnce()
    expect(payload.create).not.toHaveBeenCalled()
    expect(payload.update).not.toHaveBeenCalled()
  })

  it('never upgrades an existing target account', async () => {
    const payload = payloadClient()
    payload.find
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce({ docs: [{ id: 8, role: 'client' }] })

    await expect(bootstrapAdmin(payload as never, validCredentials)).rejects.toThrow(
      'Admin bootstrap refused: target email already exists',
    )

    expect(payload.create).not.toHaveBeenCalled()
    expect(payload.update).not.toHaveBeenCalled()
  })
})

describe('parseBootstrapAdminCredentials', () => {
  it.each([
    [{}, 'BOOTSTRAP_ADMIN_EMAIL'],
    [
      {
        BOOTSTRAP_ADMIN_EMAIL: 'not-an-email',
        BOOTSTRAP_ADMIN_PASSWORD: validCredentials.password,
      },
      'BOOTSTRAP_ADMIN_EMAIL',
    ],
    [{ BOOTSTRAP_ADMIN_EMAIL: validCredentials.email }, 'BOOTSTRAP_ADMIN_PASSWORD'],
    [
      { BOOTSTRAP_ADMIN_EMAIL: validCredentials.email, BOOTSTRAP_ADMIN_PASSWORD: 'Short1!' },
      'BOOTSTRAP_ADMIN_PASSWORD',
    ],
    [
      {
        BOOTSTRAP_ADMIN_EMAIL: validCredentials.email,
        BOOTSTRAP_ADMIN_PASSWORD: 'all-lowercase-123!',
      },
      'BOOTSTRAP_ADMIN_PASSWORD',
    ],
    [
      {
        BOOTSTRAP_ADMIN_EMAIL: validCredentials.email,
        BOOTSTRAP_ADMIN_PASSWORD: 'ALL-UPPERCASE-123!',
      },
      'BOOTSTRAP_ADMIN_PASSWORD',
    ],
    [
      {
        BOOTSTRAP_ADMIN_EMAIL: validCredentials.email,
        BOOTSTRAP_ADMIN_PASSWORD: 'No-Digits-In-Password!',
      },
      'BOOTSTRAP_ADMIN_PASSWORD',
    ],
    [
      {
        BOOTSTRAP_ADMIN_EMAIL: validCredentials.email,
        BOOTSTRAP_ADMIN_PASSWORD: 'NoSymbolsInPassword123',
      },
      'BOOTSTRAP_ADMIN_PASSWORD',
    ],
  ])('rejects invalid one-off credentials without echoing values', (input, field) => {
    expect(() => parseBootstrapAdminCredentials(input)).toThrow(field)

    try {
      parseBootstrapAdminCredentials(input)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const password =
        'BOOTSTRAP_ADMIN_PASSWORD' in input ? input.BOOTSTRAP_ADMIN_PASSWORD : undefined

      expect(message).not.toContain(String(password))
    }
  })

  it('normalizes the email without altering the password', () => {
    expect(
      parseBootstrapAdminCredentials({
        BOOTSTRAP_ADMIN_EMAIL: '  ADMIN@Example.Test ',
        BOOTSTRAP_ADMIN_PASSWORD: validCredentials.password,
      }),
    ).toEqual(validCredentials)
  })
})

describe('runBootstrapAdmin', () => {
  it('does not initialize Payload when credentials are missing', async () => {
    const getPayload = vi.fn()
    const writeError = vi.fn()

    await expect(
      runBootstrapAdmin({ env: {}, getPayload, writeInfo: vi.fn(), writeError }),
    ).resolves.toBe(1)

    expect(getPayload).not.toHaveBeenCalled()
    expect(writeError).toHaveBeenCalledWith(expect.stringContaining('BOOTSTRAP_ADMIN_EMAIL'))
  })

  it('redacts credentials from unexpected Payload failures', async () => {
    const payload = payloadClient()
    payload.find.mockResolvedValueOnce({ docs: [] }).mockResolvedValueOnce({ docs: [] })
    payload.create.mockRejectedValue(
      new Error(`database rejected ${validCredentials.email} ${validCredentials.password}`),
    )
    const writeError = vi.fn()

    await expect(
      runBootstrapAdmin({
        env: {
          BOOTSTRAP_ADMIN_EMAIL: validCredentials.email,
          BOOTSTRAP_ADMIN_PASSWORD: validCredentials.password,
        },
        getPayload: async () => payload as never,
        writeInfo: vi.fn(),
        writeError,
      }),
    ).resolves.toBe(1)

    const output = writeError.mock.calls.flat().join(' ')
    expect(output).toBe('Admin bootstrap failed')
    expect(output).not.toContain(validCredentials.email)
    expect(output).not.toContain(validCredentials.password)
  })

  it('prints only a stable success event', async () => {
    const payload = payloadClient()
    payload.find.mockResolvedValueOnce({ docs: [] }).mockResolvedValueOnce({ docs: [] })
    payload.create.mockResolvedValue({ id: 1 })
    const writeInfo = vi.fn()

    await expect(
      runBootstrapAdmin({
        env: {
          BOOTSTRAP_ADMIN_EMAIL: validCredentials.email,
          BOOTSTRAP_ADMIN_PASSWORD: validCredentials.password,
        },
        getPayload: async () => payload as never,
        writeInfo,
        writeError: vi.fn(),
      }),
    ).resolves.toBe(0)

    expect(writeInfo).toHaveBeenCalledWith('Initial admin created')
    expect(writeInfo.mock.calls.flat().join(' ')).not.toContain(validCredentials.email)
    expect(writeInfo.mock.calls.flat().join(' ')).not.toContain(validCredentials.password)
  })
})

describe('initial admin runbook', () => {
  it('keeps one-off credentials out of the parent shell and command arguments', async () => {
    const readme = await readFile(resolve(process.cwd(), '../../README.md'), 'utf8')
    const section = readme.split('### 7. Create the first admin')[1]?.split('## Deploy update')[0]

    expect(section).toBeTruthy()
    expect(section).not.toContain('export BOOTSTRAP_ADMIN_EMAIL')
    expect(section).not.toContain('export BOOTSTRAP_ADMIN_PASSWORD')
    expect(section).toContain('```bash\n(\n')
    expect(section).toContain('\n)\n```')
    expect(section).toContain('trap cleanup_bootstrap_admin EXIT')
    expect(section).toContain("trap 'exit 130' INT")
    expect(section).toContain('BOOTSTRAP_ADMIN_EMAIL="$bootstrap_admin_email"')
    expect(section).toContain('BOOTSTRAP_ADMIN_PASSWORD="$bootstrap_admin_password"')
    expect(section).toContain('-e BOOTSTRAP_ADMIN_EMAIL')
    expect(section).toContain('-e BOOTSTRAP_ADMIN_PASSWORD')
    expect(section).not.toMatch(/-e BOOTSTRAP_ADMIN_(?:EMAIL|PASSWORD)=/)
  })
})
