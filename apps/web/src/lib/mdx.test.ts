import { describe, expect, it } from 'vitest'

import { listServiceSlugs, loadServiceMdx } from './mdx'

describe('service MDX loader', () => {
  it('lists all service slugs', () => {
    const slugs = listServiceSlugs()

    expect(slugs).toEqual(
      expect.arrayContaining(['pt-pma-setup', 'sector-licensing', 'tax-accounting', 'investor-kitas']),
    )
  })

  it('loads EN content with frontmatter', async () => {
    const { frontmatter, content } = await loadServiceMdx('pt-pma-setup', 'en')

    expect(frontmatter.title).toBeTruthy()
    expect(frontmatter.timelineLabel).toBeTruthy()
    expect(content).toContain('PT PMA')
  })

  it('loads ID content with frontmatter', async () => {
    const { frontmatter } = await loadServiceMdx('pt-pma-setup', 'id')

    expect(frontmatter.title).toBeTruthy()
  })

  it('throws on unknown slug', async () => {
    await expect(loadServiceMdx('nope', 'en')).rejects.toThrow(/unknown service slug/i)
  })
})
