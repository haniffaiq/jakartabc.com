import { beforeEach, describe, expect, it, vi } from 'vitest'

type DeliveryStatus = 'pending' | 'sent' | 'failed'
type ContactRow = {
  id: string | number
  submissionId: string
  deliveryStatus: DeliveryStatus
  deliveryAttempts: number
  lastDeliveryAttemptAt?: string | null
  deliveredAt?: string | null
  deliveryError?: string | null
  [key: string]: unknown
}

const mocks = vi.hoisted(() => ({
  acquire: vi.fn(),
  complete: vi.fn(),
  create: vi.fn(),
  find: vi.fn(),
  headersGet: vi.fn(),
  renew: vi.fn(),
  release: vi.fn(),
  sendEmail: vi.fn(),
  update: vi.fn(),
  verifyTurnstile: vi.fn(),
  rateLimit: vi.fn(),
}))

vi.mock('@/lib/payload', () => ({
  getPayloadClient: vi.fn(async () => ({
    create: mocks.create,
    find: mocks.find,
    update: mocks.update,
  })),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => ({ get: mocks.headersGet })),
}))

vi.mock('@jakartabc/email', () => ({
  ContactSales: (props: Record<string, unknown>) => `ContactSales:${String(props.messageId)}`,
  ContactVisitor: (props: Record<string, unknown>) => `ContactVisitor:${String(props.locale)}`,
  sendEmail: mocks.sendEmail,
  subjects: {
    contactSales: (name: string) => `[Contact] ${name}`,
    contactVisitor: {
      en: 'Thanks for reaching out — Jakarta Business Center',
      id: 'Terima kasih sudah menghubungi — Jakarta Business Center',
    },
  },
}))

vi.mock('@/lib/anti-spam/turnstile', () => ({
  verifyTurnstile: mocks.verifyTurnstile,
}))

vi.mock('@/lib/anti-spam/idempotency', () => ({
  submissionCoordinator: {
    acquire: mocks.acquire,
    complete: mocks.complete,
    rateLimit: mocks.rateLimit,
    renew: mocks.renew,
    release: mocks.release,
  },
}))

vi.mock('@/lib/anti-spam/rate-limit', () => ({
  rateLimiter: { rateLimit: mocks.rateLimit },
}))

import { submitContact } from './contact'

function fd(map: Record<string, string>) {
  const form = new FormData()
  for (const [key, value] of Object.entries(map)) form.append(key, value)
  return form
}

const submissionId = '11111111-1111-4111-8111-111111111111'
const validContact = {
  submissionId,
  name: 'Sari Wijaya',
  email: 'SARI@EXAMPLE.COM',
  company: 'Jakarta Partners',
  message: 'Hello, I would like to discuss a PT PMA setup timeline.',
  locale: 'id',
  hp: '',
  turnstileToken: 'turnstile-token',
}
const persistedContactFields = {
  name: validContact.name,
  email: 'sari@example.com',
  company: validContact.company,
  message: validContact.message,
  locale: validContact.locale,
}

const trustedProxySecret = 'proxy-secret-value-that-is-at-least-32-characters'
const lease = Object.freeze({ submissionId, token: 'lease-token' })

