import type { TaskConfig } from 'payload'

import { REVALIDATE_CACHE_TASK_SLUG } from '../hooks/revalidate'
import { chunkCacheTags } from './tags'

export const REVALIDATE_REQUEST_TIMEOUT_MS = 5_000

type RevalidateTaskIO = {
  input: { tags: unknown }
  output: { revalidatedTagCount: number }
}

type FetchResponse = Pick<Response, 'ok' | 'status'>
type FetchImplementation = (input: string | URL, init?: RequestInit) => Promise<FetchResponse>

type RunRevalidateCacheArgs = {
  fetchImpl?: FetchImplementation
  secret: string | undefined
  signalFactory?: () => AbortSignal
  siteUrl: string | undefined
  tags: unknown
}

function parseTags(tags: unknown) {
  if (!Array.isArray(tags) || tags.some((tag) => typeof tag !== 'string')) {
    throw new Error('Cache revalidation tags must be strings')
  }

  return tags as string[]
}

export async function runRevalidateCache({
  fetchImpl = fetch,
  secret,
  signalFactory = () => AbortSignal.timeout(REVALIDATE_REQUEST_TIMEOUT_MS),
  siteUrl,
  tags: inputTags,
}: RunRevalidateCacheArgs) {
  if (!siteUrl || !secret) {
    throw new Error('Cache revalidation environment is not configured')
  }

  const chunks = chunkCacheTags(parseTags(inputTags))
  const endpoint = new URL('/api/revalidate', siteUrl).toString()

  for (const tags of chunks) {
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-revalidate-secret': secret,
      },
      body: JSON.stringify({ tags }),
      signal: signalFactory(),
    })

    if (!response.ok) {
      throw new Error(`Cache revalidation failed with status ${response.status}`)
    }
  }

  return { revalidatedTagCount: chunks.reduce((count, tags) => count + tags.length, 0) }
}

export const revalidateCacheTask: TaskConfig<RevalidateTaskIO> = {
  slug: REVALIDATE_CACHE_TASK_SLUG,
  inputSchema: [{ name: 'tags', type: 'json', required: true }],
  outputSchema: [{ name: 'revalidatedTagCount', type: 'number', required: true }],
  retries: {
    attempts: 3,
    backoff: { delay: 1_000, type: 'exponential' },
  },
  handler: async ({ input }) => ({
    output: await runRevalidateCache({
      secret: process.env.REVALIDATE_SECRET,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
      tags: input.tags,
    }),
  }),
}
