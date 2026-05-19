import { describe, expect, it } from 'vitest'

import ErrorPage from './error'
import NotFound from './not-found'

function collectText(node: unknown): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (!node || typeof node !== 'object') return ''

  const props = 'props' in node ? (node as { props?: { children?: unknown } }).props : undefined
  const children = props?.children

  if (Array.isArray(children)) return children.map(collectText).join(' ')
  return collectText(children)
}

describe('portal error pages', () => {
  it('renders the editorial 404 page with a dashboard recovery link', () => {
    const page = NotFound()
    const text = collectText(page)

    expect(text).toContain('404')
    expect(text).toContain("This page isn't here.")
    expect(text).toContain('It may have been moved, or the link is incorrect.')
    expect(text).toContain('Back to dashboard')
  })

  it('renders the editorial 500 page with a reset action', () => {
    const reset = () => undefined
    const page = ErrorPage({ error: new Error('boom'), reset })
    const text = collectText(page)

    expect(text).toContain('500')
    expect(text).toContain("Something on our end isn't working.")
    expect(text).toContain('Try again, or contact your partner if it persists.')
    expect(text).toContain('Try again')
  })
})
