import { describe, expect, it, vi } from 'vitest'

import {
  attemptDelivery,
  beginDeliveryAttempt,
  completeDeliveryAttempt,
  failDeliveryAttempt,
  reconcilePersistedDelivery,
  sanitizeDeliveryError,
} from './delivery'

const ATTEMPTED_AT = new Date('2026-08-10T01:02:03.000Z')
const DELIVERED_AT = new Date('2026-08-10T01:02:04.000Z')

describe('delivery transitions', () => {
  const transitionKeys = [
    'deliveryStatus',
    'deliveryAttempts',
    'lastDeliveryAttemptAt',
    'deliveredAt',
    'deliveryError',
  ]

  it('builds immutable pending and sent transitions with deterministic timestamps', () => {
    const pending = beginDeliveryAttempt(2, ATTEMPTED_AT)
    const sent = completeDeliveryAttempt(pending, DELIVERED_AT)

    expect(pending).toEqual({
      deliveryStatus: 'pending',
      deliveryAttempts: 3,
      lastDeliveryAttemptAt: '2026-08-10T01:02:03.000Z',
      deliveredAt: null,
      deliveryError: null,
    })
    expect(sent).toEqual({
      deliveryStatus: 'sent',
      deliveryAttempts: 3,
      lastDeliveryAttemptAt: '2026-08-10T01:02:03.000Z',
      deliveredAt: '2026-08-10T01:02:04.000Z',
      deliveryError: null,
    })
    expect(Object.isFrozen(pending)).toBe(true)
    expect(Object.isFrozen(sent)).toBe(true)
    expect(pending).not.toBe(sent)
  })

  it('clamps a backward completion clock to the last attempt timestamp', () => {
    const pending = beginDeliveryAttempt(0, DELIVERED_AT)
    const sent = completeDeliveryAttempt(pending, ATTEMPTED_AT)

    expect(sent.deliveredAt).toBe(DELIVERED_AT.toISOString())
    expect(reconcilePersistedDelivery(sent)).toEqual({ state: 'reconciled', delivery: 'sent' })
  })

  it('keeps a same-time completion timestamp valid', () => {
    const pending = beginDeliveryAttempt(0, ATTEMPTED_AT)
    const sent = completeDeliveryAttempt(pending, ATTEMPTED_AT)

    expect(sent.deliveredAt).toBe(ATTEMPTED_AT.toISOString())
    expect(reconcilePersistedDelivery(sent)).toEqual({ state: 'reconciled', delivery: 'sent' })
  })

  it('makes every public transition builder output reconcilable state', () => {
    const pending = beginDeliveryAttempt(0, ATTEMPTED_AT)
    const sent = completeDeliveryAttempt(pending, DELIVERED_AT)
    const failed = failDeliveryAttempt(pending, new Error('provider raw secret'))

    expect(reconcilePersistedDelivery(pending)).toEqual({
      state: 'reconciled',
      delivery: 'pending',
    })
    expect(reconcilePersistedDelivery(sent)).toEqual({ state: 'reconciled', delivery: 'sent' })
    expect(reconcilePersistedDelivery(failed)).toEqual({ state: 'reconciled', delivery: 'failed' })
  })

  it.each(['complete', 'fail'] as const)(
    'fails closed without invoking hostile pending getters during %s',
    (operation) => {
      const attemptGetter = vi.fn(() => {
        throw new Error('visitor@example.test token=secret')
      })
      const hostilePending = {
        deliveryStatus: 'pending' as const,
        lastDeliveryAttemptAt: ATTEMPTED_AT.toISOString(),
        deliveredAt: null,
        deliveryError: null,
      }
      Object.defineProperty(hostilePending, 'deliveryAttempts', {
        enumerable: true,
        get: attemptGetter,
      })

      const build = () =>
        operation === 'complete'
          ? completeDeliveryAttempt(hostilePending as never, DELIVERED_AT)
          : failDeliveryAttempt(hostilePending as never, new Error('provider secret'))

      expect(build).toThrowError('Invalid pending delivery transition')
      expect(attemptGetter).not.toHaveBeenCalled()
    },
  )

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER])(
    'fails closed for invalid current attempt count %s',
    (attempts) => {
      expect(() => beginDeliveryAttempt(attempts, ATTEMPTED_AT)).toThrowError(
        'Invalid delivery attempt count',
      )
    },
  )

  it('fails closed for invalid transition clocks', () => {
    expect(() => beginDeliveryAttempt(0, new Date('invalid'))).toThrowError(
      'Invalid delivery timestamp',
    )
  })

  it('uses Date intrinsics without invoking hostile instance overrides', () => {
    const timestamp = new Date('2026-08-10T05:06:07.000Z')
    const hostileGetTime = vi.fn(() => {
      throw new Error('getTime secret')
    })
    const hostileToISOString = vi.fn(() => {
      throw new Error('toISOString secret')
    })
    Object.defineProperties(timestamp, {
      getTime: { value: hostileGetTime },
      toISOString: { value: hostileToISOString },
    })

    expect(beginDeliveryAttempt(0, timestamp).lastDeliveryAttemptAt).toBe(
      '2026-08-10T05:06:07.000Z',
    )
    expect(hostileGetTime).not.toHaveBeenCalled()
    expect(hostileToISOString).not.toHaveBeenCalled()
  })

  it('fails closed with a stable error for a hostile Date proxy', () => {
    const timestamp = new Proxy(ATTEMPTED_AT, {
      get() {
        throw new Error('date getter secret')
      },
      getPrototypeOf() {
        throw new Error('date prototype secret')
      },
    })

    expect(() => beginDeliveryAttempt(0, timestamp)).toThrowError('Invalid delivery timestamp')
  })

  it('copies only whitelisted transition keys from a record-like pending value', () => {
    const extraGetter = vi.fn(() => 'customer-secret')
    const symbolGetter = vi.fn(() => 'token-secret')
    const secretSymbol = Symbol('provider-secret')
    const recordLike = {
      deliveryStatus: 'pending' as const,
      deliveryAttempts: 3,
      lastDeliveryAttemptAt: ATTEMPTED_AT.toISOString(),
      deliveredAt: null,
      deliveryError: null,
      id: 'lead-123',
      nested: { customer: 'private' },
    }
    Object.defineProperties(recordLike, {
      providerPayload: { enumerable: true, get: extraGetter },
      [secretSymbol]: { enumerable: true, get: symbolGetter },
      cycle: { enumerable: true, value: recordLike },
    })

    const sent = completeDeliveryAttempt(recordLike, DELIVERED_AT)
    const failed = failDeliveryAttempt(recordLike, new Error('provider secret'))

    expect(Reflect.ownKeys(beginDeliveryAttempt(0, ATTEMPTED_AT))).toEqual(transitionKeys)
    expect(Reflect.ownKeys(sent)).toEqual(transitionKeys)
    expect(Reflect.ownKeys(failed)).toEqual(transitionKeys)
    expect(extraGetter).not.toHaveBeenCalled()
    expect(symbolGetter).not.toHaveBeenCalled()
    expect(JSON.stringify(sent)).not.toContain('customer-secret')
    expect(JSON.stringify(failed)).not.toContain('token-secret')
  })
})

