import { describe, expect, it, vi } from 'vitest'

import {
  attemptDelivery,
  beginDeliveryAttempt,
  completeDeliveryAttempt,
  failDeliveryAttempt,
  sanitizeDeliveryError,
} from './delivery'

const ATTEMPTED_AT = new Date('2026-08-10T01:02:03.000Z')
const DELIVERED_AT = new Date('2026-08-10T01:02:04.000Z')

describe('delivery transitions', () => {
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
    const send = vi.fn().mockResolvedValue(undefined)
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

  it('does not misclassify an invalid completion clock as a provider failure', async () => {
    const send = vi.fn().mockResolvedValue(undefined)
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
