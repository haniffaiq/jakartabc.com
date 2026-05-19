type RevalidateContext = {
  req?: {
    payload?: {
      logger?: {
        info?: (message: string) => void
        warn?: (message: string) => void
      }
    }
  }
}

export const makeGlobalRevalidateHook = (getTags: () => string[]) => {
  return async ({ req }: RevalidateContext = {}) => {
    const tags = getTags()
    const secret = process.env.REVALIDATE_SECRET
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

    if (!secret || !siteUrl) {
      req?.payload?.logger?.warn?.('Skipping revalidate: REVALIDATE_SECRET or NEXT_PUBLIC_SITE_URL is not configured')
      return
    }

    const endpoint = new URL('/api/revalidate', siteUrl)
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-revalidate-secret': secret,
      },
      body: JSON.stringify({ tags }),
    })

    if (!response.ok) {
      throw new Error(`Revalidate failed with status ${response.status}`)
    }

    req?.payload?.logger?.info?.(`Revalidated ${tags.join(', ')}`)
  }
}
