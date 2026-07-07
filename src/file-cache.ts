import { bridge, File, reqnode } from "typora"
import { app, Events, path } from "@typora-community-plugin/core"


type FileCacheEvents = {
  'change'(): void
}

type FileRecord = { key: string, path: string }

export class FileCache extends Events<FileCacheEvents> {

  private map: Record<string, FileRecord> = {}
  private arr: FileRecord[] = []

  startCache() {
    return Promise.resolve(Object.keys(app.metadata.cache))
      .then(files => files.length > 0
        ? files
        : (File.isNode
          ? listVaultFilesOnNode()
          : listVaultFilesOnDarwin()))
      .then(fallbackFiles => {
        this.bulkAdd(fallbackFiles)
        return fallbackFiles.length
      })
  }

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

function listVaultFilesOnNode(): Promise<string[]> {
  const glob = reqnode('fs-plus/node_modules/glob')
  return new Promise((resolve, reject) => {
    const pattern = `**/*.{md,markdown}`
    const opts = { cwd: app.vault.path, nodir: true }
    // @ts-ignore
    glob(pattern, opts, (err, files: string[]) => {
      if (err) return reject(err)
      resolve(files)
    })
  })
}

async function listVaultFilesOnDarwin() {
  const dirs = [app.vault.path]
  const files = []

  while (dirs.length) {
    const currentDir = dirs.pop()!
    const [subdirs, docs] = await listOnDarwin(currentDir)
    dirs.push(...subdirs)
    files.push(...docs.map(file => path.relative(app.vault.path, file)))
  }

  return files
}

function listOnDarwin(dirpath: string): Promise<[string[], string[]]> {
  return new Promise(resolve => {
    bridge.callHandler('library.listDocsUnder', dirpath, (file) => {
      resolve([
        file.subdir.map((file) => file.path),
        file.content.map((file) => file.path),
      ])
    })
  })
}
