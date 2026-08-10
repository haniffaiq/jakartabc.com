import type { SendResult } from '@jakartabc/email'

const DELIVERY_ERROR_EVENT = 'delivery.provider-send-failed'
const MAX_DELIVERY_ERROR_LENGTH = 500
const DATE_GET_TIME = Date.prototype.getTime
const DATE_TO_ISO_STRING = Date.prototype.toISOString

const SAFE_ERROR_NAMES = new Set([
  'AbortError',
  'AggregateError',
  'Error',
  'FetchError',
  'RangeError',
  'ReferenceError',
  'SyntaxError',
  'TimeoutError',
  'TypeError',
  'URIError',
])

export type DeliveryStatus = 'pending' | 'sent' | 'failed'

export type PendingDeliveryTransition = Readonly<{
  deliveryStatus: 'pending'
  deliveryAttempts: number
  lastDeliveryAttemptAt: string
  deliveredAt: null
  deliveryError: null
}>

export type SentDeliveryTransition = Readonly<{
  deliveryStatus: 'sent'
  deliveryAttempts: number
  lastDeliveryAttemptAt: string
  deliveredAt: string
  deliveryError: null
}>

export type FailedDeliveryTransition = Readonly<{
  deliveryStatus: 'failed'
  deliveryAttempts: number
  lastDeliveryAttemptAt: string
  deliveredAt: null
  deliveryError: string
}>

export type DeliveryTransition =
  | PendingDeliveryTransition
  | SentDeliveryTransition
  | FailedDeliveryTransition

export type DeliveryAttemptResult = Readonly<{
  pending: PendingDeliveryTransition
  final: SentDeliveryTransition | FailedDeliveryTransition
}>

export type DeliveryClock = () => Date

function validTimestamp(value: Date) {
  try {
    const time = Reflect.apply(DATE_GET_TIME, value, []) as number
    if (!Number.isFinite(time)) throw new Error('Invalid delivery timestamp')
    return Reflect.apply(DATE_TO_ISO_STRING, value, []) as string
  } catch {
    throw new Error('Invalid delivery timestamp')
  }
}

function providerErrorClass(error: unknown) {
  try {
    if (!(error instanceof Error)) return 'ProviderError'
    return SAFE_ERROR_NAMES.has(error.name) ? error.name : 'ProviderError'
  } catch {
    return 'ProviderError'
  }
}

export function sanitizeDeliveryError(error: unknown) {
  return `${DELIVERY_ERROR_EVENT}|${providerErrorClass(error)}`.slice(0, MAX_DELIVERY_ERROR_LENGTH)
}

export function beginDeliveryAttempt(
  currentAttempts: number,
  attemptedAt: Date,
): PendingDeliveryTransition {
  if (
    !Number.isSafeInteger(currentAttempts) ||
    currentAttempts < 0 ||
    currentAttempts >= Number.MAX_SAFE_INTEGER
  ) {
    throw new Error('Invalid delivery attempt count')
  }

  return Object.freeze({
    deliveryStatus: 'pending',
    deliveryAttempts: currentAttempts + 1,
    lastDeliveryAttemptAt: validTimestamp(attemptedAt),
    deliveredAt: null,
    deliveryError: null,
  })
}

export function completeDeliveryAttempt(
  pending: PendingDeliveryTransition,
  deliveredAt: Date,
): SentDeliveryTransition {
  return Object.freeze({
    deliveryStatus: 'sent',
    deliveryAttempts: pending.deliveryAttempts,
    lastDeliveryAttemptAt: pending.lastDeliveryAttemptAt,
    deliveredAt: validTimestamp(deliveredAt),
    deliveryError: null,
  })
}

export function failDeliveryAttempt(
  pending: PendingDeliveryTransition,
  error: unknown,
): FailedDeliveryTransition {
  return Object.freeze({
    deliveryStatus: 'failed',
    deliveryAttempts: pending.deliveryAttempts,
    lastDeliveryAttemptAt: pending.lastDeliveryAttemptAt,
    deliveredAt: null,
    deliveryError: sanitizeDeliveryError(error),
  })
}

export async function attemptDelivery({
  currentAttempts,
  send,
  clock = () => new Date(),
}: {
  currentAttempts: number
  send: () => Promise<SendResult>
  clock?: DeliveryClock
}): Promise<DeliveryAttemptResult> {
  const pending = beginDeliveryAttempt(currentAttempts, clock())

  try {
    const result = await send()
    if (!result.ok) {
      return Object.freeze({
        pending,
        final: failDeliveryAttempt(pending, result.error),
      })
    }
  } catch (error) {
    return Object.freeze({
      pending,
      final: failDeliveryAttempt(pending, error),
    })
  }

  return Object.freeze({
    pending,
    final: completeDeliveryAttempt(pending, clock()),
  })
}
