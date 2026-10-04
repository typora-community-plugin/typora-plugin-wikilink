import { Component } from "@typora-community-plugin/core"
import { editor, isInputComponent } from "typora"
import type WikilinkPlugin from "src/main"


export class WikilinkStyleToggler extends Component {

  constructor(private plugin: WikilinkPlugin) {
    super()
  }

  onload() {
    // feat: wrap/unwrap text with `[[` and `]]`
    this.plugin.registerCommand({
      id: 'toggle-style',
      title: this.plugin.i18n.t.commandToggle,
      scope: 'editor',
      hotkey: 'Alt+Ctrl+K',
      callback: () => this.toggleWikilinkStyle(),
    })
  }

  private toggleWikilinkStyle() {
    if (isInputComponent(document.activeElement)) return

    const range = editor.selection.getRangy()
    if (range.collapsed) editor.selection.selectWord()
    this.includeBrackets()

    const selectedText = document.getSelection()?.toString() ?? ''
    if (this.isInWikilink() || selectedText.startsWith('[[')) {
      editor.UserOp.pasteHandler(editor, selectedText.replace(/^\[\[|\]\]$/g, ''), false)
    }
    else {
      editor.UserOp.pasteHandler(editor, `[[${selectedText}]]`, true)
    }
  }

  private includeBrackets() {
    const sel = document.getSelection()
    if (!sel || sel.rangeCount === 0) return
    const range = sel.getRangeAt(0)

    const startText = range.startContainer.nodeValue
    if (typeof startText === 'string' && startText.slice(range.startOffset - 2, range.startOffset) === '[[')
      range.setStart(range.startContainer, range.startOffset - 2)

    const endText = range.endContainer.nodeValue
    if (typeof endText === 'string' && endText.slice(range.endOffset, range.endOffset + 2) === ']]')
      range.setEnd(range.endContainer, range.endOffset + 2)

    sel.removeAllRanges()
    sel.addRange(range)
  }

  private isInWikilink() {
    let el: Node | null = document.getSelection()?.anchorNode ?? null
    while (el) {
      const classList = (el as Element).classList
      if (classList?.contains('typ-wikilink')) return true
      el = el.parentNode
    }
    return false
  }
}
