import fs from 'node:fs/promises'
import path from 'node:path'

import matter from 'gray-matter'

import { type Locale } from '@/i18n/routing'
import { SERVICE_SLUGS, type ServiceSlug } from '../../content/services'

const ROOT = path.join(process.cwd(), 'content/services')

export type ServiceFrontmatter = {
  title: string
  timelineLabel: string
  leadParagraph: string
  pricing?: {
    govFee: number
    ourFee: number
    currency: string
  }
}

export type LoadedMdx = {
  frontmatter: ServiceFrontmatter
  content: string
}

export function listServiceSlugs(): readonly ServiceSlug[] {
  return SERVICE_SLUGS
}

function assertServiceSlug(slug: string): asserts slug is ServiceSlug {
  if (!(SERVICE_SLUGS as readonly string[]).includes(slug)) {
    throw new Error(`unknown service slug: ${slug}`)
  }
}

function validateFrontmatter(data: Record<string, unknown>, file: string): ServiceFrontmatter {
  if (
    typeof data.title !== 'string' ||
    typeof data.timelineLabel !== 'string' ||
    typeof data.leadParagraph !== 'string'
  ) {
    throw new Error(`invalid service frontmatter: ${file}`)
  }

  const frontmatter: ServiceFrontmatter = {
    title: data.title,
    timelineLabel: data.timelineLabel,
    leadParagraph: data.leadParagraph,
  }

  if (data.pricing !== undefined) {
    const pricing = data.pricing
    if (
      typeof pricing !== 'object' ||
      pricing === null ||
      typeof (pricing as { govFee?: unknown }).govFee !== 'number' ||
      typeof (pricing as { ourFee?: unknown }).ourFee !== 'number' ||
      typeof (pricing as { currency?: unknown }).currency !== 'string'
    ) {
      throw new Error(`invalid service pricing frontmatter: ${file}`)
    }

    frontmatter.pricing = pricing as ServiceFrontmatter['pricing']
  }

  return frontmatter
}

export async function loadServiceMdx(slug: string, locale: Locale): Promise<LoadedMdx> {
  assertServiceSlug(slug)

  const file = path.join(ROOT, `${slug}.${locale}.mdx`)
  const parsed = matter(await fs.readFile(file, 'utf8'))

  return {
    frontmatter: validateFrontmatter(parsed.data, file),
    content: parsed.content.trim(),
  }
}
