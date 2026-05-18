import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

import { type Locale } from '@/i18n/routing'

export type ServiceMdx = {
  frontmatter: {
    title: string
    leadParagraph: string
    timelineLabel?: string
    pricing?: {
      govFee: number
      ourFee: number
      currency: string
    }
  }
  content: string
}

const serviceDirectory = path.join(process.cwd(), 'content/services')

function parseScalar(value: string) {
  const trimmed = value.trim()
  if (/^\d+$/.test(trimmed)) return Number(trimmed)
  return trimmed.replace(/^['"]|['"]$/g, '')
}

function parseMdx(raw: string): ServiceMdx {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!match) throw new Error('Service MDX is missing frontmatter')

  const frontmatter: Record<string, unknown> = {}
  let nestedKey: string | null = null

  const frontmatterSource = match[1]
  const content = match[2]
  if (frontmatterSource === undefined || content === undefined) {
    throw new Error('Service MDX is missing frontmatter or content')
  }

  for (const line of frontmatterSource.split('\n')) {
    if (!line.trim()) continue

    const nested = line.match(/^\s{2}([\w-]+):\s*(.+)$/)
    if (nested?.[1] && nested[2] && nestedKey) {
      const current = frontmatter[nestedKey] as Record<string, unknown>
      current[nested[1]] = parseScalar(nested[2])
      continue
    }

    const pair = line.match(/^([\w-]+):\s*(.*)$/)
    if (!pair?.[1] || pair[2] === undefined) continue

    if (pair[2] === '') {
      nestedKey = pair[1]
      frontmatter[nestedKey] = {}
    } else {
      nestedKey = null
      frontmatter[pair[1]] = parseScalar(pair[2])
    }
  }

  if (typeof frontmatter.title !== 'string' || typeof frontmatter.leadParagraph !== 'string') {
    throw new Error('Service MDX requires title and leadParagraph frontmatter')
  }

  return {
    frontmatter: frontmatter as ServiceMdx['frontmatter'],
    content: content.trim(),
  }
}

export async function listServiceSlugs() {
  const entries = await readdir(serviceDirectory)
  return entries
    .filter((entry) => entry.endsWith('.en.mdx'))
    .map((entry) => entry.replace(/\.en\.mdx$/, ''))
    .sort()
}

export async function loadServiceMdx(slug: string, locale: Locale) {
  if (!/^[a-z0-9-]+$/.test(slug)) throw new Error('Invalid service slug')

  const file = path.join(serviceDirectory, `${slug}.${locale}.mdx`)
  return parseMdx(await readFile(file, 'utf8'))
}
