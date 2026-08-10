import * as React from 'react'
import type {
  SerializedEditorState,
  SerializedLexicalNode,
} from '@payloadcms/richtext-lexical/lexical'
import {
  RichText,
  type JSXConverterArgs,
  type JSXConverters,
  type JSXConvertersFunction,
} from '@payloadcms/richtext-lexical/react'

import { DisplayHeading, Eyebrow } from '@jakartabc/ui'

import { safeHref } from './url/safe-url'

type Regulation = {
  id: string | number
  code: string
  url: string
}

type UnknownRecord = Record<string, unknown>
type ConverterArgs = JSXConverterArgs<SerializedLexicalNode & UnknownRecord>

const CONTENT_SLUG_MAX_LENGTH = 128
const CONTENT_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function positiveNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined
}

function UnknownRichTextNode({ description }: { description: string }) {
  if (process.env.NODE_ENV !== 'production') {
    throw new Error(`Unsupported rich-text node: ${description}`)
  }

  return null
}

function nodeDescription(node: UnknownRecord): string {
  if (node.type === 'block' && isRecord(node.fields)) {
    return `block:${stringValue(node.fields.blockType) ?? 'unknown'}`
  }

  if (node.type === 'inlineBlock' && isRecord(node.fields)) {
    return `inlineBlock:${stringValue(node.fields.blockType) ?? 'unknown'}`
  }

  return stringValue(node.type) ?? 'unknown'
}

function internalDocumentHref(fields: UnknownRecord): string | null {
  const doc = isRecord(fields.doc) ? fields.doc : null
  if (!doc || !isRecord(doc.value)) return null

  const basePath =
    doc.relationTo === 'insights' ? '/insights' : doc.relationTo === 'services' ? '/services' : null
  const slug = stringValue(doc.value.slug)

  if (!basePath || !slug || slug.length > CONTENT_SLUG_MAX_LENGTH || !CONTENT_SLUG.test(slug)) {
    return null
  }

  return safeHref(`${basePath}/${slug}`)
}

function linkConverter({ node, nodesToJSX }: ConverterArgs): React.ReactNode {
  const fields = isRecord(node.fields) ? node.fields : {}
  const children = nodesToJSX({ nodes: Array.isArray(node.children) ? node.children : [] })
  const href =
    fields.linkType === 'internal'
      ? internalDocumentHref(fields)
      : fields.linkType === 'custom' || node.type === 'autolink'
        ? safeHref(fields.url)
        : null

  if (!href) return <>{children}</>

  const newTab = fields.newTab === true
  return (
    <a
      href={href}
      className="text-ochre-700 underline-offset-4 hover:underline"
      rel={newTab ? 'noopener noreferrer' : undefined}
      target={newTab ? '_blank' : undefined}
    >
      {children}
    </a>
  )
}

function uploadConverter({ node }: ConverterArgs): React.ReactNode {
  const value = isRecord(node.value) ? node.value : null
  const fields = isRecord(node.fields) ? node.fields : {}
  if (!value) return null

  const alt = stringValue(fields.alt) ?? stringValue(value.alt) ?? ''
  const filename = stringValue(value.filename) ?? alt
  const href = safeHref(value.url)
  const mimeType = stringValue(value.mimeType)

  if (!href) {
    return filename ? <span data-richtext-upload>{filename}</span> : null
  }

  if (!mimeType?.startsWith('image/')) {
    return (
      <a href={href} className="text-ochre-700 underline-offset-4 hover:underline" rel="noopener">
        {filename ?? href}
      </a>
    )
  }

  const sources = isRecord(value.sizes)
    ? Object.entries(value.sizes).flatMap(([size, candidate]) => {
        if (!isRecord(candidate)) return []

        const sourceURL = safeHref(candidate.url)
        const width = positiveNumber(candidate.width)
        const sourceType = stringValue(candidate.mimeType)
        if (!sourceURL || !width || !sourceType?.startsWith('image/')) return []

        return [
          <source
            key={size}
            media={`(max-width: ${width}px)`}
            srcSet={sourceURL}
            type={sourceType}
          />,
        ]
      })
    : []

  const image = (
    // eslint-disable-next-line @next/next/no-img-element -- Payload media can omit dimensions and uses runtime URLs.
    <img
      alt={alt}
      height={positiveNumber(value.height)}
      src={href}
      width={positiveNumber(value.width)}
    />
  )

  return sources.length > 0 ? (
    <picture>
      {sources}
      {image}
    </picture>
  ) : (
    image
  )
}

