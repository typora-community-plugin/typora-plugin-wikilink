import * as fs from 'fs'
import * as path from 'path'
import * as glob from 'glob'
import { type App, I18n, Plugin, type PluginManifest, decorate } from '@typora-community-plugin/core'
import type { DisposeFunc } from '@typora-community-plugin/core/typings/utils/types'
import { editor, isInputComponent } from 'typora'
import { FileCache } from './file-cache'
import { WikilinkSettingTab } from './setting-tab'
import { UseSuggest } from './features/suggest'


interface WikilinkSettings {
  useSuggest: boolean
  useInFileExplorer: boolean
}

const DEFAULT_SETTINGS: WikilinkSettings = {
  useSuggest: false,
  useInFileExplorer: false,
}

export default class WikilinkPlugin extends Plugin {

  i18n = new I18n({
    resources: {
      'en': {
        commandToggle: 'Toggle Focused/Selected Text Wikilink Style',
        notSuchFile: 'Can not found the file: ',
      },
      'zh-cn': {
        commandToggle: '切换 Wikilink 样式',
        notSuchFile: '找不到文件: ',
      },
    }
  })

  settings: WikilinkSettings

  cache = new FileCache()

  private _linkEl: HTMLAnchorElement

  _useSuggest: UseSuggest
  private _disposeWikilinkInFileExplorer: DisposeFunc

  constructor(app: App, manifest: PluginManifest) {
    super(app, manifest)

    this._useSuggest = new UseSuggest(this.app, this)
  }

  async onload() {

    await this.loadSettings()

    this.registerSettingTab(new WikilinkSettingTab(this))

    this._linkEl = document.createElement('a')
    this._linkEl.style.display = 'none'

    document.body.append(this._linkEl)

    // feat: parse wikilink
    this.registerMarkdownPreProcessor({
      when: 'preload',
      type: 'mdtext',
      process: md =>
        md.replace(/(?<!\<a>)(\[\[[^\]]+\]\])(?!\<\/a>)/g, '<a>$1</a>')
          .replace(/(\^\w{6})(?=\n|$)/g, '<a name="$1">$1</a>')
    })
    this.registerMarkdownPreProcessor({
      when: 'presave',
      type: 'mdtext',
      process: md =>
        md.replace(/<a>(\[\[[^\]]+\]\])<\/a>/g, '$1')
          .replace(/<a name="(\^\w{6})">\1<\/a>/g, '$1')
    })

    // feat: wrap/unwrap text with `[[` and `]]`
    this.registerCommand({
      id: 'toggle-style',
      title: this.i18n.t.commandToggle,
      scope: 'editor',
      hotkey: 'Alt+Ctrl+K',
      callback: toggleWikilink,
    })
    function toggleWikilink() {
      if (isInputComponent(document.activeElement)) return

      const selected = document.getSelection()!.anchorNode!.parentElement!.parentElement
      if (
        isWikiLinkEl(selected) ||
        isWikiLinkEl(selected!.children[1] as HTMLElement)
      ) {
        editor.selection.selectPhrase()
        const selectedText = document.getSelection()!.toString()
        const [, text] = selectedText.match(/<a>\[\[([^<]+)\]\]<\/a>/) ?? []
        editor.UserOp.pasteHandler(editor, text, false)
      }
      else {
        const range = editor.selection.getRangy()
        if (range.collapsed) editor.selection.selectWord()
        const selectedText = document.getSelection()!.toString()
        const html = `<a>[[${selectedText}]]</a>`
        editor.UserOp.pasteHandler(editor, html, true)
      }
    }

    // feat: support open wikilink
    this.cache.clear()
    this.cacheAllFilePath()

    this.register(
      this.app.vault.on('mounted', () =>
        this.cache = new FileCache()))

    this.register(
      decorate(editor, 'tryOpenLink', fn => ($a, param1) => {
        if (!$a.attr('href')) {
          this.open($a.text())
          return
        }

        return fn($a, param1)
      }))
  }

  onunload() {
    this._linkEl.remove()
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
    this.settings.useInFileExplorer
      ? this.enableWikilinkInFileExplorer()
      : this.disableWikilinkInFileExplorer()
  }

  async saveSettings() {
    await this.saveData(this.settings)
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
    setTimeout(() => this._toAnchor(anchor), 500)
  }

  private _toAnchor(anchor: string) {
    const tocItem = $(`#outline-content .outline-label:contains("${anchor}")`).get(0)

    if (tocItem) {
      tocItem.click()
    }
    else {
      this._linkEl.href = `#${anchor}`
      this._linkEl.click()
    }
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

  enableWikilinkInFileExplorer() {
    // feat: support wikilink-style file's shortcut in file explorer
    this.register(
      this._disposeWikilinkInFileExplorer = decorate(editor.library, 'openFile',
        fn => (file, callback) => {
          const filename = path.basename(file)
          if (filename.startsWith('[[') && filename.endsWith(']].md')) {
            this.open(filename.slice(0, -3))
            return
          }
          fn(file, callback)
        })
    )
  }

  disableWikilinkInFileExplorer() {
    this.unregister(
      this._disposeWikilinkInFileExplorer)
  }
}

function isWikiLinkEl(el: HTMLElement | null) {
  return el && el.tagName === 'A' && isWikiLink(el.innerText)
}

function isWikiLink(text: string) {
  return text.startsWith('[[') && text.endsWith(']]')
}

