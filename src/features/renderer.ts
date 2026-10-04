import { Component, DecoratedTextPostprocessor } from "@typora-community-plugin/core"
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
        md.replace(/(!\[\[[^\]]+\]\])(?<!<p>)(?!<\/p>)/g, '<p>$1</p>')
          .replace(/(\^\w{6})(?=\n|$)/g, '<a name="$1">$1</a>')
    })
    this.plugin.registerMarkdownPreProcessor({
      when: 'presave',
      type: 'mdtext',
      process: md =>
        md.replace(/<a name="(\^\w{6})">\1<\/a>/g, '$1')
          .replace(/<p>(!\[\[[^\]]+\]\])<\/p>/g, '$1')
    })

    this.plugin.registerMarkdownPostProcessor(
      DecoratedTextPostprocessor.from({
        matches: [
          {
            regexp: /(?<!\!)\[\[[^\]]+\]\]/g,
            classname: 'typ-wikilink',
            onClick: (event, el) => {
              if (!(event.ctrlKey || event.metaKey)) return
              event.preventDefault()
              event.stopPropagation()
              const wikiLink = el.textContent ?? ''
              if (event.shiftKey && this.plugin.preview(wikiLink)) return
              this.plugin.open(wikiLink)
            },
          },
        ],
      })
    )
  }
}
