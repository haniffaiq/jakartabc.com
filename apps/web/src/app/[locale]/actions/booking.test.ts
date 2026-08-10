import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  acquireMock,
  completeMock,
  createMock,
  findMock,
  headersMock,
  legacyRateLimitMock,
  payloadClientMock,
  rateLimitMock,
  releaseMock,
  renderMock,
  sendMock,
  updateMock,
  verifyMock,
} = vi.hoisted(() => ({
  acquireMock: vi.fn(),
  completeMock: vi.fn(),
  createMock: vi.fn(),
  findMock: vi.fn(),
  headersMock: vi.fn(),
  legacyRateLimitMock: vi.fn(),
  payloadClientMock: vi.fn(),
  rateLimitMock: vi.fn(),
  releaseMock: vi.fn(),
  renderMock: vi.fn(async () => '<html>Email</html>'),
  sendMock: vi.fn(),
  updateMock: vi.fn(),
  verifyMock: vi.fn(),
}))

vi.mock('@/lib/payload', () => ({
  getPayloadClient: payloadClientMock,
}))
vi.mock('@/lib/anti-spam/idempotency', () => ({
  submissionCoordinator: {
    acquire: acquireMock,
    complete: completeMock,
    rateLimit: rateLimitMock,
    release: releaseMock,
  },
}))
vi.mock('@/lib/anti-spam/rate-limit', () => ({
  rateLimiter: { rateLimit: legacyRateLimitMock },
}))
vi.mock('@jakartabc/email/send', () => ({ sendEmail: sendMock }))
vi.mock('@jakartabc/email/templates/BookingLeadSales', () => ({
  BookingLeadSales: vi.fn(() => null),
}))
vi.mock('@jakartabc/email/templates/BookingLeadVisitor', () => ({
  BookingLeadVisitor: vi.fn(() => null),
}))
vi.mock('@jakartabc/email/i18n', () => ({
  subjects: {
    bookingLeadSales: vi.fn((service: string, name: string) => `Booking: ${service} — ${name}`),
    bookingLeadVisitor: {
      en: 'We received your booking request',
      id: 'Kami menerima permintaan konsultasi Anda',
    },
  },
}))
vi.mock('@react-email/components', () => ({ render: renderMock }))
vi.mock('@/lib/anti-spam/turnstile', () => ({ verifyTurnstile: verifyMock }))
vi.mock('next/headers', () => ({ headers: headersMock }))

import { submitBooking } from './booking'

const SUBMISSION_ID = '11111111-1111-4111-8111-111111111111'
const LEASE = Object.freeze({ submissionId: SUBMISSION_ID, token: 'lease-token' })
const trustedProxySecret = 'proxy-secret-value-that-is-at-least-32-characters'

const goodData = new Map<string, string>([
  ['submissionId', SUBMISSION_ID],
  ['name', 'Maria T'],
  ['email', 'maria@example.co'],
  ['company', 'Solstice'],
  ['phone', '+81-1'],
  ['serviceSlug', 'pt-pma-setup'],
  ['message', 'Hello, I would like to set up a PT PMA.'],
  ['locale', 'en'],
  ['hp', ''],
  ['turnstileToken', 'tok_x'],
])

function fd(map = goodData) {
  const formData = new FormData()
  for (const [key, value] of map.entries()) formData.append(key, value)
  formData.append('preferredWindows', 'mon-am')
  formData.append('preferredWindows', 'tue-pm')
  return formData
}

function bookingRow(deliveryStatus: 'pending' | 'sent' | 'failed' = 'sent', deliveryAttempts = 1) {
  return {
    id: 42,
    submissionId: SUBMISSION_ID,
    deliveryStatus,
    deliveryAttempts,
  }
}

