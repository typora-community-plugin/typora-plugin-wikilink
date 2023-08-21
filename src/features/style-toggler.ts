import { Component } from "@typora-community-plugin/core"
import { editor, isInputComponent } from "typora"
import type WikilinkPlugin from "src/main"
import { isWikiLink } from "src/utils"


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
      callback: toggleWikilink,
    })
  }
}

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

function isWikiLinkEl(el: HTMLElement | null) {
  return el && el.tagName === 'A' && isWikiLink(el.innerText)
}
