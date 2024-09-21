import { SettingTab } from "@typora-community-plugin/core"
import type WikilinkPlugin from "./main"


export class WikilinkSettingTab extends SettingTab {

  get name() {
    return 'Wiki Link'
  }

  constructor(private plugin: WikilinkPlugin) {
    super()

    this.render()
  }

  render() {
    const { plugin } = this
    const { t } = this.plugin.i18n

    this.addSetting(setting => {
      setting.addName(t.useSuggest.name)
      setting.addDescription(t.useSuggest.desc)
      setting.addCheckbox(checkbox => {
        checkbox.checked = plugin.settings.get('useSuggest')
        checkbox.onclick = () => {
          plugin.settings.set('useSuggest', checkbox.checked)
        }
      })
    })

    this.addSettingTitle(t.headingAdditional)
    this.addSetting(setting => {
      setting.addName(t.useInFileExplorer.name)
      setting.addDescription(t.useInFileExplorer.desc)
      setting.addCheckbox(checkbox => {
        checkbox.checked = plugin.settings.get('useInFileExplorer')
        checkbox.onclick = () => {
          plugin.settings.set('useInFileExplorer', checkbox.checked)
        }
      })
    })
  }
}
