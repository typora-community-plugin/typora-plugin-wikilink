import { app, Component, decorate, fs, html, Notice, path, WorkspaceLeaf, WorkspaceView } from "@typora-community-plugin/core"
import { editor } from "typora"
import type WikilinkPlugin from "../main"
import { isWikiLink, parseWikiLink } from "../utils"


let viewId = 0

const OPEN_FLOATING_LEAF = 'core.workspace.floating-split:open-leaf'

export class FloatingView extends Component {

  private isCtrlShiftPressed = false
  private lastPreviewFile = ''
  private lastPreviewTime = 0
  private lastMouseX = 0
  private lastMouseY = 0

  constructor(private plugin: WikilinkPlugin) {
    super()

    plugin.register(
      plugin.settings.onChange('useFloatingView', (_, isEnabled) => {
        isEnabled
          ? this.load()
          : this.unload()
      }))
  }

  load() {
    if (!this.plugin.settings.get('useFloatingView')) return
    super.load()
  }

  onload() {
    this.register(
      app.viewManager.registerView(WikilinkPreviewView.type, leaf =>
        new WikilinkPreviewView(leaf, this.plugin)))

    this.registerDomEvent(document, 'mousedown', this.onMousedown, { capture: true })
    this.registerDomEvent(document, 'click', this.onClick, { capture: true })

    this.register(
      decorate(editor, 'tryOpenLink', fn => ($a: JQuery, param1?: boolean) => {
        if (this.isCtrlShiftPressed && isWikilinkAnchor($a) && this.preview($a))
          return
        return fn($a, param1)
      }))
  }

  onunload() {
    this.closeAll()
  }

  private closeAll() {
    app.workspace.floatingSplit
      .filterLeaves(leaf => leaf.viewType === WikilinkPreviewView.type)
      .forEach(leaf => leaf.detach())
  }

  private onMousedown = (e: MouseEvent) => {
    this.isCtrlShiftPressed = (e.ctrlKey || e.metaKey) && e.shiftKey
    if (e.button === 0) {
      this.lastMouseX = e.clientX
      this.lastMouseY = e.clientY
    }

    const target = e.target
    if (target instanceof Element) {
      if (target.closest('.typ-workspace-floating')) return
      if (this.isCtrlShiftPressed && isWikilinkAnchor($(target).closest('a')))
        e.preventDefault()
    }
    this.closeAll()
  }

  private onClick = (e: MouseEvent) => {
    if (!((e.ctrlKey || e.metaKey) && e.shiftKey)) return
    if (!(e.target instanceof Element)) return

    const $a = $(e.target).closest('a')
    if (!isWikilinkAnchor($a)) return
    if (!this.preview($a)) return

    e.preventDefault()
    e.stopPropagation()
  }

  private preview($a: JQuery) {
    if (!app.commands.commandMap[OPEN_FLOATING_LEAF]) return false

    const { file } = parseWikiLink($a.text())
    if (!file) return false

    const now = Date.now()
    if (this.lastPreviewFile === file && now - this.lastPreviewTime < 500)
      return true
    this.lastPreviewFile = file
    this.lastPreviewTime = now

    const relpath = this.plugin.cacher.match(file)
    if (!relpath) {
      new Notice(this.plugin.i18n.t.notSuchFile + file)
      return true
    }

    this.openFloatingView(path.join(app.vault.path, relpath))
    return true
  }

  private openFloatingView(filepath: string) {
    const leaf = app.workspace.createLeaf({
      type: WikilinkPreviewView.type,
      state: {
        path: `typ://${WikilinkPreviewView.type}/${++viewId}/${path.basename(filepath).replace(/\.(md|markdown)$/i, '')}`,
        theme: 'window',
        resizable: true,
        draggable: true,
        onClose: () => leaf.detach(),
        filepath,
        x: this.lastMouseX,
        y: this.lastMouseY,
      },
    })

    app.commands.run(OPEN_FLOATING_LEAF, [leaf])
  }
}


function isWikilinkAnchor($a: JQuery) {
  return $a.length > 0 && !$a.attr('href') && isWikiLink($a.text())
}


class WikilinkPreviewView extends WorkspaceView {

  static type = 'wikilink.floating-preview'

  containerEl = html`
    <div class="wikilink-preview">
      <div class="wikilink-preview__content"></div>
    </div>`

  constructor(leaf: WorkspaceLeaf, private plugin: WikilinkPlugin) {
    super(leaf)
  }

  onload() {
    document.body.append(this.containerEl)

    const { x, y } = this.leaf.state
    this.position(x, y, 480, 360)

    const contentEl = this.containerEl.querySelector('.wikilink-preview__content') as HTMLElement
    const filepath = this.leaf.state.filepath as string

    fs.readText(filepath)
      .then(md => {
        if (!this._loaded) return
        this.render(md, contentEl)
        requestAnimationFrame(() => this.position(x, y))
      })
      .catch(() => {
        if (this._loaded) new Notice(this.plugin.i18n.t.notSuchFile + path.basename(filepath))
      })
  }

  onunload() {
    this.containerEl.remove()
  }

  private position(x: number, y: number, estW = 0, estH = 0) {
    const w = this.containerEl.offsetWidth || estW
    const h = this.containerEl.offsetHeight || estH
    const margin = 8
    x = Math.min(Math.max(margin, x), window.innerWidth - w - margin)
    y = Math.min(Math.max(margin, y), window.innerHeight - h - margin)
    if (x < margin) x = margin
    if (y < margin) y = margin
    this.containerEl.style.left = `${x}px`
    this.containerEl.style.top = `${y}px`
    this.containerEl.style.right = 'auto'
    this.containerEl.style.bottom = 'auto'
  }

  private render(md: string, targetEl: HTMLElement) {
    try {
      app.features.markdownRenderer.renderTo(md, targetEl)
    }
    catch {
      targetEl.textContent = md
    }
  }
}
