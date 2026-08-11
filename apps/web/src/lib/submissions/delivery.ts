import type { SendResult } from '@jakartabc/email'

const DELIVERY_ERROR_EVENT = 'delivery.provider-send-failed'
const MAX_DELIVERY_ERROR_LENGTH = 500
const DATE_GET_TIME = Date.prototype.getTime
const DATE_PARSE = Date.parse
const DATE_TO_ISO_STRING = Date.prototype.toISOString
const DATE_CONSTRUCTOR = Date
const OBJECT_GET_OWN_PROPERTY_DESCRIPTOR = Object.getOwnPropertyDescriptor
const OBJECT_HAS_OWN_PROPERTY = Object.prototype.hasOwnProperty
const REGEXP_TEST = RegExp.prototype.test
const PAYLOAD_UTC_MILLISECOND_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

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

const INVALID_DELIVERY_RECONCILIATION = Object.freeze({ state: 'invalid' as const })
const RECONCILED_DELIVERY = Object.freeze({
  pending: Object.freeze({ state: 'reconciled' as const, delivery: 'pending' as const }),
  sent: Object.freeze({ state: 'reconciled' as const, delivery: 'sent' as const }),
  failed: Object.freeze({ state: 'reconciled' as const, delivery: 'failed' as const }),
})
const SAFE_DELIVERY_ERRORS = new Set([
  `${DELIVERY_ERROR_EVENT}|ProviderError`,
  ...[...SAFE_ERROR_NAMES].map((name) => `${DELIVERY_ERROR_EVENT}|${name}`),
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

export type DeliveryReconciliation =
  | Readonly<{ state: 'reconciled'; delivery: DeliveryStatus }>
  | typeof INVALID_DELIVERY_RECONCILIATION

export type DeliveryClock = () => Date

type PersistedDeliveryValues = Readonly<{
  deliveryStatus: unknown
  deliveryAttempts: unknown
  lastDeliveryAttemptAt: unknown
  deliveredAt: unknown
  deliveryError: unknown
}>

function persistedDeliveryValues(record: unknown): PersistedDeliveryValues | null {
  if (typeof record !== 'object' || record === null) return null

  try {
    const readOwnDataValue = (key: keyof PersistedDeliveryValues) => {
      const descriptor = Reflect.apply(OBJECT_GET_OWN_PROPERTY_DESCRIPTOR, Object, [
        record,
        key,
      ]) as PropertyDescriptor | undefined
      if (
        !descriptor ||
        !(Reflect.apply(OBJECT_HAS_OWN_PROPERTY, descriptor, ['value']) as boolean)
      ) {
        throw new Error('Invalid persisted delivery property')
      }
      return descriptor.value as unknown
    }

    return Object.freeze({
      deliveryStatus: readOwnDataValue('deliveryStatus'),
      deliveryAttempts: readOwnDataValue('deliveryAttempts'),
      lastDeliveryAttemptAt: readOwnDataValue('lastDeliveryAttemptAt'),
      deliveredAt: readOwnDataValue('deliveredAt'),
      deliveryError: readOwnDataValue('deliveryError'),
    })
  } catch {
    return null
  }
}

function payloadTimestamp(value: unknown): number | null {
  if (
    typeof value !== 'string' ||
    !(Reflect.apply(REGEXP_TEST, PAYLOAD_UTC_MILLISECOND_ISO, [value]) as boolean)
  ) {
    return null
  }

  try {
    const timestamp = Reflect.apply(DATE_PARSE, DATE_CONSTRUCTOR, [value]) as number
    if (!Number.isFinite(timestamp)) return null
    const canonical = Reflect.apply(
      DATE_TO_ISO_STRING,
      new DATE_CONSTRUCTOR(timestamp),
      [],
    ) as string
    return canonical === value ? timestamp : null
  } catch {
    return null
  }
}

function stableDeliveryError(value: unknown) {
  return typeof value === 'string' && SAFE_DELIVERY_ERRORS.has(value)
}

export function reconcilePersistedDelivery(record: unknown): DeliveryReconciliation {
  const values = persistedDeliveryValues(record)
  if (!values) return INVALID_DELIVERY_RECONCILIATION

  const { deliveryStatus, deliveryAttempts, lastDeliveryAttemptAt, deliveredAt, deliveryError } =
    values
  if (
    typeof deliveryAttempts !== 'number' ||
    !Number.isSafeInteger(deliveryAttempts) ||
    deliveryAttempts < 1
  ) {
    return INVALID_DELIVERY_RECONCILIATION
  }

  const lastAttemptTime = payloadTimestamp(lastDeliveryAttemptAt)
  if (lastAttemptTime === null) return INVALID_DELIVERY_RECONCILIATION

  if (deliveryStatus === 'pending') {
    return deliveredAt === null && deliveryError === null
      ? RECONCILED_DELIVERY.pending
      : INVALID_DELIVERY_RECONCILIATION
  }

  if (deliveryStatus === 'sent') {
    const deliveredTime = payloadTimestamp(deliveredAt)
    return deliveredTime !== null && deliveredTime >= lastAttemptTime && deliveryError === null
      ? RECONCILED_DELIVERY.sent
      : INVALID_DELIVERY_RECONCILIATION
  }

  if (deliveryStatus === 'failed') {
    return deliveredAt === null && stableDeliveryError(deliveryError)
      ? RECONCILED_DELIVERY.failed
      : INVALID_DELIVERY_RECONCILIATION
  }

  return INVALID_DELIVERY_RECONCILIATION
}

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
