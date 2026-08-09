const DEFAULT_NEXT_PATH = '/dashboard'
const PORTAL_ORIGIN = 'https://portal.invalid'
const UNSAFE_CHARACTER = /[\u0000-\u001f\u007f\\]/

function decodeForValidation(value: string) {
  let decoded = value

  try {
    for (let pass = 0; pass < 2; pass += 1) {
      const next = decodeURIComponent(decoded)
      if (next === decoded) break
      decoded = next
    }
  } catch {
    return null
  }

  return decoded
}

export function safeNextPath(value: string | null | undefined) {
  if (!value) return DEFAULT_NEXT_PATH

  const decoded = decodeForValidation(value)
  if (!decoded || UNSAFE_CHARACTER.test(decoded)) return DEFAULT_NEXT_PATH
  if (!decoded.startsWith('/') || decoded.startsWith('//')) return DEFAULT_NEXT_PATH

  try {
    const target = new URL(decoded, PORTAL_ORIGIN)
    if (target.origin !== PORTAL_ORIGIN) return DEFAULT_NEXT_PATH
    if (UNSAFE_CHARACTER.test(target.pathname)) return DEFAULT_NEXT_PATH
    if (!target.pathname.startsWith('/') || target.pathname.startsWith('//')) {
      return DEFAULT_NEXT_PATH
    }

    return `${target.pathname}${target.search}${target.hash}`
  } catch {
    return DEFAULT_NEXT_PATH
  }
}
