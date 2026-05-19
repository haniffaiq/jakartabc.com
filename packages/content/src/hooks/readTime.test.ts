import { describe, expect, it } from 'vitest'

import { calcReadTime } from './readTime'

describe('calcReadTime', () => {
  it('returns 1 minute for empty body', () => {
    expect(calcReadTime({ root: { children: [] } } as any)).toBe(1)
  })

  it('rounds up 250 words to 2 minutes at 200wpm', () => {
    const text = 'word '.repeat(250)
    const body = { root: { children: [{ type: 'paragraph', children: [{ text }] }] } }

    expect(calcReadTime(body as any)).toBe(2)
  })
})
