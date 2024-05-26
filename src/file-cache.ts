import { Events } from "@typora-community-plugin/core"


type FileCacheEvents = {
  'change'(): void
}

type FileRecord = { key: string, path: string }

export class FileCache extends Events<FileCacheEvents> {

  private map: Record<string, FileRecord> = {}
  private arr: FileRecord[] = []

  private findIndex(filePath: string) {
    const key = normalizePath(filePath)
    return this.arr.findIndex(o => o.key.startsWith(key))
  }

  has(filePath: string) {
    return !!this.match(filePath)
  }

  match(partialFilePath: string) {
    const key = normalizePath(partialFilePath)
    return this.arr.find(o => o.key.startsWith(key))?.path
  }

  matches(partialFilePath = '') {
    const key = partialFilePath
    return this.arr.filter(o => o.key.startsWith(key))
  }

  add(filePath: string, emitEvent = true) {
    const key = normalizePath(filePath)

    if (!this.map[key]) {
      const record = {
        key,
        path: filePath,
      }
      this.map[key] = record
      this.arr.push(record)

      emitEvent && this.emit('change')
      return true
    }

    return false
  }

  bulkAdd(files: string[]) {
    const count = files.map(filePath => this.add(filePath, false))
      .filter(isSuccess => isSuccess)
      .length

    this.emit('change')
    return count
  }

  remove(filePath: string) {
    const key = normalizePath(filePath)
    if (!this.map[key]) return

    delete this.map[key]

    const i = this.findIndex(filePath)
    this.arr.splice(i, 1)

    this.emit('change')
  }

  clear() {
    this.arr = []
    this.emit('change')
  }
}


function normalizePath(filePath: string) {
  return filePath
    .replace(/(?:\.textbundle[\\\/]text)?\.(?:md|markdown)$/, '')
    .split(/[\\\/]/).reverse().join('/') + '/'
}
