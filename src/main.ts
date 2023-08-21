import * as fs from 'fs'
import * as path from 'path'
import * as glob from 'glob'
import { Plugin, PluginSettings, decorate } from '@typora-community-plugin/core'
import { editor } from 'typora'
import { i18n } from './i18n'
import { FileCache } from './file-cache'
import { WikilinkSettingTab } from './setting-tab'
import { WikilinkRenderer } from './features/renderer'
import { WikilinkStyleToggler } from './features/style-toggler'
import { UseSuggest } from './features/use-suggest'
import { UseInFileExplorer } from './features/use-in-file-explorer'
import { isWikiLink } from './utils'


interface WikilinkSettings {
  useSuggest: boolean
  useInFileExplorer: boolean
}

const DEFAULT_SETTINGS: WikilinkSettings = {
  useSuggest: false,
  useInFileExplorer: false,
}

export default class WikilinkPlugin extends Plugin<WikilinkSettings> {

  i18n = i18n

  cache = new FileCache()

  async onload() {

    this.registerSettings(
      new PluginSettings(this.app, this.manifest, {
        version: 1,
      }))

    this.settings.setDefault(DEFAULT_SETTINGS)

    this.addChild(new WikilinkRenderer(this))
    this.addChild(new WikilinkStyleToggler(this))
    this.addChild(new UseSuggest(this.app, this))
    this.addChild(new UseInFileExplorer(this))

    this.registerSettingTab(new WikilinkSettingTab(this))

    // feat: support open wikilink
    this.cache.clear()
    this.cacheAllFilePath()

    this.register(
      this.app.vault.on('mounted', () => {
        this.cache.clear()
        this.cacheAllFilePath()
      }))

    this.register(
      decorate(editor, 'tryOpenLink', fn => ($a, param1) => {
        if (!$a.attr('href')) {
          this.open($a.text())
          return
        }

        return fn($a, param1)
      }))
  }

  private cacheAllFilePath() {
    return new Promise((resolve, reject) => {
      const pattern = `**/*{.textbundle/text,}.{md,markdown}`
      const opts = { cwd: this.app.vault.path, nodir: true }
      // @ts-ignore
      glob(pattern, opts, (err, files) => {
        if (err) return reject(err)
        this.cache.bulkAdd(files)
        resolve(files.length)
      })
    })
  }

  open(wikiLink: string) {
    if (!isWikiLink(wikiLink)) {
      this.app.workspace.notification.show(`wiki-link should be sourrounded by '[[' and ']]' !`)
      return
    }

    // handle: displayName
    wikiLink = wikiLink.slice(2, -2).split('|')[0].trim()

    const [file, anchor] = wikiLink.split('#')!

    // handle: fileName
    if (file) {
      this.resolveFilePath(file)
        .then(filePath => {
          filePath && editor.library.openFile(filePath)
        })
    }

    // handle: anchor
    setTimeout(() => this.app.openLink('#' + anchor), 500)
  }

  async resolveFilePath(fileName: string) {
    let filePath = this.cache.match(fileName)
    if (filePath) {
      try {
        const absFilePath = path.join(this.app.vault.path, filePath)
        fs.accessSync(absFilePath)
        return absFilePath
      } catch (error) {
        this.cache.remove(filePath)
      }
    }

    filePath = await this.searchFilePath(fileName)
    if (!filePath) {
      return
    }

    this.cache.add(filePath)
    return path.join(this.app.vault.path, filePath)
  }

  private searchFilePath(fileName: string): Promise<string | undefined> {
    const dirname = path.dirname(this.app.workspace.activeFile)
    const absFilePath = path.join(dirname, `${fileName}.md`)
    if (fs.existsSync(absFilePath)) {
      return Promise.resolve(this.relativeFromRoot(absFilePath))
    }

    return new Promise((resolve, reject) => {
      const pattern = `**/${fileName}{.textbundle/text,}.{md,markdown}`
      const opts = { cwd: this.app.vault.path, nodir: true }
      new glob.Glob(pattern, opts)
        .on('match', (file: string) => {
          resolve(file)
        })
        .on('end', (matches: string[]) => {
          if (matches.length === 0) {
            this.app.workspace.notification.show(this.i18n.t.notSuchFile + fileName)
            return reject()
          }
          resolve(matches[0])
        })
    })
  }

  private relativeFromRoot(filePath: string) {
    return path.relative(this.app.vault.path, filePath)
  }
}
