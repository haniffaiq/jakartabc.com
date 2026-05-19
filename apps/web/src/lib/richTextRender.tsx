import * as React from 'react'

import { DisplayHeading, Eyebrow } from '@jakartabc/ui'

type LexicalNode = {
  type?: string
  tag?: 'h2' | 'h3'
  text?: string
  children?: LexicalNode[]
  fields?: Record<string, unknown>
}

type Regulation = {
  id: string | number
  code: string
  url: string
}

export function RichTextRender({
  content,
  regulations,
}: {
  content: { root: { children: LexicalNode[] } }
  regulations: Regulation[]
}) {
  const lookupRegulation = (id: string | number | undefined) => {
    if (id === undefined) return undefined
    return regulations.find((regulation) => regulation.id === id)
  }

  function renderNode(node: LexicalNode, index: number): React.ReactNode {
    if (node.type === 'paragraph') {
      return (
        <p key={index} className="mt-6 max-w-prose text-body-md leading-relaxed text-ink-700">
          {(node.children ?? []).map(renderInline)}
        </p>
      )
    }

    if (node.type === 'heading') {
      const tag = node.tag === 'h3' ? 'h3' : 'h2'

      return (
        <DisplayHeading key={index} as={tag} size="md" className="mt-16">
          {(node.children ?? []).map(renderInline)}
        </DisplayHeading>
      )
    }

    if (node.type === 'block') {
      const fields = node.fields ?? {}

      if (fields.blockType === 'pullQuote') {
        return (
          <figure key={index} className="my-12 max-w-prose">
            <blockquote className="font-display text-display-md leading-[1.2] text-ink-900">
              {String(fields.quote ?? '')}
            </blockquote>
            {fields.attribution ? (
              <figcaption className="mt-4 text-body-sm text-ink-700">
                — {String(fields.attribution)}
              </figcaption>
            ) : null}
          </figure>
        )
      }

      if (fields.blockType === 'dropCap') {
        return <span key={index} data-dropcap aria-hidden />
      }

      if (fields.blockType === 'regulationCite') {
        const relation = fields.regulation
        const regulationId =
          typeof relation === 'object' && relation !== null && 'id' in relation
            ? (relation.id as string | number | undefined)
            : (relation as string | number | undefined)
        const regulation = lookupRegulation(regulationId)

        if (!regulation) return null

        if (fields.inline) {
          return (
            <a
              key={index}
              href={regulation.url}
              className="text-ochre-700 underline-offset-4 hover:underline"
            >
              {regulation.code}
            </a>
          )
        }

        return (
          <aside key={index} className="my-8 border-l-2 border-ochre-600 pl-6">
            <Eyebrow>Regulation</Eyebrow>
            <p className="mt-2">
              <a href={regulation.url} className="text-ochre-700 underline underline-offset-4">
                {regulation.code}
              </a>
            </p>
          </aside>
        )
      }
    }

    return null
  }

  function renderInline(node: LexicalNode, index: number): React.ReactNode {
    if (node.type === 'text') return <React.Fragment key={index}>{node.text}</React.Fragment>

    if (node.type === 'link') {
      return (
        <a
          key={index}
          href={String(node.fields?.url ?? '#')}
          className="text-ochre-700 underline-offset-4 hover:underline"
        >
          {(node.children ?? []).map(renderInline)}
        </a>
      )
    }

    return (node.children ?? []).map(renderInline)
  }

  return <>{content.root.children.map(renderNode)}</>
}
