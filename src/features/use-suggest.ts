import { type App, Component, debounce, TextSuggest } from "@typora-community-plugin/core"
import type WikilinkPlugin from "../main"


export class UseSuggest extends Component {

  constructor(private app: App, private plugin: WikilinkPlugin) {
    super()

    plugin.register(
      plugin.settings.onChange('useSuggest', (_, isEnabled) => {
        isEnabled
          ? this.load()
          : this.unload()
      }))
  }

  load() {
    if (!this.plugin.settings.get('useSuggest')) return
    super.load()
  }

  onload() {
    const { app, plugin } = this

    const suggest = new WikilinkSuggest(app, plugin)

    this.register(
      app.workspace.activeEditor.suggestion.register(suggest))

    this.register(
      plugin.cache.on('change', () => suggest.loadSuggestions()))
  }
}

class WikilinkSuggest extends TextSuggest {

  triggerText = '[['

  suggestions: string[] = []

  constructor(private app: App, private plugin: WikilinkPlugin) {
    super()

    this.loadSuggestions()
  }

  loadSuggestions = debounce(this._loadSuggestions, 1e3)

  private _loadSuggestions() {
    this.suggestions = this.plugin.cache.matches('')
      .filter(o => !o.key.startsWith('[['))
      .map(o => o.key.split('/')[0])
  }

  findQuery(text: string) {
    const matched = text.match(/[\[【]{2}([^[]*)$/) ?? []
    return {
      isMatched: !!matched[0],
      query: matched[1],
    }
  }

  getSuggestions(query: string) {
    return super.getSuggestions(query).slice(0, 50)
  }

  beforeApply(suggest: string) {
    return `[[${suggest}`
  }
}

