export function isWikiLink(text: string) {
  return text.startsWith('[[') && text.endsWith(']]')
}
