
type FileRecord = { key: string, path: string }

export class FileCache {

  db: FileRecord[] = []

  constructor() {
  }

  private findIndex(filePath: string) {
    const key = normalizePath(filePath)
    return this.db.findIndex(o => o.key.startsWith(key))
  }

  has(filePath: string) {
    const key = normalizePath(filePath)
    return !!this.db.find(o => o.key.startsWith(key))
  }

  match(partialFilePath: string) {
    const key = normalizePath(partialFilePath)
    return this.db.find(o => o.key.startsWith(key))?.path
  }

  add(filePath: string) {
    return this.db.push({
      key: normalizePath(filePath),
      path: filePath,
    })
  }

  bulkAdd(files: string[]) {
    return this.db.push(
      ...files.map(filePath => ({
        key: normalizePath(filePath),
        path: filePath,
      })))
  }

  remove(filePath: string) {
    const i = this.findIndex(filePath)
    if (i !== -1) {
      this.db.slice(i, 1)
    }
  }

  clear() {
    return this.db = []
  }
}


function normalizePath(filePath: string) {
  return filePath
    .replace(/(?:\.textbundle[\\\/]text)?\.(?:md|markdown)$/, '')
    .split(/[\\\/]/).reverse().join('/') + '/'
}
