import './style.scss'
import * as glob from 'glob'
import { Notice, path, Plugin, PluginSettings, decorate } from '@typora-community-plugin/core'
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


    this.cacheAllFiles()

    this.register(
      decorate.afterCall(editor.quickOpenPanel, 'addInitFiles', ([paths]) => {
        const prefixLen = this.app.vault.path.length
        this.cache.bulkAdd(paths.map(p => p.slice(prefixLen + 1)))
      }))

    this.register(
      decorate.afterCall(editor.quickOpenPanel, 'removeInitFiles', ([path]) => {
        const prefixLen = this.app.vault.path.length
        this.cache.remove(path.slice(prefixLen + 1))
      }))

    this.cache.clear()

    this.register(
      this.app.vault.on('mounted', () => {
        this.cache.clear()
        this.cacheAllFiles()
      }))


    // feat: support open wikilink
    this.register(
      decorate(editor, 'tryOpenLink', fn => ($a, param1) => {
        if (!$a.attr('href')) {
          this.open($a.text())
          return
        }

        return fn($a, param1)
      }))
  }

  private cacheAllFiles() {
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
      new Notice(this.i18n.t.notWikilink)
      return
    }

    // handle: displayName
    wikiLink = wikiLink.slice(2, -2).split('|')[0].trim()

    const [file, anchor] = wikiLink.split('#')!

    // handle: fileName
    if (file) {
      const filepath = this.cache.match(file)
      if (filepath) {
        editor.library.openFile(path.join(this.app.vault.path, filepath))
      }
      else {
        new Notice(this.i18n.t.notSuchFile + file)
      }
    }

    // handle: anchor
    setTimeout(() => this.app.openLink('#' + anchor), 500)
  }
}
