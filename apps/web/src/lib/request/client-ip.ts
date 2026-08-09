import { timingSafeEqual } from 'node:crypto'
import { isIP } from 'node:net'

export interface HeaderReader {
  get(name: string): string | null
}

function hasValidProxyProof(candidate: string | null, expected: string) {
  if (!candidate || !expected) return false
  const candidateBuffer = Buffer.from(candidate, 'utf8')
  const expectedBuffer = Buffer.from(expected, 'utf8')
  return (
    candidateBuffer.length === expectedBuffer.length &&
    timingSafeEqual(candidateBuffer, expectedBuffer)
  )
}

function normalizeIp(value: string) {
  const version = isIP(value)
  if (version === 4) return value
  if (version !== 6) return null

  try {
    const hostname = new URL(`http://[${value}]/`).hostname
    return hostname.slice(1, -1)
  } catch {
    return null
  }
}

export function getClientIP(
  requestHeaders: HeaderReader,
  trustedProxySecret = process.env.TRUSTED_PROXY_SECRET ?? '',
): string {
  const proof = requestHeaders.get('x-jbc-proxy-secret')
  if (!hasValidProxyProof(proof, trustedProxySecret)) return 'unknown'

  const forwarded = requestHeaders.get('x-forwarded-for')
  if (!forwarded || forwarded.length > 1024 || /[\r\n]/.test(forwarded)) return 'unknown'

  const addresses = forwarded.split(',').map((value) => value.trim())
  if (addresses.length === 0 || addresses.some((value) => !value)) return 'unknown'

  const normalized = addresses.map(normalizeIp)
  if (normalized.some((value) => value === null)) return 'unknown'
  return normalized[0] ?? 'unknown'
}