describe('submitContact', () => {
  const rows = new Map<string, ContactRow>()
  let coordinatorState: 'free' | 'in-progress' | 'completed'
  let activeLeaseToken: string | undefined
  let leaseSequence: number

  function expireActiveLease() {
    activeLeaseToken = undefined
    coordinatorState = 'free'
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    rows.clear()
    coordinatorState = 'free'
    activeLeaseToken = undefined
    leaseSequence = 0
    for (const mock of Object.values(mocks)) mock.mockReset()

    mocks.verifyTurnstile.mockResolvedValue(true)
    mocks.rateLimit.mockResolvedValue({ allowed: true, remaining: 4 })
    mocks.headersGet.mockImplementation((name: string) => {
      if (name.toLowerCase() === 'x-jbc-proxy-secret') return trustedProxySecret
      if (name.toLowerCase() === 'x-forwarded-for') return '1.1.1.1, 2.2.2.2'
      return null
    })
    mocks.acquire.mockImplementation(async () => {
      if (coordinatorState === 'completed') return { state: 'completed' }
      if (coordinatorState === 'in-progress') return { state: 'in-progress' }
      leaseSequence += 1
      const acquiredLease = Object.freeze({
        submissionId,
        token: leaseSequence === 1 ? 'lease-token' : `lease-token-${leaseSequence}`,
      })
      activeLeaseToken = acquiredLease.token
      coordinatorState = 'in-progress'
      return { state: 'acquired', lease: acquiredLease }
    })
    mocks.renew.mockImplementation(async (candidate: typeof lease) => {
      return coordinatorState === 'in-progress' && activeLeaseToken === candidate.token
        ? { state: 'renewed' }
        : { state: 'lease-lost' }
    })
    mocks.complete.mockImplementation(async (candidate: typeof lease) => {
      if (coordinatorState !== 'in-progress' || activeLeaseToken !== candidate.token) {
        return { state: 'lease-lost' }
      }
      activeLeaseToken = undefined
      coordinatorState = 'completed'
      return { state: 'completed' }
    })
    mocks.release.mockImplementation(async (candidate: typeof lease) => {
      if (coordinatorState !== 'in-progress' || activeLeaseToken !== candidate.token) {
        return { state: 'lease-lost' }
      }
      activeLeaseToken = undefined
      coordinatorState = 'free'
      return { state: 'released' }
    })
    mocks.find.mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
      const id = (where.submissionId as { equals: string }).equals
      const row = rows.get(id)
      return { docs: row ? [row] : [] }
    })
    mocks.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
      const id = data.submissionId as string
      if (rows.has(id)) throw new Error('duplicate key value contains private database details')
      const row: ContactRow = {
        ...data,
        id: 7,
        submissionId: id,
        deliveryStatus: 'pending',
        deliveryAttempts: 0,
      }
      rows.set(id, row)
      return row
    })
    mocks.update.mockImplementation(
      async ({ id, data }: { id: string | number; data: Partial<ContactRow> }) => {
        const row = [...rows.values()].find((candidate) => candidate.id === id)
        if (!row) throw new Error('contact row missing')
        Object.assign(row, data)
        return row
      },
    )
    mocks.sendEmail.mockResolvedValue({ ok: true, id: 'message-id' })

    process.env.SALES_EMAIL = 'sales@example.com'
    process.env.NEXT_PUBLIC_SITE_URL = 'https://jakartabc.com'
    process.env.TRUSTED_PROXY_SECRET = trustedProxySecret
  })

  it('persists once, records sent delivery, and then confirms the visitor', async () => {
    const result = await submitContact(fd(validContact), 'client-supplied-ip-is-ignored')

    expect(result).toEqual({ ok: true, submissionId, delivery: 'sent' })
    expect(mocks.verifyTurnstile).toHaveBeenCalledWith('turnstile-token', '1.1.1.1')
    expect(mocks.rateLimit).toHaveBeenCalledWith('contact', '1.1.1.1:sari@example.com')
    expect(mocks.acquire).toHaveBeenCalledWith(submissionId)
    expect(mocks.create).toHaveBeenCalledWith({
      collection: 'contact-messages',
      overrideAccess: true,
      data: {
        submissionId,
        deliveryStatus: 'pending',
        deliveryAttempts: 0,
        name: 'Sari Wijaya',
        email: 'sari@example.com',
        company: 'Jakarta Partners',
        message: 'Hello, I would like to discuss a PT PMA setup timeline.',
        locale: 'id',
        status: 'new',
      },
    })
    expect(mocks.update).toHaveBeenCalledTimes(2)
    expect(mocks.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        collection: 'contact-messages',
        id: 7,
        overrideAccess: true,
        data: expect.objectContaining({ deliveryStatus: 'pending', deliveryAttempts: 1 }),
      }),
    )
    expect(mocks.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        collection: 'contact-messages',
        id: 7,
        overrideAccess: true,
        data: expect.objectContaining({ deliveryStatus: 'sent', deliveryAttempts: 1 }),
      }),
    )
    expect(mocks.sendEmail).toHaveBeenCalledTimes(2)
    expect(mocks.sendEmail).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ to: 'sales@example.com', subject: '[Contact] Sari Wijaya' }),
    )
    expect(mocks.sendEmail).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        to: 'sari@example.com',
        subject: 'Terima kasih sudah menghubungi — Jakarta Business Center',
      }),
    )
    expect(mocks.update.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.sendEmail.mock.invocationCallOrder[0]!,
    )
    expect(mocks.update.mock.invocationCallOrder[1]).toBeLessThan(
      mocks.sendEmail.mock.invocationCallOrder[1]!,
    )
    expect(mocks.sendEmail.mock.invocationCallOrder[1]).toBeLessThan(
      mocks.complete.mock.invocationCallOrder[0]!,
    )
    const pendingData = mocks.update.mock.calls[0]?.[0].data
    const finalData = mocks.update.mock.calls[1]?.[0].data
    expect(finalData.lastDeliveryAttemptAt).toBe(pendingData.lastDeliveryAttemptAt)
    expect(finalData.deliveryAttempts).toBe(pendingData.deliveryAttempts)
  })

  it('accepts once and records sanitized failed delivery for a resolved provider failure', async () => {
    const rawError =
      'sales@example.com Bearer raw-token https://user:pass@example.test/?api_key=secret message=private'
    mocks.sendEmail.mockResolvedValueOnce({ ok: false, error: rawError })

    const result = await submitContact(fd(validContact))

    expect(result).toEqual({ ok: true, submissionId, delivery: 'failed' })
    expect(rows.get(submissionId)).toMatchObject({
      deliveryStatus: 'failed',
      deliveryAttempts: 1,
      deliveredAt: null,
      deliveryError: 'delivery.provider-send-failed|ProviderError',
    })
    expect(JSON.stringify(rows.get(submissionId))).not.toContain(rawError)
    expect(mocks.sendEmail).toHaveBeenCalledTimes(2)
    expect(mocks.complete).toHaveBeenCalledWith(lease)
  })

  it('absorbs a thrown owner provider error without logging or storing secrets', async () => {
    const rawError = new Error(
      'visitor@example.test Bearer token-secret message=private-customer-content',
    )
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.sendEmail.mockRejectedValueOnce(rawError)

    const result = await submitContact(fd(validContact))

    expect(result).toEqual({ ok: true, submissionId, delivery: 'failed' })
    expect(rows.get(submissionId)?.deliveryError).toBe('delivery.provider-send-failed|Error')
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain(rawError.message)
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain(validContact.email)
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain(validContact.message)
  })

  it('returns ok without side effects when the honeypot is filled', async () => {
    const result = await submitContact(fd({ ...validContact, hp: 'bot-value' }))

    expect(result).toEqual({ ok: true })
    expect(mocks.verifyTurnstile).not.toHaveBeenCalled()
    expect(mocks.acquire).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it.each([
    ['invalid form', { ...validContact, message: 'short' }],
    ['malformed submissionId', { ...validContact, submissionId: 'reused-contact-id' }],
  ])('rejects %s before anti-spam checks', async (_case, form) => {
    const result = await submitContact(fd(form))

    expect(result).toEqual({ ok: false, code: 'validation' })
    expect(mocks.verifyTurnstile).not.toHaveBeenCalled()
  })

  it('rejects a missing submissionId before anti-spam checks', async () => {
    const form = fd(validContact)
    form.delete('submissionId')

    expect(await submitContact(form)).toEqual({ ok: false, code: 'validation' })
    expect(mocks.verifyTurnstile).not.toHaveBeenCalled()
  })

  it('returns captcha before rate limiting when Turnstile rejects the proof', async () => {
    mocks.verifyTurnstile.mockResolvedValue(false)

    expect(await submitContact(fd(validContact))).toEqual({ ok: false, code: 'captcha' })
    expect(mocks.rateLimit).not.toHaveBeenCalled()
  })

  it('fails closed if Turnstile unexpectedly rejects', async () => {
    mocks.verifyTurnstile.mockRejectedValue(new Error('provider token and customer secret'))

    expect(await submitContact(fd(validContact))).toEqual({
      ok: false,
      code: 'temporarily-unavailable',
    })
    expect(mocks.rateLimit).not.toHaveBeenCalled()
  })

  it('returns rate when the shared limiter rejects the submission', async () => {
    mocks.rateLimit.mockResolvedValue({ allowed: false, retryAfter: 300 })

    expect(await submitContact(fd(validContact))).toEqual({ ok: false, code: 'rate' })
    expect(mocks.acquire).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it.each(['rateLimit', 'acquire'] as const)(
    'fails closed without persistence when Redis %s is unavailable',
    async (operation) => {
      mocks[operation].mockRejectedValue(new Error('Redis URL with password must stay private'))

      expect(await submitContact(fd(validContact))).toEqual({
        ok: false,
        code: 'temporarily-unavailable',
      })
      expect(mocks.create).not.toHaveBeenCalled()
      expect(mocks.sendEmail).not.toHaveBeenCalled()
    },
  )

  it('returns retryable without touching the database while another request owns the lease', async () => {
    mocks.acquire.mockResolvedValue({ state: 'in-progress' })

    expect(await submitContact(fd(validContact))).toEqual({
      ok: false,
      code: 'temporarily-unavailable',
    })
    expect(mocks.find).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('reconciles an existing row and never resends owner email', async () => {
    rows.set(submissionId, {
      id: 19,
      submissionId,
      deliveryStatus: 'failed',
      deliveryAttempts: 1,
      deliveryError: 'delivery.provider-send-failed|TimeoutError',
    })

    const result = await submitContact(fd(validContact))

    expect(result).toEqual({ ok: true, submissionId, delivery: 'failed' })
    expect(mocks.find).toHaveBeenCalledWith({
      collection: 'contact-messages',
      limit: 1,
      overrideAccess: true,
      where: { submissionId: { equals: submissionId } },
    })
    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.sendEmail).not.toHaveBeenCalled()
    expect(mocks.complete).toHaveBeenCalledWith(lease)
  })

  it('resumes an existing untouched pending row while holding its lease', async () => {
    rows.set(submissionId, {
      id: 23,
      submissionId,
      deliveryStatus: 'pending',
      deliveryAttempts: 0,
      ...persistedContactFields,
    })

    const result = await submitContact(fd(validContact))

    expect(result).toEqual({ ok: true, submissionId, delivery: 'sent' })
    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.update).toHaveBeenCalledTimes(2)
    expect(mocks.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        id: 23,
        overrideAccess: true,
        data: expect.objectContaining({ deliveryStatus: 'pending', deliveryAttempts: 1 }),
      }),
    )
    expect(mocks.sendEmail).toHaveBeenCalledTimes(2)
    expect(
      mocks.sendEmail.mock.calls.filter(([message]) => message.to === 'sales@example.com'),
    ).toHaveLength(1)
    expect(mocks.complete).toHaveBeenCalledWith(lease)
  })

  it('uses only the persisted contact when a different retry resumes delivery', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const original = {
      ...validContact,
      name: 'Original Contact',
      email: 'ORIGINAL@EXAMPLE.COM',
      company: 'Original Company',
      message: 'Original confidential contact message for the sales team.',
      locale: 'en',
    }
    const retry = {
      ...validContact,
      name: 'Retry Attacker',
      email: 'RETRY@EXAMPLE.COM',
      company: 'Retry Company',
      message: 'Different retry content must never enter either outbound email.',
      locale: 'id',
    }
    mocks.update.mockRejectedValueOnce(new Error('pending persistence unavailable'))

    expect(await submitContact(fd(original))).toEqual({ ok: false, code: 'persistence' })
    expect(mocks.sendEmail).not.toHaveBeenCalled()
    expect(rows.get(submissionId)).toMatchObject({
      name: 'Original Contact',
      email: 'original@example.com',
      company: 'Original Company',
      message: 'Original confidential contact message for the sales team.',
      locale: 'en',
      deliveryStatus: 'pending',
      deliveryAttempts: 0,
    })

    expect(await submitContact(fd(retry))).toEqual({
      ok: true,
      submissionId,
      delivery: 'sent',
    })

    const ownerMail = mocks.sendEmail.mock.calls.find(
      ([message]) => message.to === 'sales@example.com',
    )?.[0]
    const visitorMail = mocks.sendEmail.mock.calls.find(
      ([message]) => message.to === 'original@example.com',
    )?.[0]
    expect(ownerMail).toMatchObject({
      subject: '[Contact] Original Contact',
      text: expect.stringContaining('Original confidential contact message'),
    })
    expect(ownerMail.text).toContain('original@example.com')
    expect(ownerMail.text).toContain('Original Company')
    expect(JSON.stringify(ownerMail)).not.toContain('Retry Attacker')
    expect(JSON.stringify(ownerMail)).not.toContain('retry@example.com')
    expect(JSON.stringify(ownerMail)).not.toContain('Different retry content')
    expect(visitorMail).toMatchObject({
      to: 'original@example.com',
      subject: 'Thanks for reaching out — Jakarta Business Center',
      text: expect.stringContaining('Hi Original Contact'),
    })
    expect(mocks.sendEmail).toHaveBeenCalledTimes(2)
    expect(rows.get(submissionId)).toMatchObject({
      name: 'Original Contact',
      email: 'original@example.com',
      message: 'Original confidential contact message for the sales team.',
      deliveryStatus: 'sent',
      deliveryAttempts: 1,
    })
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain('pending persistence unavailable')
  })

  it.each([
    [
      'missing email',
      { name: 'Stored Contact', message: 'Stored valid contact message.', locale: 'en' },
    ],
    [
      'malformed locale',
      {
        name: 'Stored Contact',
        email: 'stored@example.com',
        message: 'Stored valid contact message.',
        locale: 'fr',
      },
    ],
  ])('fails closed for a %s on an untouched persisted row', async (_case, persistedFields) => {
    rows.set(submissionId, {
      id: 27,
      submissionId,
      deliveryStatus: 'pending',
      deliveryAttempts: 0,
      ...persistedFields,
    })

    expect(await submitContact(fd(validContact))).toEqual({ ok: false, code: 'persistence' })
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.sendEmail).not.toHaveBeenCalled()
    expect(mocks.complete).not.toHaveBeenCalled()
    expect(mocks.release).toHaveBeenCalledWith(lease)
  })

  it('accepts Payload null for the optional persisted company', async () => {
    rows.set(submissionId, {
      id: 28,
      submissionId,
      deliveryStatus: 'pending',
      deliveryAttempts: 0,
      ...persistedContactFields,
      company: null,
    })

    expect(await submitContact(fd(validContact))).toEqual({
      ok: true,
      submissionId,
      delivery: 'sent',
    })
    const ownerMail = mocks.sendEmail.mock.calls.find(
      ([message]) => message.to === 'sales@example.com',
    )?.[0]
    expect(ownerMail.text).not.toContain('null')
    expect(mocks.sendEmail).toHaveBeenCalledTimes(2)
  })

  it('keeps an attempted pending row neutral and never resends owner email', async () => {
    rows.set(submissionId, {
      id: 24,
      submissionId,
      deliveryStatus: 'pending',
      deliveryAttempts: 1,
      lastDeliveryAttemptAt: '2026-08-10T10:00:00.000Z',
    })

    expect(await submitContact(fd(validContact))).toEqual({
      ok: true,
      submissionId,
      delivery: 'pending',
    })
    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.sendEmail).not.toHaveBeenCalled()
    expect(mocks.complete).toHaveBeenCalledWith(lease)
  })

  it('resumes an untouched pending row once under concurrent retries', async () => {
    rows.set(submissionId, {
      id: 25,
      submissionId,
      deliveryStatus: 'pending',
      deliveryAttempts: 0,
      ...persistedContactFields,
    })

    const results = await Promise.all([
      submitContact(fd(validContact)),
      submitContact(fd(validContact)),
    ])

    expect(results).toContainEqual({ ok: true, submissionId, delivery: 'sent' })
    expect(results).toContainEqual({ ok: false, code: 'temporarily-unavailable' })
    expect(mocks.create).not.toHaveBeenCalled()
    expect(
      mocks.sendEmail.mock.calls.filter(([message]) => message.to === 'sales@example.com'),
    ).toHaveLength(1)
    expect(rows.get(submissionId)).toMatchObject({
      deliveryStatus: 'sent',
      deliveryAttempts: 1,
    })
  })

  it('reads the persisted result for a completed Redis marker without resending', async () => {
    coordinatorState = 'completed'
    rows.set(submissionId, {
      id: 20,
      submissionId,
      deliveryStatus: 'sent',
      deliveryAttempts: 1,
    })

    expect(await submitContact(fd(validContact))).toEqual({
      ok: true,
      submissionId,
      delivery: 'sent',
    })
    expect(mocks.find).toHaveBeenCalledWith(expect.objectContaining({ overrideAccess: true }))
    expect(mocks.sendEmail).not.toHaveBeenCalled()
    expect(mocks.complete).not.toHaveBeenCalled()
  })

  it('creates one row and sends one owner email for concurrent identical submissions', async () => {
    const [first, second] = await Promise.all([
      submitContact(fd(validContact)),
      submitContact(fd(validContact)),
    ])

    expect([first, second]).toContainEqual({ ok: true, submissionId, delivery: 'sent' })
    expect([first, second]).toContainEqual({ ok: false, code: 'temporarily-unavailable' })
    expect([...rows.values()].filter((row) => row.submissionId === submissionId)).toHaveLength(1)
    expect(mocks.create).toHaveBeenCalledOnce()
    expect(mocks.sendEmail).toHaveBeenCalledTimes(2)
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'sales@example.com' }),
    )
  })

  it('reconciles a database unique race without resending owner email', async () => {
    mocks.create.mockImplementationOnce(async ({ data }: { data: Record<string, unknown> }) => {
      rows.set(submissionId, {
        ...data,
        id: 22,
        submissionId,
        deliveryStatus: 'sent',
        deliveryAttempts: 1,
      })
      throw new Error('duplicate key with private database details')
    })

    expect(await submitContact(fd(validContact))).toEqual({
      ok: true,
      submissionId,
      delivery: 'sent',
    })
    expect(mocks.find).toHaveBeenCalledTimes(2)
    expect(mocks.sendEmail).not.toHaveBeenCalled()
    expect(mocks.complete).toHaveBeenCalledWith(lease)
  })

  it('resumes an untouched row discovered during database create reconciliation', async () => {
    mocks.create.mockImplementationOnce(async ({ data }: { data: Record<string, unknown> }) => {
      rows.set(submissionId, {
        ...data,
        id: 26,
        submissionId,
        deliveryStatus: 'pending',
        deliveryAttempts: 0,
      })
      throw new Error('duplicate key with private database details')
    })

    expect(await submitContact(fd(validContact))).toEqual({
      ok: true,
      submissionId,
      delivery: 'sent',
    })
    expect(mocks.find).toHaveBeenCalledTimes(2)
    expect(mocks.create).toHaveBeenCalledOnce()
    expect(
      mocks.sendEmail.mock.calls.filter(([message]) => message.to === 'sales@example.com'),
    ).toHaveLength(1)
    expect(rows.get(submissionId)).toMatchObject({
      deliveryStatus: 'sent',
      deliveryAttempts: 1,
    })
  })

  it('releases the lease when persistence fails before a durable row exists', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.create.mockRejectedValueOnce(new Error('postgres://user:password@db/private'))

    expect(await submitContact(fd(validContact))).toEqual({ ok: false, code: 'persistence' })
    expect(mocks.release).toHaveBeenCalledWith(lease)
    expect(mocks.complete).not.toHaveBeenCalled()
    expect(mocks.sendEmail).not.toHaveBeenCalled()
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain('password')
  })

  it('does not claim success when the final delivery-state update fails', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.update
      .mockImplementationOnce(async ({ id, data }: { id: number; data: Partial<ContactRow> }) => {
        const row = rows.get(submissionId)!
        expect(row.id).toBe(id)
        Object.assign(row, data)
        return row
      })
      .mockRejectedValueOnce(new Error('private final update details'))

    expect(await submitContact(fd(validContact))).toEqual({ ok: false, code: 'persistence' })
    expect(mocks.sendEmail).toHaveBeenCalledOnce()
    expect(mocks.complete).not.toHaveBeenCalled()
    expect(mocks.release).toHaveBeenCalledWith(lease)
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain('private final update details')

    expect(await submitContact(fd(validContact))).toEqual({
      ok: true,
      submissionId,
      delivery: 'pending',
    })
    expect(mocks.sendEmail).toHaveBeenCalledOnce()
  })

  it('fails closed before send when the pending update is a stale no-op', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.update.mockImplementationOnce(async () => rows.get(submissionId))

    expect(await submitContact(fd(validContact))).toEqual({ ok: false, code: 'persistence' })
    expect(rows.get(submissionId)).toMatchObject({
      deliveryStatus: 'pending',
      deliveryAttempts: 0,
    })
    expect(mocks.sendEmail).not.toHaveBeenCalled()
    expect(mocks.complete).not.toHaveBeenCalled()
    expect(mocks.release).toHaveBeenCalledWith(lease)
  })

  it.each([
    ['lost ownership', { state: 'lease-lost' }],
    ['malformed response', { state: 'unexpected' }],
  ])('fails closed before the pending claim on %s', async (_case, renewal) => {
    mocks.renew.mockResolvedValueOnce(renewal)

    expect(await submitContact(fd(validContact))).toEqual({
      ok: false,
      code: 'temporarily-unavailable',
    })
    expect(mocks.renew).toHaveBeenCalledOnce()
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.sendEmail).not.toHaveBeenCalled()
    expect(mocks.complete).not.toHaveBeenCalled()
  })

  it('fails closed before the pending claim when Redis renewal throws', async () => {
    mocks.renew.mockRejectedValueOnce(new Error('redis://:secret@redis/private'))

    expect(await submitContact(fd(validContact))).toEqual({
      ok: false,
      code: 'temporarily-unavailable',
    })
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.sendEmail).not.toHaveBeenCalled()
    expect(mocks.complete).not.toHaveBeenCalled()
  })

  it.each([
    ['lost ownership', { state: 'lease-lost' }],
    ['malformed response', { state: 'unexpected' }],
  ])(
    'leaves the durable pending claim neutral when pre-send renewal has %s',
    async (_case, renewal) => {
      mocks.renew.mockResolvedValueOnce({ state: 'renewed' }).mockResolvedValueOnce(renewal)

      expect(await submitContact(fd(validContact))).toEqual({
        ok: false,
        code: 'temporarily-unavailable',
      })
      expect(mocks.renew).toHaveBeenCalledTimes(2)
      expect(mocks.update).toHaveBeenCalledOnce()
      expect(rows.get(submissionId)).toMatchObject({
        deliveryStatus: 'pending',
        deliveryAttempts: 1,
      })
      expect(mocks.sendEmail).not.toHaveBeenCalled()
      expect(mocks.complete).not.toHaveBeenCalled()
    },
  )

  it('leaves the durable pending claim neutral when pre-send Redis renewal throws', async () => {
    mocks.renew
      .mockResolvedValueOnce({ state: 'renewed' })
      .mockRejectedValueOnce(new Error('redis://:secret@redis/private'))

    expect(await submitContact(fd(validContact))).toEqual({
      ok: false,
      code: 'temporarily-unavailable',
    })
    expect(mocks.update).toHaveBeenCalledOnce()
    expect(rows.get(submissionId)).toMatchObject({
      deliveryStatus: 'pending',
      deliveryAttempts: 1,
    })
    expect(mocks.sendEmail).not.toHaveBeenCalled()
    expect(mocks.complete).not.toHaveBeenCalled()
  })

  it('allows only the current lease token to cross the send fence', async () => {
    let signalOldRenewStarted!: () => void
    const oldRenewStarted = new Promise<void>((resolve) => {
      signalOldRenewStarted = resolve
    })
    let allowOldRenew!: () => void
    const oldRenewGate = new Promise<void>((resolve) => {
      allowOldRenew = resolve
    })
    mocks.renew.mockImplementation(async (candidate: typeof lease) => {
      if (candidate.token === 'lease-token') {
        signalOldRenewStarted()
        await oldRenewGate
      }
      return coordinatorState === 'in-progress' && activeLeaseToken === candidate.token
        ? { state: 'renewed' }
        : { state: 'lease-lost' }
    })

    const oldWorker = submitContact(fd(validContact))
    await oldRenewStarted
    expireActiveLease()

    const currentWorker = await submitContact(fd(validContact))
    allowOldRenew()
    const staleWorker = await oldWorker

    expect(currentWorker).toEqual({ ok: true, submissionId, delivery: 'sent' })
    expect(staleWorker).toEqual({ ok: false, code: 'temporarily-unavailable' })
    expect(mocks.create).toHaveBeenCalledOnce()
    expect(
      mocks.sendEmail.mock.calls.filter(([message]) => message.to === 'sales@example.com'),
    ).toHaveLength(1)
    expect(mocks.renew.mock.calls.map(([candidate]) => candidate.token)).toEqual([
      'lease-token',
      'lease-token-2',
      'lease-token-2',
    ])
  })

  it.each([
    ['id', { id: 999 }],
    ['submission identity', { submissionId: '22222222-2222-4222-8222-222222222222' }],
  ])(
    'fails closed before send when the pending update returns a different %s',
    async (_case, wrong) => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      mocks.update.mockImplementationOnce(
        async ({ data }: { data: Partial<ContactRow> }) =>
          ({ ...rows.get(submissionId)!, ...data, ...wrong }) as ContactRow,
      )

      expect(await submitContact(fd(validContact))).toEqual({ ok: false, code: 'persistence' })
      expect(mocks.sendEmail).not.toHaveBeenCalled()
      expect(mocks.complete).not.toHaveBeenCalled()
      expect(mocks.release).toHaveBeenCalledWith(lease)
    },
  )

  it('fails closed when Payload does not persist the requested final delivery state', async () => {
    mocks.update
      .mockImplementationOnce(async ({ data }: { data: Partial<ContactRow> }) => {
        const row = rows.get(submissionId)!
        Object.assign(row, data)
        return row
      })
      .mockImplementationOnce(async () => rows.get(submissionId))

    expect(await submitContact(fd(validContact))).toEqual({ ok: false, code: 'persistence' })
    expect(rows.get(submissionId)?.deliveryStatus).toBe('pending')
    expect(mocks.sendEmail).toHaveBeenCalledOnce()
    expect(mocks.complete).not.toHaveBeenCalled()
    expect(mocks.release).toHaveBeenCalledWith(lease)
  })

  it('does not claim success when Redis completion fails and safely reconciles on retry', async () => {
    mocks.complete.mockRejectedValueOnce(new Error('redis://:password@redis/private'))

    expect(await submitContact(fd(validContact))).toEqual({
      ok: false,
      code: 'temporarily-unavailable',
    })
    expect(mocks.release).toHaveBeenCalledWith(lease)
    expect(mocks.sendEmail).toHaveBeenCalledTimes(2)

    expect(await submitContact(fd(validContact))).toEqual({
      ok: true,
      submissionId,
      delivery: 'sent',
    })
    expect(mocks.sendEmail).toHaveBeenCalledTimes(2)
  })

  it('treats visitor delivery as best effort after the final owner state is durable', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const visitorSecret = 'visitor@example.test Bearer visitor-token private message'
    mocks.sendEmail
      .mockResolvedValueOnce({ ok: true, id: 'sales-message' })
      .mockResolvedValueOnce({ ok: false, error: visitorSecret })

    expect(await submitContact(fd(validContact))).toEqual({
      ok: true,
      submissionId,
      delivery: 'sent',
    })
    expect(rows.get(submissionId)?.deliveryStatus).toBe('sent')
    expect(mocks.complete).toHaveBeenCalledWith(lease)
    expect(JSON.stringify(warning.mock.calls)).not.toContain(visitorSecret)
  })

  it.each([null, 'invalid-proxy-proof'])(
    'ignores spoofed forwarding headers when proxy proof is %s',
    async (proof) => {
      mocks.headersGet.mockImplementation((name: string) => {
        if (name.toLowerCase() === 'x-jbc-proxy-secret') return proof
        if (name.toLowerCase() === 'x-forwarded-for') return '203.0.113.44'
        if (name.toLowerCase() === 'cf-connecting-ip') return '198.51.100.7'
        if (name.toLowerCase() === 'x-real-ip') return '192.0.2.8'
        return null
      })

      expect(await submitContact(fd(validContact))).toMatchObject({ ok: true })
      expect(mocks.verifyTurnstile).toHaveBeenCalledWith('turnstile-token', 'unknown')
      expect(mocks.rateLimit).toHaveBeenCalledWith('contact', 'unknown:sari@example.com')
    },
  )

  it('requires sales email configuration before anti-spam or persistence', async () => {
    delete process.env.SALES_EMAIL

    expect(await submitContact(fd(validContact))).toEqual({ ok: false, code: 'unknown' })
    expect(mocks.verifyTurnstile).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it('persists without a company when the optional company field is omitted', async () => {
    const withoutCompany: Record<string, string> = { ...validContact }
    delete withoutCompany.company

    expect(await submitContact(fd(withoutCompany))).toMatchObject({ ok: true })
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ company: undefined }) }),
    )
  })
})
