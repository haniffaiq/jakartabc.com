type LexicalNode = {
  text?: string
  children?: LexicalNode[]
}

type LexicalRoot = {
  root?: {
    children?: LexicalNode[]
  }
}

const WORDS_PER_MINUTE = 200

function flattenText(node: LexicalNode | undefined, accumulator: string[]): void {
  if (!node) return

  if (typeof node.text === 'string') {
    accumulator.push(node.text)
  }

  for (const child of node.children ?? []) {
    flattenText(child, accumulator)
  }
}

export function calcReadTime(body: LexicalRoot | null | undefined): number {
  const textParts: string[] = []

  for (const child of body?.root?.children ?? []) {
    flattenText(child, textParts)
  }

  const wordCount = textParts.join(' ').trim().split(/\s+/).filter(Boolean).length

  return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE))
}
