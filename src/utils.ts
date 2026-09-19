export function isWikiLink(text: string) {
  return text.startsWith('[[') && text.endsWith(']]')
}

export function parseWikiLink(text: string) {
  const [file, anchor] = text.slice(2, -2).split('|')[0].trim().split('#')
  return { file, anchor }
}

const FENCE_RE = /^\s*(`{3,}|~{3,})/
const HEADING_RE = /^(#{1,6})\s+(.+?)(?:\s+#+)?\s*$/

/**
 * Extract the section of a Markdown document under the heading `anchor`.
 * Returns the heading line and everything until the next heading of the same
 * or higher level (including its subsections), or `undefined` if not found.
 * Headings inside fenced code blocks are ignored.
 */
export function extractSection(md: string, anchor: string): string | undefined {
  const target = anchor.trim().toLowerCase()
  if (!target) return undefined

  const lines = md.split(/\r?\n/)
  let fence: string | null = null
  let start = -1
  let level = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    const fenceMatch = line.match(FENCE_RE)
    if (fenceMatch) {
      const marker = fenceMatch[1][0]
      if (fence === null) fence = marker
      else if (fence === marker) fence = null
      continue
    }
    if (fence !== null) continue

    const heading = line.match(HEADING_RE)
    if (!heading) continue

    if (start === -1) {
      if (heading[2].trim().toLowerCase() === target) {
        start = i
        level = heading[1].length
      }
      continue
    }

    if (heading[1].length <= level)
      return lines.slice(start, i).join('\n')
  }

  return start === -1 ? undefined : lines.slice(start).join('\n')
}
