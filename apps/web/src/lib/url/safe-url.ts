export type SafeHrefOptions = {
  allowMailto?: boolean
  allowTel?: boolean
}

const CONTROL_OR_BACKSLASH = /[\u0000-\u001f\u007f-\u009f\\]/
const SCHEME = /^([a-z][a-z\d+.-]*):/i

function decodeForInspection(value: string): string | null {
  let decoded = value

  for (let pass = 0; pass < 2; pass += 1) {
    try {
      const next = decodeURIComponent(decoded)

      if (next === decoded) break
      decoded = next
    } catch {
      return null
    }
  }

  return decoded
}

function schemeOf(value: string): string | null {
  return SCHEME.exec(value)?.[1]?.toLowerCase() ?? null
}

function isValidNetworkURL(value: string, expectedProtocol: 'http:' | 'https:'): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === expectedProtocol && parsed.hostname.length > 0
  } catch {
    return false
  }
}

/**
 * Returns a trimmed href only when both its transport form and its twice-decoded
 * inspection form obey the same URL policy. The original encoding is preserved
 * so encoded path separators do not silently change resource identity.
 */
export function safeHref(value: unknown, options: SafeHrefOptions = {}): string | null {
  if (typeof value !== 'string') return null

  const href = value.trim()
  if (!href || CONTROL_OR_BACKSLASH.test(href)) return null

  const decodedValue = decodeForInspection(href)
  if (decodedValue === null || CONTROL_OR_BACKSLASH.test(decodedValue)) return null

  const decoded = decodedValue.trim()
  if (!decoded || decoded.startsWith('//')) return null

  if (href.startsWith('/')) {
    if (href.startsWith('//') || !decoded.startsWith('/') || decoded.startsWith('//')) return null
    return href
  }

  const scheme = schemeOf(href)
  const decodedScheme = schemeOf(decoded)
  if (!scheme || scheme !== decodedScheme) return null

  if (scheme === 'http' || scheme === 'https') {
    const protocol = `${scheme}:` as 'http:' | 'https:'
    return isValidNetworkURL(href, protocol) && isValidNetworkURL(decoded, protocol) ? href : null
  }

  if (scheme === 'mailto' && options.allowMailto) {
    return decoded.slice('mailto:'.length).length > 0 ? href : null
  }

  if (scheme === 'tel' && options.allowTel) {
    return decoded.slice('tel:'.length).length > 0 ? href : null
  }

  return null
}
