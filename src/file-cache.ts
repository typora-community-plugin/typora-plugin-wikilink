import * as EventEmitter from "events"


type FileRecord = { key: string, path: string }

export class FileCache extends EventEmitter {

  private db: FileRecord[] = []

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

  matches(partialFilePath = '') {
    const key = partialFilePath
    return this.db.filter(o => o.key.startsWith(key))
  }

  add(filePath: string) {
    const res = this.db.push({
      key: normalizePath(filePath),
      path: filePath,
    })
    this.emit('change')
    return res
  }

  bulkAdd(files: string[]) {
    const res = this.db.push(
      ...files.map(filePath => ({
        key: normalizePath(filePath),
        path: filePath,
      })))
    this.emit('change')
    return res
  }

  remove(filePath: string) {
    const i = this.findIndex(filePath)
    if (i !== -1) {
      this.db.slice(i, 1)
      this.emit('change')
    }
  }

  clear() {
    this.db = []
    this.emit('change')
  }
}


function normalizePath(filePath: string) {
  return filePath
    .replace(/(?:\.textbundle[\\\/]text)?\.(?:md|markdown)$/, '')
    .split(/[\\\/]/).reverse().join('/') + '/'
}
