import { createClient } from 'redis'
import { env } from '@/env'

const REDIS_ERROR_EVENT = 'redis-client-error'

interface ConnectableRedisClient {
  connect(): Promise<unknown>
  on(event: 'error', listener: (error: unknown) => void): unknown
}

type RedisClientFactory<Client extends ConnectableRedisClient> = (options: {
  url: string
}) => Client

export class RedisUnavailableError extends Error {
  override readonly name = 'RedisUnavailableError'

  constructor() {
    super('Redis is unavailable')
  }
}

export function makeRedisGetter<Client extends ConnectableRedisClient>(
  createRedisClient: RedisClientFactory<Client>,
  url: string,
) {
  let cachedPromise: Promise<Client> | undefined

  return (): Promise<Client> => {
    if (cachedPromise) return cachedPromise

    let connectionAttempt: Promise<Client>
    try {
      const client = createRedisClient({ url })
      client.on('error', () => console.error(REDIS_ERROR_EVENT))
      connectionAttempt = client
        .connect()
        .then(() => client)
        .catch(() => {
          throw new RedisUnavailableError()
        })
    } catch {
      connectionAttempt = Promise.reject(new RedisUnavailableError())
    }

    cachedPromise = connectionAttempt
    void connectionAttempt.catch(() => {
      if (cachedPromise === connectionAttempt) cachedPromise = undefined
    })

    return connectionAttempt
  }
}

export const getRedis = makeRedisGetter((options) => createClient(options), env.REDIS_URL)
