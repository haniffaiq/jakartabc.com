import config from '@payload-config'
import { getPayload } from 'payload'

let cached: Awaited<ReturnType<typeof getPayload>> | null = null

export async function getPayloadClient() {
  if (cached) return cached

  cached = await getPayload({ config })
  return cached
}
