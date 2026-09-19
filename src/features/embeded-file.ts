import { app, Component, fs, HtmlPostProcessor, Notice, path } from "@typora-community-plugin/core"
import { editor } from "typora"
import type WikilinkPlugin from "src/main"
import { extractSection, parseWikiLink } from "src/utils"


/** 编辑器里 HTML block 的容器选择器 */
const HTMLBLOCK_CONTAINER_SELECTOR = '.md-htmlblock-container'
/** 渲染出的文件内容预览的类名 */
const EMBED_PREVIEW_CLASS = 'typ-wikilink-embed__preview'
/** dataset 键（DOM 属性为 data-wikilink-embed-source），用于幂等控制 */
const EMBED_SOURCE_ATTR = 'wikilinkEmbedSource'
/** 匹配整块内容恰为 `![[...]]` 的 HTML block */
const WIKILINK_EMBED_RE = /^!\[\[([^\]]+)\]\]$/

export class EmbededFile extends Component {

  constructor(private plugin: WikilinkPlugin) {
    super()

    plugin.register(
      plugin.settings.onChange('useEmbededFile', (_, isEnabled) => {
        isEnabled
          ? this.load()
          : this.unload()
      }))
  }

  load() {
    if (!this.plugin.settings.get('useEmbededFile')) return
    super.load()
  }

  onload() {
    const plugin = this.plugin

    plugin.registerMarkdownPostProcessor(
      HtmlPostProcessor.from({
        selector: HTMLBLOCK_CONTAINER_SELECTOR,
        process: el => {
          // 避免处理注入到预览里的 HTML block，防止递归
          if (el.closest('.' + EMBED_PREVIEW_CLASS)) return

          // 源内容固定为容器的直接子 <p>
          const sourceEl = el.querySelector<HTMLParagraphElement>(':scope > p')
          if (!sourceEl) return

          const src = (sourceEl.textContent ?? '').trim()

          // 已处理过（或正在处理）同样的源，跳过
          if (el.dataset[EMBED_SOURCE_ATTR] === src) return

          const matched = src.match(WIKILINK_EMBED_RE)
          if (!matched) return

          const { file, anchor } = parseWikiLink('[[' + matched[1] + ']]')
          if (!file) return

          const relpath = plugin.cacher.match(file)
          if (!relpath) {
            new Notice(plugin.i18n.t.notSuchFile + file)
            return
          }

          // 同步标记，防止异步读取期间被重复处理
          el.dataset[EMBED_SOURCE_ATTR] = src

          fs.readText(path.join(app.vault.path, relpath))
            .then(md => {
              if (!el.isConnected) return
              if (el.dataset[EMBED_SOURCE_ATTR] !== src) return

              const content = anchor ? (extractSection(md, anchor) ?? md) : md

              // 源文本隐藏，追加预览容器后渲染文件内容
              sourceEl.style.display = 'none'

              const previewEl = document.createElement('div')
              previewEl.className = EMBED_PREVIEW_CLASS
              el.append(previewEl)

              try {
                app.features.markdownRenderer.renderTo(content, previewEl)
              }
              catch {
                previewEl.textContent = content
              }
            })
            .catch(() => {
              if (el.isConnected && el.dataset[EMBED_SOURCE_ATTR] === src)
                delete el.dataset[EMBED_SOURCE_ATTR]
              new Notice(plugin.i18n.t.notSuchFile + file)
            })
        },
      }))

    // 开启后立刻对已打开文档生效，否则需等待下一次 edit
    if (editor.writingArea)
      app.features.markdownEditor.postProcessor.processAll()
  }

  onunload() {
    document.querySelectorAll<HTMLElement>('.' + EMBED_PREVIEW_CLASS).forEach(previewEl => {
      const container = previewEl.closest(HTMLBLOCK_CONTAINER_SELECTOR) as HTMLElement | null
      previewEl.remove()

      if (!container) return

      delete container.dataset[EMBED_SOURCE_ATTR]

      const sourceEl = container.querySelector<HTMLParagraphElement>(':scope > p')
      if (sourceEl) sourceEl.style.display = ''
    })
  }
}