describe('delivery error sanitizing', () => {
  it.each([
    new Error(
      'Customer alice@example.com said keep this private. Bearer secret-token https://user:pass@example.com/send?api_key=key-123&message=hello',
    ),
    Object.assign(new Error('password=hunter2 token=abc123 secret=xyz'), {
      name: 'SMTPError',
    }),
    'visitor@example.com message body with api_token=top-secret',
    {
      name: 'CustomerJane',
      message: 'https://client:credential@mail.example.test/?access_token=secret',
    },
    new Error('line one\r\nline two\u0000control'),
  ])('returns bounded stable metadata without provider/customer content: %#', (providerError) => {
    const sanitized = sanitizeDeliveryError(providerError)

    expect(sanitized).toMatch(/^delivery\.provider-send-failed\|(Error|ProviderError)$/)
    expect(sanitized.length).toBeLessThanOrEqual(500)
    for (const secret of [
      'alice@example.com',
      'secret-token',
      'user:pass',
      'key-123',
      'keep this private',
      'hunter2',
      'abc123',
      'xyz',
      'visitor@example.com',
      'top-secret',
      'CustomerJane',
      'client:credential',
      'access_token',
      'line one',
      'line two',
    ]) {
      expect(sanitized).not.toContain(secret)
    }
    expect(sanitized).not.toMatch(/[\u0000-\u001f\u007f]/)
  })

  it('never throws while classifying hostile provider values', () => {
    const hostile = new Proxy(
      {},
      {
        get() {
          throw new Error('getter secret')
        },
        getPrototypeOf() {
          throw new Error('prototype secret')
        },
      },
    )

    expect(() => sanitizeDeliveryError(hostile)).not.toThrow()
    expect(sanitizeDeliveryError(hostile)).toBe('delivery.provider-send-failed|ProviderError')
  })
})

