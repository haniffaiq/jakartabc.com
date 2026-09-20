const ENDPOINT = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
export const TURNSTILE_TIMEOUT_MS = 5_000

type TurnstileResponse = {
  success?: boolean
  hostname?: string
}

export async function verifyTurnstile(token: string, remoteip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY

  // Turnstile not configured: the widget is not rendered, so no token is
  // submitted and there is nothing to verify. Once a secret is set the check
  // below still fails closed on a missing or rejected token.
  if (!secret) {
    return true
  }

  if (!token) {
    return false
  }

  try {
    const expectedHostname = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? '').hostname
    if (!expectedHostname) return false
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TURNSTILE_TIMEOUT_MS)

    try {
      const params = new URLSearchParams()
      params.set('secret', secret)
      params.set('response', token)

      if (remoteip) {
        params.set('remoteip', remoteip)
      }

      const res = await fetch(ENDPOINT, {
        method: 'POST',
        body: params,
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        signal: controller.signal,
      })

      if (!res.ok) {
        return false
      }

      const data = (await res.json()) as TurnstileResponse

      return data.success === true && data.hostname === expectedHostname
    } finally {
      clearTimeout(timeout)
    }
  } catch {
    return false
  }
}
