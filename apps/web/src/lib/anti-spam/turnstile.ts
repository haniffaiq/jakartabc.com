const ENDPOINT = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

type TurnstileResponse = {
  success?: boolean
  hostname?: string
}

export async function verifyTurnstile(token: string, remoteip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY

  if (!secret || !token) {
    return false
  }

  try {
    const expectedHostname = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? '').hostname
    if (!expectedHostname) return false

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
    })

    if (!res.ok) {
      return false
    }

    const data = (await res.json()) as TurnstileResponse

    return data.success === true && data.hostname === expectedHostname
  } catch {
    return false
  }
}
