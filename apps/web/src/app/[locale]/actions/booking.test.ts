import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  acquireMock,
  bookingSubjectMock,
  claimMock,
  completeMock,
  createMock,
  findMock,
  headersMock,
  legacyRateLimitMock,
  payloadClientMock,
  poolMock,
  rateLimitMock,
  releaseMock,
  renewMock,
  renderMock,
  sendMock,
  updateMock,
  verifyMock,
} = vi.hoisted(() => ({
  acquireMock: vi.fn(),
  bookingSubjectMock: vi.fn(),
  claimMock: vi.fn(),
  completeMock: vi.fn(),
  createMock: vi.fn(),
  findMock: vi.fn(),
  headersMock: vi.fn(),
  legacyRateLimitMock: vi.fn(),
  payloadClientMock: vi.fn(),
  poolMock: { query: vi.fn() },
  rateLimitMock: vi.fn(),
  releaseMock: vi.fn(),
  renewMock: vi.fn(),
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
    renew: renewMock,
  },
}))
vi.mock('@/lib/anti-spam/rate-limit', () => ({
  rateLimiter: { rateLimit: legacyRateLimitMock },
}))
vi.mock('@/lib/submissions/deliveryClaim', () => ({
  claimInitialDeliveryAttempt: claimMock,
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
    bookingLeadSales: bookingSubjectMock,
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
const LEASE_B = Object.freeze({ submissionId: SUBMISSION_ID, token: 'lease-token-b' })
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
  const lastDeliveryAttemptAt = deliveryAttempts > 0 ? '2026-08-11T03:04:05.006Z' : null
  return {
    id: 42,
    submissionId: SUBMISSION_ID,
    deliveryStatus,
    deliveryAttempts,
    lastDeliveryAttemptAt,
    deliveredAt: deliveryStatus === 'sent' ? '2026-08-11T03:04:06.007Z' : null,
    deliveryError:
      deliveryStatus === 'failed' ? 'delivery.provider-send-failed|ProviderError' : null,
    name: 'Maria T',
    email: 'maria@example.co',
    company: 'Solstice',
    phone: '+81-1',
    service: {
      id: 1,
      name: {
        en: 'Canonical PT PMA Setup',
        id: 'Layanan PT PMA Kanonis',
      },
    },
    preferredWindows: ['mon-am', 'tue-pm'],
    message: 'Hello, I would like to set up a PT PMA.',
    locale: 'en',
  }
}

function renderedProps(index: number) {
  const calls = renderMock.mock.calls as unknown as Array<[{ props: Record<string, unknown> }]>
  return calls[index]?.[0].props
}

function claimedPending(attemptedAt: Date) {
  return {
    state: 'claimed' as const,
    pending: {
      deliveryStatus: 'pending' as const,
      deliveryAttempts: 1,
      lastDeliveryAttemptAt: attemptedAt.toISOString(),
      deliveredAt: null,
      deliveryError: null,
    },
  }
}

let createdBookingRow: ReturnType<typeof bookingRow> | undefined

describe('submitBooking', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    createdBookingRow = undefined

    payloadClientMock.mockResolvedValue({
      create: createMock,
      db: { pool: poolMock },
      find: findMock,
      update: updateMock,
    })
    findMock.mockImplementation(async ({ collection }: { collection: string }) =>
      collection === 'services'
        ? { docs: [{ id: 1, slug: 'pt-pma-setup', name: 'PT PMA Setup' }] }
        : { docs: createdBookingRow ? [createdBookingRow] : [] },
    )
    verifyMock.mockResolvedValue(true)
    rateLimitMock.mockResolvedValue({ allowed: true, remaining: 4 })
    acquireMock.mockResolvedValue({ state: 'acquired', lease: LEASE })
    completeMock.mockResolvedValue({ state: 'completed' })
    releaseMock.mockResolvedValue({ state: 'released' })
    renewMock.mockResolvedValue({ state: 'renewed' })
    claimMock.mockImplementation(async ({ attemptedAt }: { attemptedAt: Date }) =>
      claimedPending(attemptedAt),
    )
    renderMock.mockResolvedValue('<html>Email</html>')
    bookingSubjectMock.mockImplementation(
      (service: string, name: string) => `Booking: ${service} — ${name}`,
    )
    sendMock.mockResolvedValue({ ok: true, id: 'm_1' })
    createMock.mockImplementation(async () => {
      createdBookingRow = bookingRow('pending', 0)
      return createdBookingRow
    })
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
      collection: 'booking-leads',
      where: { submissionId: { equals: SUBMISSION_ID } },
      limit: 1,
      overrideAccess: true,
      depth: 1,
      locale: 'all',
    })
    expect(findMock).toHaveBeenNthCalledWith(2, {
      collection: 'services',
      where: { slug: { equals: 'pt-pma-setup' } },
      limit: 1,
      overrideAccess: true,
      locale: 'en',
    })
    expect(findMock).toHaveBeenNthCalledWith(3, {
      collection: 'booking-leads',
      where: { submissionId: { equals: SUBMISSION_ID } },
      limit: 1,
      overrideAccess: true,
      depth: 1,
      locale: 'all',
    })
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'booking-leads',
        overrideAccess: true,
        depth: 1,
        locale: 'en',
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
    expect(claimMock).toHaveBeenCalledWith({
      database: poolMock,
      collection: 'booking-leads',
      id: 42,
      submissionId: SUBMISSION_ID,
      attemptedAt: expect.any(Date),
    })
    expect(updateMock).toHaveBeenCalledTimes(1)
    expect(updateMock).toHaveBeenCalledWith(
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
    const claimInput = claimMock.mock.calls[0]?.[0] as { attemptedAt: Date }
    const persistedFinal = updateMock.mock.calls[0]?.[0].data
    expect(persistedFinal.deliveryAttempts).toBe(1)
    expect(persistedFinal.lastDeliveryAttemptAt).toBe(claimInput.attemptedAt.toISOString())
    expect(sendMock).toHaveBeenCalledTimes(2)
    expect(sendMock).toHaveBeenNthCalledWith(1, expect.objectContaining({ to: 'sales@example.co' }))
    expect(sendMock).toHaveBeenNthCalledWith(2, expect.objectContaining({ to: 'maria@example.co' }))
    expect(sendMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        to: 'sales@example.co',
        subject: 'Booking: Canonical PT PMA Setup — Maria T',
      }),
    )
    expect(sendMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        to: 'maria@example.co',
        subject: 'We received your booking request',
      }),
    )
    expect(completeMock).toHaveBeenCalledWith(LEASE)
    expect(renewMock).toHaveBeenNthCalledWith(1, LEASE)
    expect(renewMock).toHaveBeenNthCalledWith(2, LEASE)
    expect(renderMock.mock.invocationCallOrder[0]).toBeLessThan(
      renewMock.mock.invocationCallOrder[0] ?? Infinity,
    )
    expect(bookingSubjectMock.mock.invocationCallOrder[0]).toBeLessThan(
      renewMock.mock.invocationCallOrder[0] ?? Infinity,
    )
    expect(renewMock.mock.invocationCallOrder[0]).toBeLessThan(
      claimMock.mock.invocationCallOrder[0] ?? Infinity,
    )
    expect(claimMock.mock.invocationCallOrder[0]).toBeLessThan(
      renewMock.mock.invocationCallOrder[1] ?? Infinity,
    )
    expect(renewMock.mock.invocationCallOrder[1]).toBeLessThan(
      sendMock.mock.invocationCallOrder[0] ?? Infinity,
    )
    expect(sendMock.mock.invocationCallOrder[0]).toBeLessThan(
      updateMock.mock.invocationCallOrder[0] ?? Infinity,
    )
    expect(updateMock.mock.invocationCallOrder[0]).toBeLessThan(
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

  it.each([
    ['lost', () => renewMock.mockResolvedValueOnce({ state: 'lease-lost' })],
    ['unavailable', () => renewMock.mockRejectedValueOnce(new Error('redis credential'))],
  ])('fails closed before claiming pending when the lease is %s', async (_case, failRenewal) => {
    failRenewal()

    expect(await submitBooking(fd())).toEqual({ ok: false, code: 'temporarily-unavailable' })
    expect(updateMock).not.toHaveBeenCalled()
    expect(renderMock).toHaveBeenCalledTimes(1)
    expect(bookingSubjectMock).toHaveBeenCalledTimes(1)
    expect(sendMock).not.toHaveBeenCalled()
    expect(releaseMock).toHaveBeenCalledWith(LEASE)
  })

  it.each([
    ['lost', () => renewMock.mockResolvedValueOnce({ state: 'lease-lost' })],
    ['unavailable', () => renewMock.mockRejectedValueOnce(new Error('redis credential'))],
  ])(
    'leaves pending ambiguous without mail when the pre-send renewal is %s',
    async (_case, fail) => {
      renewMock.mockResolvedValueOnce({ state: 'renewed' })
      fail()

      expect(await submitBooking(fd())).toEqual({ ok: false, code: 'temporarily-unavailable' })
      expect(claimMock).toHaveBeenCalledTimes(1)
      expect(updateMock).not.toHaveBeenCalled()
      expect(renderMock).toHaveBeenCalledTimes(1)
      expect(sendMock).not.toHaveBeenCalled()
      expect(releaseMock).toHaveBeenCalledWith(LEASE)
      expect(completeMock).not.toHaveBeenCalled()
    },
  )

  it('lets new lease B send once after stale lease A loses ownership before pending claim', async () => {
    const durable = bookingRow('pending', 0)
    acquireMock
      .mockResolvedValueOnce({ state: 'acquired', lease: LEASE })
      .mockResolvedValueOnce({ state: 'acquired', lease: LEASE_B })
    renewMock.mockImplementation(async (lease: { token: string }) =>
      lease.token === LEASE.token ? { state: 'lease-lost' } : { state: 'renewed' },
    )
    findMock.mockImplementation(async ({ collection }: { collection: string }) =>
      collection === 'booking-leads'
        ? { docs: [durable] }
        : { docs: [{ id: 1, name: 'PT PMA Setup' }] },
    )

    expect(await submitBooking(fd())).toEqual({ ok: false, code: 'temporarily-unavailable' })
    expect(await submitBooking(fd())).toEqual({
      ok: true,
      submissionId: SUBMISSION_ID,
      delivery: 'sent',
    })
    expect(sendMock.mock.calls.filter(([mail]) => mail.to === 'sales@example.co')).toHaveLength(1)
    expect(renewMock.mock.calls.filter(([lease]) => lease.token === LEASE.token)).toHaveLength(1)
    expect(renewMock.mock.calls.filter(([lease]) => lease.token === LEASE_B.token)).toHaveLength(2)
    expect(completeMock).toHaveBeenCalledWith(LEASE_B)
    expect(completeMock).not.toHaveBeenCalledWith(LEASE)
  })

  it('keeps B final sent state when stale A resumes after losing the atomic claim', async () => {
    let durable = bookingRow('pending', 0)
    let allowAClaim!: () => void
    let markAAtClaim!: () => void
    const aAtClaim = new Promise<void>((resolve) => {
      markAAtClaim = resolve
    })
    const aMayResume = new Promise<void>((resolve) => {
      allowAClaim = resolve
    })

    acquireMock
      .mockResolvedValueOnce({ state: 'acquired', lease: LEASE })
      .mockResolvedValueOnce({ state: 'acquired', lease: LEASE_B })
    findMock.mockImplementation(async ({ collection }: { collection: string }) =>
      collection === 'booking-leads'
        ? { docs: [durable] }
        : { docs: [{ id: 1, name: 'PT PMA Setup' }] },
    )
    claimMock
      .mockImplementationOnce(async () => {
        markAAtClaim()
        await aMayResume
        return { state: 'not-claimed' }
      })
      .mockImplementationOnce(async ({ attemptedAt }: { attemptedAt: Date }) => {
        const result = claimedPending(attemptedAt)
        durable = { ...durable, ...result.pending }
        return result
      })
    updateMock.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
      durable = { ...durable, ...data }
      return durable
    })
    completeMock.mockImplementation(async (lease: { token: string }) =>
      lease.token === LEASE_B.token ? { state: 'completed' } : { state: 'lease-lost' },
    )

    const staleA = submitBooking(fd())
    await vi.waitFor(() => expect(claimMock).toHaveBeenCalledTimes(1))
    await aAtClaim

    expect(await submitBooking(fd())).toEqual({
      ok: true,
      submissionId: SUBMISSION_ID,
      delivery: 'sent',
    })
    allowAClaim()
    expect(await staleA).toEqual({ ok: false, code: 'temporarily-unavailable' })

    expect(durable).toMatchObject({ deliveryStatus: 'sent', deliveryAttempts: 1 })
    expect(updateMock).toHaveBeenCalledTimes(1)
    expect(sendMock.mock.calls.filter(([mail]) => mail.to === 'sales@example.co')).toHaveLength(1)
    expect(completeMock).toHaveBeenCalledWith(LEASE_B)
    expect(completeMock).toHaveBeenCalledWith(LEASE)
  })

  it.each([
    ['render', () => renderMock.mockRejectedValueOnce(new Error('render preparation failed'))],
    [
      'subject',
      () =>
        bookingSubjectMock.mockImplementationOnce(() => {
          throw new Error('subject preparation failed')
        }),
    ],
  ])(
    'keeps attempts at zero when %s preparation fails and retries owner send once',
    async (_case, failPreparation) => {
      findMock.mockResolvedValue({ docs: [bookingRow('pending', 0)] })
      failPreparation()

      expect(await submitBooking(fd())).toEqual({
        ok: false,
        code: 'temporarily-unavailable',
      })
      expect(renewMock).not.toHaveBeenCalled()
      expect(updateMock).not.toHaveBeenCalled()
      expect(sendMock).not.toHaveBeenCalled()
      expect(releaseMock).toHaveBeenCalledWith(LEASE)

      expect(await submitBooking(fd())).toEqual({
        ok: true,
        submissionId: SUBMISSION_ID,
        delivery: 'sent',
      })
      expect(claimMock).toHaveBeenCalledTimes(1)
      expect(updateMock).toHaveBeenCalledTimes(1)
      expect(sendMock.mock.calls.filter(([mail]) => mail.to === 'sales@example.co')).toHaveLength(1)
      expect(completeMock).toHaveBeenCalledTimes(1)
    },
  )

  it('fails closed without Payload access for a concurrent in-progress request', async () => {
    acquireMock.mockResolvedValueOnce({ state: 'in-progress' })

    expect(await submitBooking(fd())).toEqual({ ok: false, code: 'temporarily-unavailable' })
    expect(payloadClientMock).not.toHaveBeenCalled()
    expect(findMock).not.toHaveBeenCalled()
    expect(createMock).not.toHaveBeenCalled()
    expect(updateMock).not.toHaveBeenCalled()
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
      depth: 1,
      locale: 'all',
    })
    expect(sendMock).not.toHaveBeenCalled()
    expect(createMock).not.toHaveBeenCalled()
  })

  it.each([
    ['untouched pending', bookingRow('pending', 0)],
    ['malformed sent', { ...bookingRow('sent', 1), deliveredAt: null }],
  ])('fails closed for %s behind a completed marker', async (_case, persisted) => {
    acquireMock.mockResolvedValueOnce({ state: 'completed' })
    findMock.mockResolvedValueOnce({ docs: [persisted] })

    expect(await submitBooking(fd())).toEqual({
      ok: false,
      code: 'temporarily-unavailable',
    })
    expect(releaseMock).not.toHaveBeenCalled()
    expect(completeMock).not.toHaveBeenCalled()
    expect(createMock).not.toHaveBeenCalled()
    expect(updateMock).not.toHaveBeenCalled()
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('distinguishes a confirmed unknown service from lookup infrastructure failure', async () => {
    findMock.mockResolvedValueOnce({ docs: [] }).mockResolvedValueOnce({ docs: [] })

    expect(await submitBooking(fd())).toEqual({ ok: false, code: 'service-unknown' })
    expect(releaseMock).toHaveBeenCalledWith(LEASE)
    expect(createMock).not.toHaveBeenCalled()

    findMock
      .mockResolvedValueOnce({ docs: [] })
      .mockRejectedValueOnce(new Error('postgres://admin:secret@db'))
    expect(await submitBooking(fd())).toEqual({ ok: false, code: 'temporarily-unavailable' })
    expect(releaseMock).toHaveBeenCalledTimes(2)
    expect(createMock).not.toHaveBeenCalled()
  })

  it('reconciles an existing row without sending either email again', async () => {
    findMock.mockResolvedValueOnce({ docs: [bookingRow('sent', 1)] })

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

  it.each([
    ['malformed terminal', { ...bookingRow('sent', 1), deliveredAt: null }],
    [
      'malformed untouched pending',
      { ...bookingRow('pending', 0), deliveredAt: '2026-08-11T03:04:06.007Z' },
    ],
  ])('releases the lease without accepting %s persisted state', async (_case, persisted) => {
    findMock.mockResolvedValueOnce({ docs: [persisted] })

    expect(await submitBooking(fd())).toEqual({
      ok: false,
      code: 'temporarily-unavailable',
    })
    expect(releaseMock).toHaveBeenCalledWith(LEASE)
    expect(completeMock).not.toHaveBeenCalled()
    expect(claimMock).not.toHaveBeenCalled()
    expect(createMock).not.toHaveBeenCalled()
    expect(updateMock).not.toHaveBeenCalled()
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('keeps an ambiguous existing pending row neutral and emits only a structured audit event', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    findMock.mockResolvedValueOnce({ docs: [bookingRow('pending', 1)] })

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

  it('safely resumes an existing pending row before its first owner attempt', async () => {
    findMock.mockResolvedValueOnce({ docs: [bookingRow('pending', 0)] })

    expect(await submitBooking(fd())).toEqual({
      ok: true,
      submissionId: SUBMISSION_ID,
      delivery: 'sent',
    })
    expect(createMock).not.toHaveBeenCalled()
    expect(claimMock).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'booking-leads', id: 42 }),
    )
    expect(updateMock).toHaveBeenCalledTimes(1)
    expect(sendMock.mock.calls.filter(([mail]) => mail.to === 'sales@example.co')).toHaveLength(1)
    expect(completeMock).toHaveBeenCalledWith(LEASE)
  })

  it('selects the localized service name from persisted row locale, not retry locale', async () => {
    findMock.mockResolvedValueOnce({
      docs: [
        {
          ...bookingRow('pending', 0),
          locale: 'id',
          service: {
            id: 1,
            name: {
              en: 'English Service Name',
              id: 'Nama Layanan Indonesia',
            },
          },
        },
      ],
    })

    expect(await submitBooking(fd())).toEqual({
      ok: true,
      submissionId: SUBMISSION_ID,
      delivery: 'sent',
    })
    expect(renderedProps(0)).toMatchObject({
      locale: 'id',
      service: 'Nama Layanan Indonesia',
    })
    expect(renderedProps(1)).toMatchObject({
      locale: 'id',
      service: 'Nama Layanan Indonesia',
    })
    expect(sendMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ subject: 'Booking: Nama Layanan Indonesia — Maria T' }),
    )
    expect(sendMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ subject: 'Kami menerima permintaan konsultasi Anda' }),
    )
    expect(
      JSON.stringify({ render: renderMock.mock.calls, send: sendMock.mock.calls }),
    ).not.toContain('English Service Name')
  })

  it('fails closed when locale-all service data lacks the persisted row locale', async () => {
    findMock.mockResolvedValueOnce({
      docs: [
        {
          ...bookingRow('pending', 0),
          locale: 'id',
          service: { id: 1, name: { en: 'English Service Name' } },
        },
      ],
    })

    expect(await submitBooking(fd())).toEqual({
      ok: false,
      code: 'temporarily-unavailable',
    })
    expect(updateMock).not.toHaveBeenCalled()
    expect(sendMock).not.toHaveBeenCalled()
    expect(releaseMock).toHaveBeenCalledWith(LEASE)
  })

  it('re-reads canonical state and reconciles without mail or writes when CAS is not claimed', async () => {
    findMock
      .mockResolvedValueOnce({ docs: [bookingRow('pending', 0)] })
      .mockResolvedValueOnce({ docs: [bookingRow('sent', 1)] })
    claimMock.mockResolvedValueOnce({ state: 'not-claimed' })

    expect(await submitBooking(fd())).toEqual({
      ok: true,
      submissionId: SUBMISSION_ID,
      delivery: 'sent',
    })
    expect(findMock).toHaveBeenNthCalledWith(2, {
      collection: 'booking-leads',
      where: { submissionId: { equals: SUBMISSION_ID } },
      limit: 1,
      overrideAccess: true,
      depth: 1,
      locale: 'all',
    })
    expect(updateMock).not.toHaveBeenCalled()
    expect(sendMock).not.toHaveBeenCalled()
    expect(completeMock).toHaveBeenCalledWith(LEASE)
  })

  it('fails closed when CAS no-match re-reads an untouched pending row', async () => {
    findMock.mockResolvedValue({ docs: [bookingRow('pending', 0)] })
    claimMock.mockResolvedValueOnce({ state: 'not-claimed' })

    expect(await submitBooking(fd())).toEqual({
      ok: false,
      code: 'temporarily-unavailable',
    })
    expect(findMock).toHaveBeenLastCalledWith({
      collection: 'booking-leads',
      where: { submissionId: { equals: SUBMISSION_ID } },
      limit: 1,
      overrideAccess: true,
      depth: 1,
      locale: 'all',
    })
    expect(releaseMock).toHaveBeenCalledWith(LEASE)
    expect(completeMock).not.toHaveBeenCalled()
    expect(updateMock).not.toHaveBeenCalled()
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('hydrates a stranded retry only from persisted row A when FormData B reuses its UUID', async () => {
    const serviceA = { docs: [{ id: 1, name: 'PT PMA Setup' }] }
    findMock
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce(serviceA)
      .mockResolvedValueOnce({ docs: [bookingRow('pending', 0)] })
    claimMock.mockRejectedValueOnce(new Error('database unavailable before owner send'))

    const changed = new Map(goodData)
    changed.set('name', 'Mallory B')
    changed.set('email', 'mallory-b@example.net')
    changed.set('company', 'Injected Company B')
    changed.set('phone', '+62-999-B')
    changed.set('serviceSlug', 'untrusted-service-b')
    changed.set('message', 'Changed valid message B must never enter persisted row A mail.')
    changed.set('locale', 'id')
    const changedForm = fd(changed)
    changedForm.delete('preferredWindows')
    changedForm.append('preferredWindows', 'fri-pm')

    expect(await submitBooking(fd())).toEqual({
      ok: false,
      code: 'temporarily-unavailable',
    })
    expect(await submitBooking(changedForm)).toEqual({
      ok: true,
      submissionId: SUBMISSION_ID,
      delivery: 'sent',
    })
    expect(createMock).toHaveBeenCalledTimes(1)
    expect(releaseMock).toHaveBeenCalledTimes(1)
    expect(sendMock.mock.calls.filter(([mail]) => mail.to === 'sales@example.co')).toHaveLength(1)
    expect(completeMock).toHaveBeenCalledTimes(1)

    const ownerRenderProps = renderedProps(0)
    const visitorRenderProps = renderedProps(1)
    expect(ownerRenderProps).toMatchObject({
      name: 'Maria T',
      email: 'maria@example.co',
      company: 'Solstice',
      phone: '+81-1',
      service: 'Canonical PT PMA Setup',
      preferredWindows: ['mon-am', 'tue-pm'],
      message: 'Hello, I would like to set up a PT PMA.',
      locale: 'en',
    })
    expect(visitorRenderProps).toMatchObject({
      name: 'Maria T',
      service: 'Canonical PT PMA Setup',
      locale: 'en',
    })
    expect(sendMock).toHaveBeenNthCalledWith(2, expect.objectContaining({ to: 'maria@example.co' }))
    expect(
      JSON.stringify({ render: renderMock.mock.calls, send: sendMock.mock.calls }),
    ).not.toMatch(
      /Mallory B|mallory-b@example\.net|Injected Company B|\+62-999-B|Untrusted Service B|Changed valid message B|fri-pm/,
    )
    expect(findMock).not.toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'services',
        where: { slug: { equals: 'untrusted-service-b' } },
      }),
    )
  })

  it('hydrates create-race recovery mail from the raced persisted booking row', async () => {
    findMock
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce({ docs: [{ id: 1, name: 'Lookup Service Must Not Win' }] })
      .mockResolvedValueOnce({ docs: [bookingRow('pending', 0)] })
    createMock.mockRejectedValueOnce(new Error('unique submission ID conflict'))

    const racedFormData = new Map(goodData)
    racedFormData.set('name', 'Race Form B')
    racedFormData.set('email', 'race-b@example.net')
    racedFormData.set('company', 'Race Company B')
    racedFormData.set('phone', '+62-RACE-B')
    racedFormData.set('message', 'Valid raced FormData B must not enter persisted row A mail.')
    racedFormData.set('locale', 'id')
    const racedForm = fd(racedFormData)
    racedForm.delete('preferredWindows')
    racedForm.append('preferredWindows', 'fri-am')

    expect(await submitBooking(racedForm)).toEqual({
      ok: true,
      submissionId: SUBMISSION_ID,
      delivery: 'sent',
    })
    expect(renderedProps(0)).toMatchObject({
      name: 'Maria T',
      email: 'maria@example.co',
      company: 'Solstice',
      phone: '+81-1',
      service: 'Canonical PT PMA Setup',
      preferredWindows: ['mon-am', 'tue-pm'],
      message: 'Hello, I would like to set up a PT PMA.',
      locale: 'en',
    })
    expect(
      JSON.stringify({ render: renderMock.mock.calls, send: sendMock.mock.calls }),
    ).not.toMatch(
      /Race Form B|race-b@example\.net|Race Company B|\+62-RACE-B|Valid raced FormData B|fri-am/,
    )
  })

  it('fails closed without mail when persisted pending data cannot be safely hydrated', async () => {
    findMock.mockResolvedValueOnce({
      docs: [{ ...bookingRow('pending', 0), service: 1 }],
    })

    expect(await submitBooking(fd())).toEqual({
      ok: false,
      code: 'temporarily-unavailable',
    })
    expect(sendMock).not.toHaveBeenCalled()
    expect(updateMock).not.toHaveBeenCalled()
    expect(releaseMock).toHaveBeenCalledWith(LEASE)
  })

  it.each([
    ['non-numeric ID', { id: '42' }],
    ['mismatched submission ID', { submissionId: '22222222-2222-4222-8222-222222222222' }],
  ])('fails closed before CAS for a persisted row with %s', async (_case, identity) => {
    findMock.mockResolvedValueOnce({
      docs: [{ ...bookingRow('pending', 0), ...identity }],
    })

    expect(await submitBooking(fd())).toEqual({
      ok: false,
      code: 'temporarily-unavailable',
    })
    expect(claimMock).not.toHaveBeenCalled()
    expect(renderMock).not.toHaveBeenCalled()
    expect(sendMock).not.toHaveBeenCalled()
    expect(releaseMock).toHaveBeenCalledWith(LEASE)
  })

  it('hydrates canonical nullable optional fields without falling back to FormData', async () => {
    findMock.mockResolvedValueOnce({
      docs: [
        {
          ...bookingRow('pending', 0),
          company: null,
          phone: null,
          preferredWindows: null,
        },
      ],
    })

    expect(await submitBooking(fd())).toEqual({
      ok: true,
      submissionId: SUBMISSION_ID,
      delivery: 'sent',
    })
    expect(renderedProps(0)).toMatchObject({
      company: '',
      phone: '',
      preferredWindows: [],
    })
  })

  it('creates one row and sends one owner email for concurrent identical submissions', async () => {
    acquireMock
      .mockResolvedValueOnce({ state: 'acquired', lease: LEASE })
      .mockResolvedValueOnce({ state: 'in-progress' })

    const [first, second] = await Promise.all([submitBooking(fd()), submitBooking(fd())])

    expect([first, second]).toEqual(
      expect.arrayContaining([
        { ok: true, submissionId: SUBMISSION_ID, delivery: 'sent' },
        { ok: false, code: 'temporarily-unavailable' },
      ]),
    )
    expect(createMock).toHaveBeenCalledTimes(1)
    expect(sendMock.mock.calls.filter(([mail]) => mail.to === 'sales@example.co')).toHaveLength(1)
  })

  it('never reports concurrent acceptance when the acquired request fails before create', async () => {
    acquireMock
      .mockResolvedValueOnce({ state: 'acquired', lease: LEASE })
      .mockResolvedValueOnce({ state: 'in-progress' })
    payloadClientMock.mockRejectedValueOnce(new Error('database unavailable before create'))

    const results = await Promise.all([submitBooking(fd()), submitBooking(fd())])

    expect(results).toEqual([
      { ok: false, code: 'temporarily-unavailable' },
      { ok: false, code: 'temporarily-unavailable' },
    ])
    expect(payloadClientMock).toHaveBeenCalledTimes(1)
    expect(findMock).not.toHaveBeenCalled()
    expect(createMock).not.toHaveBeenCalled()
    expect(updateMock).not.toHaveBeenCalled()
    expect(sendMock).not.toHaveBeenCalled()
    expect(releaseMock).toHaveBeenCalledWith(LEASE)
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

  it.each([
    ['resolved failure', { ok: false, error: 'visitor@example.co Bearer raw-token' }],
    ['rejection', new Error('visitor@example.co Bearer raw-token')],
  ])('keeps owner acceptance and logs a safe event for visitor %s', async (_case, failure) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    sendMock.mockResolvedValueOnce({ ok: true, id: 'sales_1' })
    if (failure instanceof Error) sendMock.mockRejectedValueOnce(failure)
    else sendMock.mockResolvedValueOnce(failure)

    try {
      expect(await submitBooking(fd())).toEqual({
        ok: true,
        submissionId: SUBMISSION_ID,
        delivery: 'sent',
      })
      expect(updateMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ deliveryStatus: 'sent', deliveryError: null }),
        }),
      )
      expect(warn).toHaveBeenCalledOnce()
      expect(warn).toHaveBeenCalledWith('[booking] visitor-delivery-failed', {
        submissionId: SUBMISSION_ID,
      })
      expect(JSON.stringify(warn.mock.calls)).not.toMatch(/visitor@example\.co|raw-token/)
      expect(completeMock).toHaveBeenCalledWith(LEASE)
    } finally {
      warn.mockRestore()
    }
  })

  it.each([
    ['create', () => createMock.mockRejectedValueOnce(new Error('db secret'))],
    [
      'atomic claim',
      () => claimMock.mockRejectedValueOnce(new Error('db secret before provider send')),
    ],
  ])('releases the lease and fails closed when %s fails before owner send', async (_case, fail) => {
    fail()

    expect(await submitBooking(fd())).toEqual({ ok: false, code: 'temporarily-unavailable' })
    expect(releaseMock).toHaveBeenCalledWith(LEASE)
    expect(sendMock).not.toHaveBeenCalled()
    expect(completeMock).not.toHaveBeenCalled()
  })

  it('does not report success when the final delivery update fails', async () => {
    updateMock.mockRejectedValueOnce(new Error('db final-update secret'))

    expect(await submitBooking(fd())).toEqual({ ok: false, code: 'temporarily-unavailable' })
    expect(sendMock).toHaveBeenCalledTimes(1)
    expect(releaseMock).toHaveBeenCalledWith(LEASE)
    expect(completeMock).not.toHaveBeenCalled()
  })

  it('does not report success when Redis cannot mark the durable row complete', async () => {
    completeMock.mockRejectedValueOnce(new Error('redis credential'))

    expect(await submitBooking(fd())).toEqual({ ok: false, code: 'temporarily-unavailable' })
    expect(updateMock).toHaveBeenCalledTimes(1)
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
