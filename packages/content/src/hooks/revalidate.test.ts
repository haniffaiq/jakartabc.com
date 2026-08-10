import { afterEach, describe, expect, it, vi } from 'vitest'

import { MAX_CACHE_TAG_LENGTH } from '../cache/tags'
import {
  REVALIDATE_CACHE_QUEUE,
  REVALIDATE_CACHE_TASK_SLUG,
  makeGlobalRevalidateHook,
  makeRevalidateDeleteHook,
  makeRevalidateHook,
} from './revalidate'

const runPayloadHook = (hook: unknown, args: Record<string, unknown>) =>
  (hook as (payloadArgs: Record<string, unknown>) => Promise<unknown>)(args)

const requestWithQueue = () => {
  const queue = vi.fn().mockResolvedValue({ id: 'job-1' })
  const logger = { error: vi.fn(), info: vi.fn(), warn: vi.fn() }
  const req = {
    payload: {
      jobs: { queue },
      logger,
    },
    transactionID: 'transaction-1',
  }

  return { logger, queue, req }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('makeRevalidateHook', () => {
  it('queues old and new tags with the same transactional request', async () => {
    const { queue, req } = requestWithQueue()
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const buildTags = vi.fn((doc: { slug: string }, previousDoc?: { slug: string }) => [
      `new:${doc.slug}`,
      `old:${previousDoc?.slug}`,
    ])
    const doc = { slug: 'new' }

    const result = await runPayloadHook(makeRevalidateHook(buildTags), {
      doc,
      previousDoc: { slug: 'old' },
      operation: 'update',
      req,
    })

    expect(result).toBe(doc)
    expect(buildTags).toHaveBeenCalledWith(doc, { slug: 'old' })
    expect(queue).toHaveBeenCalledWith({
      input: { tags: ['new:new', 'old:old'] },
      overrideAccess: true,
      queue: REVALIDATE_CACHE_QUEUE,
      req,
      task: REVALIDATE_CACHE_TASK_SLUG,
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('canonicalizes and deduplicates tags before queueing', async () => {
    const { queue, req } = requestWithQueue()
    const longTag = `insight:en:${'x'.repeat(400)}`

    await runPayloadHook(
      makeRevalidateHook(() => ['same', 'same', longTag]),
      {
        doc: {},
        req,
      },
    )

    const tags = queue.mock.calls[0]?.[0].input.tags as string[]
    expect(tags).toHaveLength(2)
    expect(tags[1]).toHaveLength(MAX_CACHE_TAG_LENGTH)
  })

  it('logs a stable queue failure and propagates it to roll back the mutation', async () => {
    const { logger, queue, req } = requestWithQueue()
    const failure = new Error('database unavailable: secret detail')
    queue.mockRejectedValue(failure)

    await expect(
      runPayloadHook(
        makeRevalidateHook(() => ['x']),
        { doc: { slug: 'kept' }, req },
      ),
    ).rejects.toBe(failure)
    expect(logger.error).toHaveBeenCalledWith('Failed to queue cache revalidation')
  })
})

describe('makeRevalidateDeleteHook', () => {
  it('queues tags from the deleted document in the same transaction', async () => {
    const { queue, req } = requestWithQueue()
    const deletedDoc = { slug: 'deleted' }

    const result = await runPayloadHook(
      makeRevalidateDeleteHook((doc: { slug: string }) => [`deleted:${doc.slug}`]),
      { doc: deletedDoc, req },
    )

    expect(result).toBe(deletedDoc)
    expect(queue).toHaveBeenCalledWith(
      expect.objectContaining({ input: { tags: ['deleted:deleted'] }, req }),
    )
  })
})

describe('makeGlobalRevalidateHook', () => {
  it('queues global tags and returns the changed document', async () => {
    const { queue, req } = requestWithQueue()
    const doc = { brandName: 'Jakarta BC' }

    const result = await runPayloadHook(
      makeGlobalRevalidateHook(() => ['site:en', 'site:id']),
      {
        doc,
        req,
      },
    )

    expect(result).toBe(doc)
    expect(queue).toHaveBeenCalledWith(
      expect.objectContaining({ input: { tags: ['site:en', 'site:id'] }, req }),
    )
  })
})
