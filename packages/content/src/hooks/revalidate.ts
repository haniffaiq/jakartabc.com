import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  GlobalAfterChangeHook,
  PayloadRequest,
} from 'payload'

import { canonicalCacheTags } from '../cache/tags'

export const REVALIDATE_CACHE_TASK_SLUG = 'revalidate-cache'
export const REVALIDATE_CACHE_QUEUE = 'cache-revalidation'

type RevalidateLogger = {
  error?: (message: string) => void
}

type RevalidateQueue = {
  queue: (args: {
    input: { tags: string[] }
    overrideAccess: true
    queue: string
    req: PayloadRequest
    task: string
  }) => Promise<unknown>
}

async function queueRevalidation(tags: string[], req: PayloadRequest) {
  const canonicalTags = canonicalCacheTags(tags)
  if (canonicalTags.length === 0) return

  try {
    await (req.payload.jobs as unknown as RevalidateQueue).queue({
      input: { tags: canonicalTags },
      overrideAccess: true,
      queue: REVALIDATE_CACHE_QUEUE,
      req,
      task: REVALIDATE_CACHE_TASK_SLUG,
    })
  } catch (error) {
    const logger = req.payload.logger as RevalidateLogger | undefined
    logger?.error?.('Failed to queue cache revalidation')
    throw error
  }
}

export function makeRevalidateHook<TDoc = unknown>(
  buildTags: (doc: TDoc, previousDoc?: TDoc) => string[],
): CollectionAfterChangeHook {
  return async ({ doc, previousDoc, req }) => {
    await queueRevalidation(buildTags(doc as TDoc, previousDoc as TDoc | undefined), req)
    return doc
  }
}

export function makeRevalidateDeleteHook<TDoc = unknown>(
  buildTags: (doc: TDoc) => string[],
): CollectionAfterDeleteHook {
  return async ({ doc, req }) => {
    await queueRevalidation(buildTags(doc as TDoc), req)
    return doc
  }
}

export function makeGlobalRevalidateHook<TDoc = unknown>(
  buildTags: (doc?: TDoc) => string[],
): GlobalAfterChangeHook {
  return async ({ doc, req }) => {
    await queueRevalidation(buildTags(doc as TDoc | undefined), req)
    return doc
  }
}
