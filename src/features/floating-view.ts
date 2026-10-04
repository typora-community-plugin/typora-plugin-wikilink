import { app, Component, fs, html, Notice, path, WorkspaceLeaf, WorkspaceView } from "@typora-community-plugin/core"
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
      if (this.isCtrlShiftPressed && findWikilinkText(target))
        e.preventDefault()
    }
    this.closeAll()
  }

  tryPreview(wikiLink: string) {
    return this._loaded && this.preview(wikiLink)
  }

  private preview(wikiLink: string) {
    if (!app.commands.commandMap[OPEN_FLOATING_LEAF]) return false

    const { file } = parseWikiLink(wikiLink)
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


function findWikilinkText(target: Element): string | null {
  const el = target.closest('.typ-wikilink, a')
  if (!el) return null
  if (el instanceof HTMLAnchorElement && el.getAttribute('href')) return null
  const text = el.textContent ?? ''
  return isWikiLink(text) ? text : null
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