describe('attemptDelivery', () => {
  it('returns pending and sent transitions after successful send', async () => {
    const send = vi.fn().mockResolvedValue({ ok: true, id: 'message-123' })
    const times = [ATTEMPTED_AT, DELIVERED_AT]
    const clock = vi.fn(() => times.shift() ?? DELIVERED_AT)

    const result = await attemptDelivery({ currentAttempts: 4, send, clock })

    expect(send).toHaveBeenCalledOnce()
    expect(clock).toHaveBeenCalledTimes(2)
    expect(result.pending).toMatchObject({
      deliveryStatus: 'pending',
      deliveryAttempts: 5,
      lastDeliveryAttemptAt: ATTEMPTED_AT.toISOString(),
    })
    expect(result.final).toMatchObject({
      deliveryStatus: 'sent',
      deliveryAttempts: 5,
      deliveredAt: DELIVERED_AT.toISOString(),
      deliveryError: null,
    })
    expect(Object.isFrozen(result)).toBe(true)
  })

  it('absorbs provider failure and returns an immutable sanitized failed transition', async () => {
    const rawError = new Error(
      'send for visitor@example.com failed: Bearer raw-token message=customer-secret',
    )
    const send = vi.fn().mockRejectedValue(rawError)
    const clock = vi.fn(() => ATTEMPTED_AT)

    const result = await attemptDelivery({ currentAttempts: 0, send, clock })

    expect(send).toHaveBeenCalledOnce()
    expect(clock).toHaveBeenCalledOnce()
    expect(result.final).toEqual({
      deliveryStatus: 'failed',
      deliveryAttempts: 1,
      lastDeliveryAttemptAt: ATTEMPTED_AT.toISOString(),
      deliveredAt: null,
      deliveryError: 'delivery.provider-send-failed|Error',
    })
    expect(result.final.deliveryError).not.toContain(rawError.message)
    expect(Object.isFrozen(result.final)).toBe(true)
    expect(Object.isFrozen(result)).toBe(true)
  })

  it('treats a resolved SendResult failure as failed without leaking its error', async () => {
    const send = vi.fn().mockResolvedValue({
      ok: false,
      error: 'visitor@example.com Bearer raw-token https://user:pass@example.test/?api_key=secret',
    })
    const clock = vi.fn(() => ATTEMPTED_AT)

    const result = await attemptDelivery({ currentAttempts: 7, send, clock })

    expect(result.final).toEqual({
      deliveryStatus: 'failed',
      deliveryAttempts: 8,
      lastDeliveryAttemptAt: ATTEMPTED_AT.toISOString(),
      deliveredAt: null,
      deliveryError: 'delivery.provider-send-failed|ProviderError',
    })
    expect(result.final.deliveryError).not.toContain('visitor@example.com')
    expect(result.final.deliveryError).not.toContain('raw-token')
    expect(result.final.deliveryError).not.toContain('api_key')
    expect(clock).toHaveBeenCalledOnce()
  })

  it('does not misclassify an invalid completion clock as a provider failure', async () => {
    const send = vi.fn().mockResolvedValue({ ok: true, id: 'message-123' })
    const times = [ATTEMPTED_AT, new Date('invalid')]

    await expect(
      attemptDelivery({
        currentAttempts: 0,
        send,
        clock: () => times.shift() ?? new Date('invalid'),
      }),
    ).rejects.toThrowError('Invalid delivery timestamp')
    expect(send).toHaveBeenCalledOnce()
  })

  it('returns reconciled sent state when the success clock moves backward', async () => {
    const send = vi.fn().mockResolvedValue({ ok: true, id: 'message-123' })
    const times = [DELIVERED_AT, ATTEMPTED_AT]

    const result = await attemptDelivery({
      currentAttempts: 0,
      send,
      clock: () => times.shift() ?? ATTEMPTED_AT,
    })

    expect(result.final).toEqual({
      deliveryStatus: 'sent',
      deliveryAttempts: 1,
      lastDeliveryAttemptAt: DELIVERED_AT.toISOString(),
      deliveredAt: DELIVERED_AT.toISOString(),
      deliveryError: null,
    })
    expect(reconcilePersistedDelivery(result.final)).toEqual({
      state: 'reconciled',
      delivery: 'sent',
    })
    expect(send).toHaveBeenCalledOnce()
  })

  it('builds the same failed transition directly without mutating pending state', () => {
    const pending = beginDeliveryAttempt(0, ATTEMPTED_AT)
    const failed = failDeliveryAttempt(pending, new TypeError('api_key=do-not-store'))

    expect(failed).toEqual({
      ...pending,
      deliveryStatus: 'failed',
      deliveryError: 'delivery.provider-send-failed|TypeError',
    })
    expect(pending.deliveryStatus).toBe('pending')
    expect(pending.deliveryError).toBeNull()
  })
})

