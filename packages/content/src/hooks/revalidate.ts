import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  GlobalAfterChangeHook,
} from 'payload'

type RevalidateLogger = {
  info?: (message: string) => void
  warn?: (message: string) => void
  error?: (message: string) => void
}

type RevalidateContext = {
  req?: {
    payload?: {
      logger?: RevalidateLogger
    }
  }
}

const getLogger = (context?: RevalidateContext) => context?.req?.payload?.logger

const postRevalidate = async (tags: string[], logger?: RevalidateLogger) => {
  const secret = process.env.REVALIDATE_SECRET
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

  if (!secret || !siteUrl) {
    logger?.warn?.(
      'Skipping revalidate: REVALIDATE_SECRET or NEXT_PUBLIC_SITE_URL is not configured',
    )
    return
  }

  try {
    const endpoint = new URL('/api/revalidate', siteUrl).toString()
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-revalidate-secret': secret,
      },
      body: JSON.stringify({ tags }),
    })

    if (!response.ok) {
      logger?.warn?.(`Revalidate failed with status ${response.status}`)
      return
    }

    logger?.info?.(`Revalidated ${tags.join(', ')}`)
  } catch {
    logger?.error?.('Revalidate request failed')
  }
}

export function makeRevalidateHook<TDoc = unknown>(
  buildTags: (doc: TDoc, previousDoc?: TDoc) => string[],
): CollectionAfterChangeHook {
  return async ({ doc, previousDoc, req }) => {
    await postRevalidate(
      buildTags(doc as TDoc, previousDoc as TDoc | undefined),
      getLogger({ req }),
    )
    return doc
  }
}

export function makeRevalidateDeleteHook<TDoc = unknown>(
  buildTags: (doc: TDoc) => string[],
): CollectionAfterDeleteHook {
  return async ({ doc, req }) => {
    await postRevalidate(buildTags(doc as TDoc), getLogger({ req }))
    return doc
  }
}

export function makeGlobalRevalidateHook<TDoc = unknown>(
  buildTags: (doc?: TDoc) => string[],
): GlobalAfterChangeHook {
  return async ({ doc, req }) => {
    await postRevalidate(buildTags(doc as TDoc | undefined), getLogger({ req }))
    return doc
  }
}
