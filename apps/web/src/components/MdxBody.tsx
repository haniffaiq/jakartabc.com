import type { ReactNode } from 'react'

type Block =
  | { kind: 'heading'; level: 2 | 3; id?: string; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'paragraph'; text: string }

function parseInline(text: string): ReactNode {
  const match = text.match(/^(.*?)<strong>(.*?)<\/strong>(.*)$/)
  if (!match) return text

  return (
    <>
      {match[1]}
      <strong className="font-medium text-ink-900">{match[2]}</strong>
      {match[3] ? parseInline(match[3]) : null}
    </>
  )
}

function parseBlocks(source: string) {
  const blocks: Block[] = []
  const lines = source.split('\n')
  let index = 0

  while (index < lines.length) {
    const line = lines[index]?.trim() ?? ''
    if (!line) {
      index += 1
      continue
    }

    const heading = line.match(/^<h([23])(?: id="([^"]+)")?>(.*?)<\/h[23]>$/)
    if (heading?.[1] && heading[3]) {
      blocks.push({
        kind: 'heading',
        level: Number(heading[1]) as 2 | 3,
        id: heading[2],
        text: heading[3],
      })
      index += 1
      continue
    }

    if (line.startsWith('- ')) {
      const items: string[] = []
      while (lines[index]?.trim().startsWith('- ')) {
        items.push(lines[index]?.trim().slice(2) ?? '')
        index += 1
      }
      blocks.push({ kind: 'list', ordered: false, items })
      continue
    }

    const paragraph: string[] = []
    while (index < lines.length) {
      const current = lines[index]?.trim() ?? ''
      if (!current || current.startsWith('- ') || current.startsWith('<h2') || current.startsWith('<h3')) {
        break
      }
      paragraph.push(current)
      index += 1
    }
    blocks.push({ kind: 'paragraph', text: paragraph.join(' ') })
  }

  return blocks
}

export function MdxBody({ source }: { source: string }) {
  return (
    <div>
      {parseBlocks(source).map((block, index) => {
        if (block.kind === 'heading') {
          if (block.level === 2) {
            return (
              <h2
                key={index}
                id={block.id}
                className="mt-64 scroll-mt-24 font-display text-display-md text-ink-900"
              >
                {block.text}
              </h2>
            )
          }

          return (
            <h3 key={index} id={block.id} className="mt-48 font-body text-heading-lg text-ink-900">
              {block.text}
            </h3>
          )
        }

        if (block.kind === 'list') {
          const List = block.ordered ? 'ol' : 'ul'
          return (
            <List
              key={index}
              className="mt-24 max-w-reading list-disc space-y-8 pl-24 text-body-md text-ink-700"
            >
              {block.items.map((item) => (
                <li key={item}>{parseInline(item)}</li>
              ))}
            </List>
          )
        }

        return (
          <p key={index} className="mt-24 max-w-reading text-body-md leading-relaxed text-ink-700">
            {parseInline(block.text)}
          </p>
        )
      })}
    </div>
  )
}
