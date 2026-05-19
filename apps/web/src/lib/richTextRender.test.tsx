import * as React from 'react'
import type { ComponentProps } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { RichTextRender } from './richTextRender'

type RichTextContent = ComponentProps<typeof RichTextRender>['content']

const body: RichTextContent = {
  root: {
    children: [
      { type: 'paragraph', children: [{ text: 'Hello world.', type: 'text' }] },
      { type: 'heading', tag: 'h2', children: [{ text: 'Heading', type: 'text' }] },
      {
        type: 'block',
        fields: { blockType: 'pullQuote', quote: 'Punchy quote.', attribution: 'Someone' },
      },
    ],
  },
}

describe('RichTextRender', () => {
  it('renders paragraphs, headings, and pullQuote', () => {
    render(<RichTextRender content={body} regulations={[]} />)

    expect(screen.getByText('Hello world.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Heading' })).toBeInTheDocument()
    expect(screen.getByText('Punchy quote.')).toBeInTheDocument()
    expect(screen.getByText(/Someone/)).toBeInTheDocument()
  })

  it('renders inline links and regulation citation blocks', () => {
    render(
      <RichTextRender
        content={
          {
            root: {
              children: [
                {
                  type: 'paragraph',
                  children: [
                    { text: 'Read ', type: 'text' },
                    {
                      type: 'link',
                      fields: { url: 'https://example.com/source' },
                      children: [{ text: 'the source', type: 'text' }],
                    },
                  ],
                },
                {
                  type: 'block',
                  fields: { blockType: 'regulationCite', regulation: 'bkpm-5' },
                },
                {
                  type: 'block',
                  fields: { blockType: 'dropCap' },
                },
              ],
            },
          } satisfies RichTextContent
        }
        regulations={[{ id: 'bkpm-5', code: 'BKPM Reg 5/2025', url: 'https://example.com/bkpm' }]}
      />,
    )

    expect(screen.getByRole('link', { name: 'the source' })).toHaveAttribute(
      'href',
      'https://example.com/source',
    )
    expect(screen.getByText('Regulation')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'BKPM Reg 5/2025' })).toHaveAttribute(
      'href',
      'https://example.com/bkpm',
    )
    expect(document.querySelector('[data-dropcap]')).toBeInTheDocument()
  })
})