function relationshipConverter({ node }: ConverterArgs): React.ReactNode {
  const value = node.value
  const relationTo = stringValue(node.relationTo) ?? 'unknown'

  if (!isRecord(value)) {
    const label = typeof value === 'string' || typeof value === 'number' ? String(value) : null
    return label ? <span data-richtext-relationship={relationTo}>{label}</span> : null
  }

  const label =
    stringValue(value.title) ??
    stringValue(value.name) ??
    stringValue(value.code) ??
    stringValue(value.slug) ??
    (typeof value.id === 'string' || typeof value.id === 'number' ? String(value.id) : null)
  if (!label) return null

  const href = safeHref(value.url)
  if (!href) return <span data-richtext-relationship={relationTo}>{label}</span>

  return (
    <a
      href={href}
      className="text-ochre-700 underline-offset-4 hover:underline"
      data-richtext-relationship={relationTo}
    >
      {label}
    </a>
  )
}

function createConverters(regulations: Regulation[]): JSXConvertersFunction {
  const lookupRegulation = (id: unknown) =>
    typeof id === 'string' || typeof id === 'number'
      ? regulations.find((regulation) => regulation.id === id)
      : undefined

  return ({ defaultConverters }) =>
    ({
      ...defaultConverters,
      paragraph: ({ node, nodesToJSX }: ConverterArgs) => {
        const children = nodesToJSX({ nodes: Array.isArray(node.children) ? node.children : [] })
        return (
          <p className="mt-6 max-w-prose text-body-md leading-relaxed text-ink-700">
            {children.length > 0 ? children : <br />}
          </p>
        )
      },
      heading: ({ node, nodesToJSX }: ConverterArgs) => {
        const children = nodesToJSX({
          nodes: Array.isArray(node.children) ? node.children : [],
        })

        if (node.tag === 'h2' || node.tag === 'h3') {
          return (
            <DisplayHeading as={node.tag} size="md" className="mt-16">
              {children}
            </DisplayHeading>
          )
        }

        if (node.tag === 'h1') {
          return (
            <h1 className="mt-16 text-balance font-display text-display-lg font-normal leading-[1.1] text-ink-900">
              {children}
            </h1>
          )
        }

        if (node.tag === 'h4') {
          return (
            <h4 className="mt-12 text-balance font-display text-heading-lg font-medium text-ink-900">
              {children}
            </h4>
          )
        }

        if (node.tag === 'h5') {
          return (
            <h5 className="mt-12 text-balance font-display text-heading-md font-medium text-ink-900">
              {children}
            </h5>
          )
        }

        if (node.tag === 'h6') {
          return (
            <h6 className="mt-12 text-balance font-display text-body-lg font-medium text-ink-900">
              {children}
            </h6>
          )
        }

        return <UnknownRichTextNode description={`heading:${String(node.tag ?? 'unknown')}`} />
      },
      autolink: linkConverter,
      link: linkConverter,
      relationship: relationshipConverter,
      upload: uploadConverter,
      blocks: {
        dropCap: ({ node }: ConverterArgs) =>
          isRecord(node.fields) && node.fields.enabled === false ? null : (
            <span data-dropcap aria-hidden />
          ),
        pullQuote: ({ node }: ConverterArgs) => {
          const fields = isRecord(node.fields) ? node.fields : {}
          const quote = stringValue(fields.quote) ?? ''
          const attribution = stringValue(fields.attribution)

          return (
            <figure className="my-12 max-w-prose">
              <blockquote className="font-display text-display-md leading-[1.2] text-ink-900">
                {quote}
              </blockquote>
              {attribution ? (
                <figcaption className="mt-4 text-body-sm text-ink-700">— {attribution}</figcaption>
              ) : null}
            </figure>
          )
        },
        regulationCite: ({ node }: ConverterArgs) => {
          const fields = isRecord(node.fields) ? node.fields : {}
          const relation = fields.regulation
          const regulationId = isRecord(relation) ? relation.id : relation
          const regulation = lookupRegulation(regulationId)
          if (!regulation) return null

          const href = safeHref(regulation.url)
          const citation = href ? (
            <a href={href} className="text-ochre-700 underline-offset-4 hover:underline">
              {regulation.code}
            </a>
          ) : (
            <span className="text-ochre-700">{regulation.code}</span>
          )

          if (fields.inline === true) return citation

          return (
            <aside className="my-8 border-l-2 border-ochre-600 pl-6">
              <Eyebrow>Regulation</Eyebrow>
              <p className="mt-2">{citation}</p>
            </aside>
          )
        },
      },
      unknown: ({ node }: ConverterArgs) => (
        <UnknownRichTextNode description={nodeDescription(node)} />
      ),
    }) as JSXConverters
}

export function RichTextRender({
  content,
  regulations,
}: {
  content: SerializedEditorState<SerializedLexicalNode>
  regulations: Regulation[]
}) {
  return <RichText converters={createConverters(regulations)} data={content} disableContainer />
}