describe('reconcilePersistedDelivery', () => {
  const lastAttemptAt = '2026-08-11T03:04:05.006Z'
  const deliveredAt = '2026-08-11T03:04:06.007Z'

  it.each([
    [
      'ambiguous pending',
      {
        deliveryStatus: 'pending',
        deliveryAttempts: 1,
        lastDeliveryAttemptAt: lastAttemptAt,
        deliveredAt: null,
        deliveryError: null,
      },
      'pending',
    ],
    [
      'terminal sent',
      {
        deliveryStatus: 'sent',
        deliveryAttempts: 2,
        lastDeliveryAttemptAt: lastAttemptAt,
        deliveredAt,
        deliveryError: null,
      },
      'sent',
    ],
    [
      'terminal failed',
      {
        deliveryStatus: 'failed',
        deliveryAttempts: 1,
        lastDeliveryAttemptAt: lastAttemptAt,
        deliveredAt: null,
        deliveryError: 'delivery.provider-send-failed|TimeoutError',
      },
      'failed',
    ],
  ])('returns immutable status-only metadata for valid %s state', (_case, record, delivery) => {
    const result = reconcilePersistedDelivery({
      ...record,
      email: 'visitor@example.test',
      message: 'private customer message',
    })

    expect(result).toEqual({ state: 'reconciled', delivery })
    expect(Reflect.ownKeys(result)).toEqual(['state', 'delivery'])
    expect(Object.isFrozen(result)).toBe(true)
    expect(JSON.stringify(result)).not.toContain('visitor@example.test')
    expect(JSON.stringify(result)).not.toContain('private customer message')
  })

  it.each([
    'AbortError',
    'AggregateError',
    'Error',
    'FetchError',
    'ProviderError',
    'RangeError',
    'ReferenceError',
    'SyntaxError',
    'TimeoutError',
    'TypeError',
    'URIError',
  ])('accepts the exact sanitizer output for failed delivery class %s', (errorClass) => {
    expect(
      reconcilePersistedDelivery({
        deliveryStatus: 'failed',
        deliveryAttempts: 1,
        lastDeliveryAttemptAt: lastAttemptAt,
        deliveredAt: null,
        deliveryError: `delivery.provider-send-failed|${errorClass}`,
      }),
    ).toEqual({ state: 'reconciled', delivery: 'failed' })
  })

  it.each([
    [
      'untouched pending',
      {
        deliveryStatus: 'pending',
        deliveryAttempts: 0,
        lastDeliveryAttemptAt: null,
        deliveredAt: null,
        deliveryError: null,
      },
    ],
    ['null attempts', { deliveryStatus: 'pending', deliveryAttempts: null }],
    ['string attempts', { deliveryStatus: 'pending', deliveryAttempts: '1' }],
    ['negative attempts', { deliveryStatus: 'pending', deliveryAttempts: -1 }],
    ['fractional attempts', { deliveryStatus: 'pending', deliveryAttempts: 1.5 }],
    [
      'unsafe attempts',
      { deliveryStatus: 'pending', deliveryAttempts: Number.MAX_SAFE_INTEGER + 1 },
    ],
    [
      'missing pending timestamp',
      {
        deliveryStatus: 'pending',
        deliveryAttempts: 1,
        lastDeliveryAttemptAt: null,
        deliveredAt: null,
        deliveryError: null,
      },
    ],
    [
      'Date object timestamp',
      {
        deliveryStatus: 'pending',
        deliveryAttempts: 1,
        lastDeliveryAttemptAt: new Date(lastAttemptAt),
        deliveredAt: null,
        deliveryError: null,
      },
    ],
    [
      'non-canonical ISO timestamp',
      {
        deliveryStatus: 'pending',
        deliveryAttempts: 1,
        lastDeliveryAttemptAt: '2026-08-11T03:04:05Z',
        deliveredAt: null,
        deliveryError: null,
      },
    ],
    [
      'impossible ISO timestamp',
      {
        deliveryStatus: 'pending',
        deliveryAttempts: 1,
        lastDeliveryAttemptAt: '2026-02-30T03:04:05.006Z',
        deliveredAt: null,
        deliveryError: null,
      },
    ],
    [
      'pending with delivered timestamp',
      {
        deliveryStatus: 'pending',
        deliveryAttempts: 1,
        lastDeliveryAttemptAt: lastAttemptAt,
        deliveredAt,
        deliveryError: null,
      },
    ],
    [
      'pending with error',
      {
        deliveryStatus: 'pending',
        deliveryAttempts: 1,
        lastDeliveryAttemptAt: lastAttemptAt,
        deliveredAt: null,
        deliveryError: 'delivery.provider-send-failed|Error',
      },
    ],
    [
      'sent before its last attempt',
      {
        deliveryStatus: 'sent',
        deliveryAttempts: 1,
        lastDeliveryAttemptAt: deliveredAt,
        deliveredAt: lastAttemptAt,
        deliveryError: null,
      },
    ],
    [
      'sent without delivered timestamp',
      {
        deliveryStatus: 'sent',
        deliveryAttempts: 1,
        lastDeliveryAttemptAt: lastAttemptAt,
        deliveredAt: null,
        deliveryError: null,
      },
    ],
    [
      'sent with error',
      {
        deliveryStatus: 'sent',
        deliveryAttempts: 1,
        lastDeliveryAttemptAt: lastAttemptAt,
        deliveredAt,
        deliveryError: 'delivery.provider-send-failed|Error',
      },
    ],
    [
      'failed with delivered timestamp',
      {
        deliveryStatus: 'failed',
        deliveryAttempts: 1,
        lastDeliveryAttemptAt: lastAttemptAt,
        deliveredAt,
        deliveryError: 'delivery.provider-send-failed|Error',
      },
    ],
    [
      'failed without error',
      {
        deliveryStatus: 'failed',
        deliveryAttempts: 1,
        lastDeliveryAttemptAt: lastAttemptAt,
        deliveredAt: null,
        deliveryError: null,
      },
    ],
    [
      'failed with arbitrary provider class',
      {
        deliveryStatus: 'failed',
        deliveryAttempts: 1,
        lastDeliveryAttemptAt: lastAttemptAt,
        deliveredAt: null,
        deliveryError: 'delivery.provider-send-failed|SMTPError',
      },
    ],
    [
      'failed with raw provider message',
      {
        deliveryStatus: 'failed',
        deliveryAttempts: 1,
        lastDeliveryAttemptAt: lastAttemptAt,
        deliveredAt: null,
        deliveryError: 'delivery.provider-send-failed|Error|visitor@example.test token=secret',
      },
    ],
    ['unknown status', { deliveryStatus: 'delivered', deliveryAttempts: 1 }],
    ['null record', null],
    ['primitive record', 'pending'],
  ])('fails closed for %s', (_case, record) => {
    expect(reconcilePersistedDelivery(record)).toBe(reconcilePersistedDelivery(record))
    expect(reconcilePersistedDelivery(record)).toEqual({ state: 'invalid' })
    expect(Object.isFrozen(reconcilePersistedDelivery(record))).toBe(true)
  })

  it('ignores extra hostile getters and never carries their content into the result', () => {
    const extraGetter = vi.fn(() => 'visitor@example.test token=secret')
    const record = {
      deliveryStatus: 'sent',
      deliveryAttempts: 1,
      lastDeliveryAttemptAt: lastAttemptAt,
      deliveredAt,
      deliveryError: null,
    }
    Object.defineProperty(record, 'providerPayload', { enumerable: true, get: extraGetter })

    const result = reconcilePersistedDelivery(record)

    expect(result).toEqual({ state: 'reconciled', delivery: 'sent' })
    expect(extraGetter).not.toHaveBeenCalled()
    expect(JSON.stringify(result)).not.toContain('token=secret')
  })

  it('does not invoke whitelisted getters and fails closed', () => {
    const statusGetter = vi.fn(() => 'sent')
    const record = {
      deliveryAttempts: 1,
      lastDeliveryAttemptAt: lastAttemptAt,
      deliveredAt,
      deliveryError: null,
    }
    Object.defineProperty(record, 'deliveryStatus', { enumerable: true, get: statusGetter })

    expect(reconcilePersistedDelivery(record)).toEqual({ state: 'invalid' })
    expect(statusGetter).not.toHaveBeenCalled()
  })

  it('never throws or leaks when a proxy rejects descriptor access', () => {
    const hostile = new Proxy(
      {},
      {
        getOwnPropertyDescriptor() {
          throw new Error('visitor@example.test Bearer token-secret')
        },
      },
    )

    expect(() => reconcilePersistedDelivery(hostile)).not.toThrow()
    expect(reconcilePersistedDelivery(hostile)).toEqual({ state: 'invalid' })
    expect(JSON.stringify(reconcilePersistedDelivery(hostile))).not.toContain('token-secret')
  })
})
