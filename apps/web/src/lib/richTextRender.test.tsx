import * as React from 'react'
import type { ComponentProps } from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { RichTextRender } from './richTextRender'

type RichTextContent = ComponentProps<typeof RichTextRender>['content']
type FixtureNode = Record<string, unknown>

function editorState(children: FixtureNode[]): RichTextContent {
  return {
    root: {
      children,
      direction: null,
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  } as RichTextContent
}

const text = (value: string, format = 0): FixtureNode => ({
  detail: 0,
  format,
  mode: 'normal',
  style: '',
  text: value,
  type: 'text',
  version: 1,
})

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
})

describe('RichTextRender', () => {
  it('preserves project paragraph and heading semantics while rendering marks and breaks', () => {
    render(
      <RichTextRender
        content={editorState([
          {
            children: [
              text('Bold', 1),
              text(' italic', 2),
              { type: 'linebreak', version: 1 },
              text('underlined', 8),
            ],
            direction: null,
            format: '',
            indent: 0,
            type: 'paragraph',
            version: 1,
          },
          {
            children: [text('Section heading')],
            direction: null,
            format: '',
            indent: 0,
            tag: 'h2',
            type: 'heading',
            version: 1,
          },
        ])}
        regulations={[]}
      />,
    )

    const paragraph = screen.getByText('Bold').closest('p')
    expect(paragraph).toHaveClass(
      'mt-6',
      'max-w-prose',
      'text-body-md',
      'leading-relaxed',
      'text-ink-700',
    )
    expect(within(paragraph!).getByText('Bold').tagName).toBe('STRONG')
    expect(within(paragraph!).getByText('italic').tagName).toBe('EM')
    expect(within(paragraph!).getByText('underlined')).toHaveStyle('text-decoration: underline')
    expect(paragraph?.querySelector('br')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Section heading' })).toHaveClass('mt-16')
  })

  it('renders ordered, unordered, and nested lists plus blockquotes through Payload converters', () => {
    render(
      <RichTextRender
        content={editorState([
          {
            children: [
              {
                children: [
                  text('First item'),
                  {
                    children: [
                      {
                        children: [text('Nested item')],
                        direction: null,
                        format: '',
                        indent: 0,
                        type: 'listitem',
                        value: 1,
                        version: 1,
                      },
                    ],
                    direction: null,
                    format: '',
                    indent: 0,
                    listType: 'bullet',
                    start: 1,
                    tag: 'ul',
                    type: 'list',
                    version: 1,
                  },
                ],
                direction: null,
                format: '',
                indent: 0,
                type: 'listitem',
                value: 1,
                version: 1,
              },
            ],
            direction: null,
            format: '',
            indent: 0,
            listType: 'number',
            start: 1,
            tag: 'ol',
            type: 'list',
            version: 1,
          },
          {
            children: [text('Quoted guidance')],
            direction: null,
            format: '',
            indent: 0,
            type: 'quote',
            version: 1,
          },
        ])}
        regulations={[]}
      />,
    )

    const lists = screen.getAllByRole('list')
    expect(lists).toHaveLength(2)
    expect(lists[0]?.tagName).toBe('OL')
    expect(lists[1]?.tagName).toBe('UL')
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText('Quoted guidance').closest('blockquote')).toBeInTheDocument()
  })

  it('renders safe links and leaves unsafe-link text non-interactive', () => {
    render(
      <RichTextRender
        content={editorState([
          {
            children: [
              {
                children: [text('Safe source')],
                fields: {
                  linkType: 'custom',
                  newTab: true,
                  url: 'https://example.test/source',
                },
                type: 'link',
                version: 3,
              },
              text(' and '),
              {
                children: [text('Unsafe source')],
                fields: { linkType: 'custom', url: '%6a%61vascript:alert(1)' },
                type: 'link',
                version: 3,
              },
            ],
            direction: null,
            format: '',
            indent: 0,
            type: 'paragraph',
            version: 1,
          },
        ])}
        regulations={[]}
      />,
    )

    expect(screen.getByRole('link', { name: 'Safe source' })).toHaveAttribute(
      'href',
      'https://example.test/source',
    )
    expect(screen.getByRole('link', { name: 'Safe source' })).toHaveAttribute(
      'rel',
      'noopener noreferrer',
    )
    expect(screen.getByRole('link', { name: 'Safe source' })).toHaveAttribute('target', '_blank')
    expect(screen.getByRole('link', { name: 'Safe source' }).closest('p')).toHaveTextContent(
      'Unsafe source',
    )
    expect(screen.queryByRole('link', { name: 'Unsafe source' })).not.toBeInTheDocument()
  })

  it('renders safe uploads and populated relationships without activating unsafe URLs', () => {
    render(
      <RichTextRender
        content={editorState([
          {
            fields: { alt: 'Jakarta skyline' },
            relationTo: 'media',
            type: 'upload',
            value: {
              alt: 'Fallback alt',
              filename: 'skyline.webp',
              height: 400,
              mimeType: 'image/webp',
              url: '/media/skyline.webp',
              width: 800,
            },
            version: 1,
          },
          {
            relationTo: 'authors',
            type: 'relationship',
            value: {
              id: 7,
              name: 'Ayu Pratama',
              url: 'javascript:alert(1)',
            },
            version: 1,
          },
        ])}
        regulations={[]}
      />,
    )

    expect(screen.getByRole('img', { name: 'Jakarta skyline' })).toHaveAttribute(
      'src',
      '/media/skyline.webp',
    )
    expect(screen.getByText('Ayu Pratama')).toHaveAttribute('data-richtext-relationship', 'authors')
    expect(screen.queryByRole('link', { name: 'Ayu Pratama' })).not.toBeInTheDocument()
  })

  it('renders custom pullQuote, dropCap, and safe regulationCite blocks', () => {
    render(
      <RichTextRender
        content={editorState([
          {
            fields: {
              attribution: 'Someone',
              blockType: 'pullQuote',
              quote: 'Punchy quote.',
            },
            type: 'block',
            version: 2,
          },
          {
            fields: { blockType: 'dropCap', enabled: true },
            type: 'block',
            version: 2,
          },
          {
            fields: { blockType: 'regulationCite', regulation: 'bkpm-5' },
            type: 'block',
            version: 2,
          },
        ])}
        regulations={[{ id: 'bkpm-5', code: 'BKPM Reg 5/2025', url: 'https://example.test/bkpm' }]}
      />,
    )

    expect(screen.getByText('Punchy quote.').closest('figure')).toHaveClass('my-12', 'max-w-prose')
    expect(screen.getByText(/Someone/).tagName).toBe('FIGCAPTION')
    expect(document.querySelector('[data-dropcap]')).toBeInTheDocument()
    expect(screen.getByText('Regulation')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'BKPM Reg 5/2025' })).toHaveAttribute(
      'href',
      'https://example.test/bkpm',
    )
  })

  it('leaves an unsafe regulation URL visible but non-interactive', () => {
    render(
      <RichTextRender
        content={editorState([
          {
            fields: { blockType: 'regulationCite', inline: true, regulation: 'unsafe-reg' },
            type: 'block',
            version: 2,
          },
        ])}
        regulations={[{ id: 'unsafe-reg', code: 'Unsafe Regulation', url: 'data:text/html,x' }]}
      />,
    )

    expect(screen.getByText('Unsafe Regulation')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Unsafe Regulation' })).not.toBeInTheDocument()
  })

  it('throws visibly for an unknown node in test and development', () => {
    expect(() =>
      render(
        <RichTextRender
          content={editorState([{ type: 'mystery-node', version: 1 }])}
          regulations={[]}
        />,
      ),
    ).toThrow(/Unsupported rich-text node: mystery-node/)
  })

  it('drops an unknown node safely in production', () => {
    vi.stubEnv('NODE_ENV', 'production')

    const { container } = render(
      <RichTextRender
        content={editorState([{ type: 'mystery-node', version: 1 }])}
        regulations={[]}
      />,
    )

    expect(container).toBeEmptyDOMElement()
  })
})
