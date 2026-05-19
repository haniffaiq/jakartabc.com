import { beforeEach, describe, expect, it, vi } from 'vitest'

const revalidateTagMock = vi.fn()
const testHeaderValue = 'secret-xyz'

vi.mock('next/cache', () => ({
  revalidateTag: (...args: unknown[]) => revalidateTagMock(...args),
}))

import { POST } from './route'

describe('POST /api/revalidate', () => {
  beforeEach(() => {
    revalidateTagMock.mockReset()
    process.env.REVALIDATE_SECRET = testHeaderValue
  })

  it('401 when secret missing', async () => {
    const req = new Request('http://x', {
      method: 'POST',
      body: JSON.stringify({ tags: ['x'] }),
    })

    const res = await POST(req)

    expect(res.status).toBe(401)
  })

  it.each([
    ['bad json', 'not-json'],
    ['null json', 'null'],
  ])('400 on %s body', async (_name, body) => {
    const req = new Request('http://x', {
      method: 'POST',
      headers: { 'x-revalidate-secret': testHeaderValue },
      body,
    })

    const res = await POST(req)

    expect(res.status).toBe(400)
  })

  it('400 when tags are malformed', async () => {
    const req = new Request('http://x', {
      method: 'POST',
      headers: { 'x-revalidate-secret': testHeaderValue },
      body: JSON.stringify({ tags: ['valid', '', 123, 'x'.repeat(257)] }),
    })

    const res = await POST(req)

    expect(res.status).toBe(400)
    expect(revalidateTagMock).not.toHaveBeenCalled()
  })

  it('200 + revalidates each tag', async () => {
    const req = new Request('http://x', {
      method: 'POST',
      headers: { 'x-revalidate-secret': testHeaderValue },
      body: JSON.stringify({ tags: ['a', 'b'] }),
    })

    const res = await POST(req)

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ revalidated: ['a', 'b'] })
    expect(revalidateTagMock).toHaveBeenCalledWith('a')
    expect(revalidateTagMock).toHaveBeenCalledWith('b')
  })
})
