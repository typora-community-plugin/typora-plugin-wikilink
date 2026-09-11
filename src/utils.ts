export function isWikiLink(text: string) {
  return text.startsWith('[[') && text.endsWith(']]')
}

export function parseWikiLink(text: string) {
  const [file, anchor] = text.slice(2, -2).split('|')[0].trim().split('#')
  return { file, anchor }
}
