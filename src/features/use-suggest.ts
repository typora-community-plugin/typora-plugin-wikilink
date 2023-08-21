import * as _ from "lodash"
import { type App, Component, EditorSuggest } from "@typora-community-plugin/core"
import type WikilinkPlugin from "../main"


export class UseSuggest extends Component {

  constructor(private app: App, private plugin: WikilinkPlugin) {
    super()
  }

  load() {
    if (!this.plugin.settings.get('useSuggest')) return
    super.load()
  }

  onload() {
    const { app, plugin } = this

    this.register(
      plugin.settings.onChange('useSuggest', (_, isEnabled) => {
        isEnabled
          ? this.load()
          : this.unload()
      }))

    const suggest = new WikilinkSuggest(app, plugin)

    this.register(
      app.workspace.activeEditor.suggestion.register(suggest))

    this.register(
      plugin.cache.on('change', () => suggest.loadSuggestions()))
  }
}

class WikilinkSuggest extends EditorSuggest<string> {

  triggerText = '[['

  suggestionKeys: string[] = []

  constructor(private app: App, private plugin: WikilinkPlugin) {
    super()

    this.loadSuggestions()
  }

  loadSuggestions = _.debounce(this._loadSuggestions, 1e3)

  private _loadSuggestions() {
    this.suggestionKeys = this.plugin.cache.matches('')
      .filter(o => !o.key.startsWith('[['))
      .map(o => o.key.split('/')[0])
  }

  findQuery(text: string) {
    const matched = text.match(/\[{2}([^[]*)$/) ?? []
    return {
      isMatched: !!matched[0],
      query: matched[1],
    }
  }

  getSuggestions(query: string) {
    query = query.toLowerCase()
    return this.suggestionKeys
      .filter(n => n.toLowerCase().includes(query))
  }

  beforeApply(suggest: string) {
    return `[[${suggest}`
  }
}

