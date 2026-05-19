import { revalidateTag } from 'next/cache'

const MAX_TAGS = 100
const MAX_TAG_LENGTH = 256

function isValidTag(tag: unknown): tag is string {
  return typeof tag === 'string' && tag.length > 0 && tag.length <= MAX_TAG_LENGTH
}

export async function POST(req: Request) {
  const expectedSecret = process.env.REVALIDATE_SECRET
  const suppliedSecret = req.headers.get('x-revalidate-secret')

  if (!expectedSecret || suppliedSecret !== expectedSecret) {
    return new Response('unauthorized', { status: 401 })
  }

  let body: { tags?: unknown }
  try {
    body = (await req.json()) as { tags?: unknown }
  } catch {
    return new Response('bad json', { status: 400 })
  }

  if (
    !body ||
    typeof body !== 'object' ||
    !Array.isArray(body.tags) ||
    body.tags.length > MAX_TAGS ||
    !body.tags.every(isValidTag)
  ) {
    return new Response('bad body', { status: 400 })
  }

  for (const tag of body.tags) {
    revalidateTag(tag)
  }

  return Response.json({ revalidated: body.tags })
}