describe('submitBooking', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    payloadClientMock.mockResolvedValue({ create: createMock, find: findMock, update: updateMock })
    findMock.mockImplementation(async ({ collection }: { collection: string }) =>
      collection === 'services'
        ? { docs: [{ id: 1, slug: 'pt-pma-setup', name: 'PT PMA Setup' }] }
        : { docs: [] },
    )
    verifyMock.mockResolvedValue(true)
    rateLimitMock.mockResolvedValue({ allowed: true, remaining: 4 })
    acquireMock.mockResolvedValue({ state: 'acquired', lease: LEASE })
    completeMock.mockResolvedValue({ state: 'completed' })
    releaseMock.mockResolvedValue({ state: 'released' })
    sendMock.mockResolvedValue({ ok: true, id: 'm_1' })
    createMock.mockResolvedValue(bookingRow('pending', 0))
    updateMock.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      ...bookingRow(),
      ...data,
    }))
    headersMock.mockResolvedValue(
      new Headers({
        'x-jbc-proxy-secret': trustedProxySecret,
        'x-forwarded-for': '1.2.3.4, 10.0.0.2',
      }),
    )
    process.env.SALES_EMAIL = 'sales@example.co'
    process.env.NEXT_PUBLIC_SITE_URL = 'https://jakartabc.com'
    process.env.TRUSTED_PROXY_SECRET = trustedProxySecret
  })

  it('persists pending then sent owner delivery and completes the lease', async () => {
    const result = await submitBooking(fd())

    expect(result).toEqual({ ok: true, submissionId: SUBMISSION_ID, delivery: 'sent' })
    expect(rateLimitMock).toHaveBeenCalledWith('booking', '1.2.3.4:maria@example.co')
    expect(legacyRateLimitMock).not.toHaveBeenCalled()
    expect(acquireMock).toHaveBeenCalledWith(SUBMISSION_ID)
    expect(findMock).toHaveBeenNthCalledWith(1, {
      collection: 'services',
      where: { slug: { equals: 'pt-pma-setup' } },
      limit: 1,
      overrideAccess: true,
    })
    expect(findMock).toHaveBeenNthCalledWith(2, {
      collection: 'booking-leads',
      where: { submissionId: { equals: SUBMISSION_ID } },
      limit: 1,
      overrideAccess: true,
    })
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'booking-leads',
        overrideAccess: true,
        data: expect.objectContaining({
          submissionId: SUBMISSION_ID,
          email: 'maria@example.co',
          service: 1,
          preferredWindows: ['mon-am', 'tue-pm'],
          deliveryStatus: 'pending',
          deliveryAttempts: 0,
        }),
      }),
    )
    expect(updateMock).toHaveBeenCalledTimes(2)
    expect(updateMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        collection: 'booking-leads',
        id: 42,
        overrideAccess: true,
        data: expect.objectContaining({
          deliveryStatus: 'pending',
          deliveryAttempts: 1,
          deliveredAt: null,
          deliveryError: null,
          lastDeliveryAttemptAt: expect.any(String),
        }),
      }),
    )
    expect(updateMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        collection: 'booking-leads',
        id: 42,
        overrideAccess: true,
        data: expect.objectContaining({
          deliveryStatus: 'sent',
          deliveryAttempts: 1,
          deliveredAt: expect.any(String),
          deliveryError: null,
        }),
      }),
    )
    const persistedPending = updateMock.mock.calls[0]?.[0].data
    const persistedFinal = updateMock.mock.calls[1]?.[0].data
    expect(persistedFinal.deliveryAttempts).toBe(persistedPending.deliveryAttempts)
    expect(persistedFinal.lastDeliveryAttemptAt).toBe(persistedPending.lastDeliveryAttemptAt)
    expect(sendMock).toHaveBeenCalledTimes(2)
    expect(sendMock).toHaveBeenNthCalledWith(1, expect.objectContaining({ to: 'sales@example.co' }))
    expect(sendMock).toHaveBeenNthCalledWith(2, expect.objectContaining({ to: 'maria@example.co' }))
    expect(completeMock).toHaveBeenCalledWith(LEASE)
    expect(updateMock.mock.invocationCallOrder[1]).toBeLessThan(
      sendMock.mock.invocationCallOrder[1] ?? Infinity,
    )
    expect(sendMock.mock.invocationCallOrder[0]).toBeLessThan(
      updateMock.mock.invocationCallOrder[1] ?? Infinity,
    )
    expect(updateMock.mock.invocationCallOrder[1]).toBeLessThan(
      sendMock.mock.invocationCallOrder[1] ?? Infinity,
    )
    expect(sendMock.mock.invocationCallOrder[1]).toBeLessThan(
      completeMock.mock.invocationCallOrder[0] ?? Infinity,
    )
  })

  it('validates the submission identity before silently accepting honeypot spam', async () => {
    const spam = new Map(goodData)
    spam.set('hp', 'spam')
    spam.set('submissionId', 'not-a-uuid')

    expect(await submitBooking(fd(spam))).toEqual({ ok: false, code: 'validation' })
    expect(verifyMock).not.toHaveBeenCalled()
  })

  it('silently accepts valid honeypot spam without infrastructure or persistence', async () => {
    const spam = new Map(goodData)
    spam.set('hp', 'spam')

    expect(await submitBooking(fd(spam))).toEqual({
      ok: true,
      submissionId: SUBMISSION_ID,
      delivery: 'pending',
    })
    expect(verifyMock).not.toHaveBeenCalled()
    expect(rateLimitMock).not.toHaveBeenCalled()
    expect(acquireMock).not.toHaveBeenCalled()
    expect(createMock).not.toHaveBeenCalled()
    expect(sendMock).not.toHaveBeenCalled()
  })

  it.each([
    ['invalid email', new Map([...goodData, ['email', 'bad']])],
    ['missing submission ID', new Map([...goodData].filter(([key]) => key !== 'submissionId'))],
    ['malformed submission ID', new Map([...goodData, ['submissionId', 'reused-booking-id']])],
  ])('rejects %s before abuse controls', async (_case, data) => {
    expect(await submitBooking(fd(data))).toEqual({ ok: false, code: 'validation' })
    expect(verifyMock).not.toHaveBeenCalled()
    expect(rateLimitMock).not.toHaveBeenCalled()
  })

  it('returns captcha without persistence when Turnstile rejects the request', async () => {
    verifyMock.mockResolvedValueOnce(false)

    expect(await submitBooking(fd())).toEqual({ ok: false, code: 'captcha' })
    expect(rateLimitMock).not.toHaveBeenCalled()
    expect(createMock).not.toHaveBeenCalled()
  })

  it('fails closed when Turnstile infrastructure rejects', async () => {
    verifyMock.mockRejectedValueOnce(new Error('secret provider response'))

    expect(await submitBooking(fd())).toEqual({ ok: false, code: 'temporarily-unavailable' })
    expect(rateLimitMock).not.toHaveBeenCalled()
    expect(createMock).not.toHaveBeenCalled()
  })

  it('returns rate when the trusted IP and email identity is over limit', async () => {
    rateLimitMock.mockResolvedValueOnce({ allowed: false, retryAfter: 3600 })

    expect(await submitBooking(fd())).toEqual({ ok: false, code: 'rate' })
    expect(acquireMock).not.toHaveBeenCalled()
    expect(createMock).not.toHaveBeenCalled()
  })

  it.each(['rateLimit', 'acquire'])(
    'fails closed before persistence when Redis %s fails',
    async (op) => {
      if (op === 'rateLimit') rateLimitMock.mockRejectedValueOnce(new Error('redis://user:secret'))
      else acquireMock.mockRejectedValueOnce(new Error('redis://user:secret'))

      expect(await submitBooking(fd())).toEqual({ ok: false, code: 'temporarily-unavailable' })
      expect(createMock).not.toHaveBeenCalled()
      expect(sendMock).not.toHaveBeenCalled()
    },
  )

  it('releases the acquired lease when the database client is unavailable', async () => {
    payloadClientMock.mockRejectedValueOnce(new Error('postgres://admin:secret@db'))

    expect(await submitBooking(fd())).toEqual({ ok: false, code: 'temporarily-unavailable' })
    expect(releaseMock).toHaveBeenCalledWith(LEASE)
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('returns accepted pending without persistence or mail for a concurrent in-progress request', async () => {
    acquireMock.mockResolvedValueOnce({ state: 'in-progress' })

    expect(await submitBooking(fd())).toEqual({
      ok: true,
      submissionId: SUBMISSION_ID,
      delivery: 'pending',
    })
    expect(findMock).not.toHaveBeenCalled()
    expect(createMock).not.toHaveBeenCalled()
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('returns a completed durable row without resending owner mail', async () => {
    acquireMock.mockResolvedValueOnce({ state: 'completed' })
    findMock.mockResolvedValueOnce({ docs: [bookingRow('failed', 2)] })

    expect(await submitBooking(fd())).toEqual({
      ok: true,
      submissionId: SUBMISSION_ID,
      delivery: 'failed',
    })
    expect(findMock).toHaveBeenCalledWith({
      collection: 'booking-leads',
      where: { submissionId: { equals: SUBMISSION_ID } },
      limit: 1,
      overrideAccess: true,
    })
    expect(sendMock).not.toHaveBeenCalled()
    expect(createMock).not.toHaveBeenCalled()
  })

  it('distinguishes a confirmed unknown service from lookup infrastructure failure', async () => {
    findMock.mockResolvedValueOnce({ docs: [] })

    expect(await submitBooking(fd())).toEqual({ ok: false, code: 'service-unknown' })
    expect(releaseMock).toHaveBeenCalledWith(LEASE)
    expect(createMock).not.toHaveBeenCalled()

    findMock.mockRejectedValueOnce(new Error('postgres://admin:secret@db'))
    expect(await submitBooking(fd())).toEqual({ ok: false, code: 'temporarily-unavailable' })
    expect(releaseMock).toHaveBeenCalledTimes(2)
    expect(createMock).not.toHaveBeenCalled()
  })

  it('reconciles an existing row without sending either email again', async () => {
    findMock
      .mockResolvedValueOnce({ docs: [{ id: 1, name: 'PT PMA Setup' }] })
      .mockResolvedValueOnce({ docs: [bookingRow('sent', 1)] })

    expect(await submitBooking(fd())).toEqual({
      ok: true,
      submissionId: SUBMISSION_ID,
      delivery: 'sent',
    })
    expect(createMock).not.toHaveBeenCalled()
    expect(updateMock).not.toHaveBeenCalled()
    expect(sendMock).not.toHaveBeenCalled()
    expect(completeMock).toHaveBeenCalledWith(LEASE)
  })

  it('keeps an ambiguous existing pending row neutral and emits only a structured audit event', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    findMock
      .mockResolvedValueOnce({ docs: [{ id: 1, name: 'PT PMA Setup' }] })
      .mockResolvedValueOnce({ docs: [bookingRow('pending', 1)] })

    try {
      expect(await submitBooking(fd())).toEqual({
        ok: true,
        submissionId: SUBMISSION_ID,
        delivery: 'pending',
      })
      expect(updateMock).not.toHaveBeenCalled()
      expect(sendMock).not.toHaveBeenCalled()
      expect(completeMock).toHaveBeenCalledWith(LEASE)
      expect(warn).toHaveBeenCalledWith('[booking] existing-delivery-pending', {
        submissionId: SUBMISSION_ID,
      })
      expect(JSON.stringify(warn.mock.calls)).not.toContain('maria@example.co')
    } finally {
      warn.mockRestore()
    }
  })

  it('creates one row and sends one owner email for concurrent identical submissions', async () => {
    acquireMock
      .mockResolvedValueOnce({ state: 'acquired', lease: LEASE })
      .mockResolvedValueOnce({ state: 'in-progress' })

    const [first, second] = await Promise.all([submitBooking(fd()), submitBooking(fd())])

    expect([first, second]).toEqual(
      expect.arrayContaining([
        { ok: true, submissionId: SUBMISSION_ID, delivery: 'sent' },
        { ok: true, submissionId: SUBMISSION_ID, delivery: 'pending' },
      ]),
    )
    expect(createMock).toHaveBeenCalledTimes(1)
    expect(sendMock.mock.calls.filter(([mail]) => mail.to === 'sales@example.co')).toHaveLength(1)
  })

  it.each([
    [{ ok: false, error: 'alice@example.com Bearer raw-token' }, 'ProviderError'],
    [new Error('postgres://user:secret@provider customer message'), 'Error'],
  ])(
    'accepts once and stores sanitized failure when owner mail fails',
    async (failure, errorClass) => {
      if (failure instanceof Error) sendMock.mockRejectedValueOnce(failure)
      else sendMock.mockResolvedValueOnce(failure)

      expect(await submitBooking(fd())).toEqual({
        ok: true,
        submissionId: SUBMISSION_ID,
        delivery: 'failed',
      })
      expect(createMock).toHaveBeenCalledTimes(1)
      expect(updateMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deliveryStatus: 'failed',
            deliveryAttempts: 1,
            deliveredAt: null,
            deliveryError: `delivery.provider-send-failed|${errorClass}`,
          }),
        }),
      )
      const persisted = JSON.stringify(updateMock.mock.calls)
      expect(persisted).not.toContain('alice@example.com')
      expect(persisted).not.toContain('raw-token')
      expect(persisted).not.toContain('user:secret')
      expect(completeMock).toHaveBeenCalledWith(LEASE)
    },
  )

  it('keeps owner acceptance when visitor delivery fails', async () => {
    sendMock
      .mockResolvedValueOnce({ ok: true, id: 'sales_1' })
      .mockRejectedValueOnce(new Error('visitor@example.co secret'))

    expect(await submitBooking(fd())).toEqual({
      ok: true,
      submissionId: SUBMISSION_ID,
      delivery: 'sent',
    })
    expect(completeMock).toHaveBeenCalledWith(LEASE)
  })

  it.each([
    ['create', () => createMock.mockRejectedValueOnce(new Error('db secret'))],
    [
      'pending update',
      () => updateMock.mockRejectedValueOnce(new Error('db secret before provider send')),
    ],
  ])('releases the lease and fails closed when %s fails before owner send', async (_case, fail) => {
    fail()

    expect(await submitBooking(fd())).toEqual({ ok: false, code: 'temporarily-unavailable' })
    expect(releaseMock).toHaveBeenCalledWith(LEASE)
    expect(sendMock).not.toHaveBeenCalled()
    expect(completeMock).not.toHaveBeenCalled()
  })

  it('does not report success when the final delivery update fails', async () => {
    updateMock
      .mockResolvedValueOnce({ ...bookingRow('pending', 1) })
      .mockRejectedValueOnce(new Error('db final-update secret'))

    expect(await submitBooking(fd())).toEqual({ ok: false, code: 'temporarily-unavailable' })
    expect(sendMock).toHaveBeenCalledTimes(1)
    expect(releaseMock).toHaveBeenCalledWith(LEASE)
    expect(completeMock).not.toHaveBeenCalled()
  })

  it('does not report success when Redis cannot mark the durable row complete', async () => {
    completeMock.mockRejectedValueOnce(new Error('redis credential'))

    expect(await submitBooking(fd())).toEqual({ ok: false, code: 'temporarily-unavailable' })
    expect(updateMock).toHaveBeenCalledTimes(2)
    expect(sendMock).toHaveBeenCalledTimes(2)
  })

  it('fails closed before infrastructure use when owner recipient is missing', async () => {
    delete process.env.SALES_EMAIL

    expect(await submitBooking(fd())).toEqual({ ok: false, code: 'temporarily-unavailable' })
    expect(verifyMock).not.toHaveBeenCalled()
    expect(createMock).not.toHaveBeenCalled()
  })

  it('uses only proven forwarding headers for Turnstile and throttling', async () => {
    headersMock.mockResolvedValueOnce(
      new Headers({
        'x-jbc-proxy-secret': 'invalid-proof',
        'x-forwarded-for': '203.0.113.44',
        'cf-connecting-ip': '198.51.100.7',
        'x-real-ip': '192.0.2.8',
      }),
    )

    await submitBooking(fd())

    expect(verifyMock).toHaveBeenCalledWith('tok_x', 'unknown')
    expect(rateLimitMock).toHaveBeenCalledWith('booking', 'unknown:maria@example.co')
  })
})
