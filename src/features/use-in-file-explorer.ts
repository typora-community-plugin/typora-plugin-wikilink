import * as path from "path"
import { Component, decorate } from "@typora-community-plugin/core"
import { editor } from "typora"
import type WikilinkPlugin from "../main"


export class UseInFileExplorer extends Component {

  constructor(private plugin: WikilinkPlugin) {
    super()

    plugin.settings.get('useInFileExplorer')
      ? this.load()
      : this.unload()

    plugin.settings.onChange('useInFileExplorer', (_, isEnabled) => {
      isEnabled
        ? this.load()
        : this.unload()
    })
  }

  onload() {
    // feat: support wikilink-style file's shortcut in file explorer
    this.register(
      decorate(editor.library, 'openFile',
        fn => (file, callback) => {
          const filename = path.basename(file)
          if (filename.startsWith('[[') && filename.endsWith(']].md')) {
            this.plugin.open(filename.slice(0, -3))
            return
          }
          fn(file, callback)
        }))
  }
}
