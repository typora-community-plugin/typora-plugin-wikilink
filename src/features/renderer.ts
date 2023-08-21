import { Component } from "@typora-community-plugin/core"
import type WikilinkPlugin from "src/main"


export class WikilinkRenderer extends Component {

  constructor(private plugin: WikilinkPlugin) {
    super()
  }

  onload() {
    this.plugin.registerMarkdownPreProcessor({
      when: 'preload',
      type: 'mdtext',
      process: md =>
        md.replace(/(?<!\<a>)(\[\[[^\]]+\]\])(?!\<\/a>)/g, '<a>$1</a>')
          .replace(/(\^\w{6})(?=\n|$)/g, '<a name="$1">$1</a>')
    })
    this.plugin.registerMarkdownPreProcessor({
      when: 'presave',
      type: 'mdtext',
      process: md =>
        md.replace(/<a>(\[\[[^\]]+\]\])<\/a>/g, '$1')
          .replace(/<a name="(\^\w{6})">\1<\/a>/g, '$1')
    })
  }
}
