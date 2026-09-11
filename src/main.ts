import './style.scss'
import { Notice, path, Plugin, PluginSettings, decorate, I18n } from '@typora-community-plugin/core'
import { editor } from 'typora'
import { FileCache } from './file-cache'
import { WikilinkSettingTab } from './setting-tab'
import { WikilinkRenderer } from './features/renderer'
import { WikilinkStyleToggler } from './features/style-toggler'
import { UseSuggest } from './features/use-suggest'
import { UseInFileExplorer } from './features/use-in-file-explorer'
import { FloatingView } from './features/floating-view'
import { isWikiLink, parseWikiLink } from './utils'
import Locale from './locales/lang.en.json'


interface WikilinkSettings {
  useSuggest: boolean
  useFloatingView: boolean
  useInFileExplorer: boolean
}

const DEFAULT_SETTINGS: WikilinkSettings = {
  useSuggest: false,
  useFloatingView: false,
  useInFileExplorer: false,
}

export default class WikilinkPlugin extends Plugin<WikilinkSettings> {

  i18n = new I18n<typeof Locale>({
    localePath: path.join(this.manifest.dir!, 'locales'),
  })

  cacher = new FileCache()

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
    this.addChild(new FloatingView(this))

    this.registerSettingTab(new WikilinkSettingTab(this))

    // handle: update all
    if (this.app.internalPlugins.enabledPlugins["internal.metadata"]) {
      this.register(
        this.app.metadata.on('index:done', () => {
          this.cacher.clear()
          this.cacher.startCache()
        }))
    }
    else {
      this.cacher.clear()
      this.cacher.startCache()

      this.register(
        this.app.vault.on('mounted', () => {
          this.cacher.clear()
          this.cacher.startCache()
        }))
    }

    // handle: update part
    this.register(
      decorate.afterCall(editor.quickOpenPanel, 'addInitFiles', ([paths]) => {
        const prefixLen = this.app.vault.path.length
        this.cacher.bulkAdd(paths.map(p => p.slice(prefixLen + 1)))
      }))

    this.register(
      decorate.afterCall(editor.quickOpenPanel, 'removeInitFiles', ([path]) => {
        const prefixLen = this.app.vault.path.length
        this.cacher.remove(path.slice(prefixLen + 1))
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

  open(wikiLink: string) {
    if (!isWikiLink(wikiLink)) {
      new Notice(this.i18n.t.notWikilink)
      return
    }

    const { file, anchor } = parseWikiLink(wikiLink)

    // handle: fileName
    if (file) {
      const filepath = this.cacher.match(file)
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
