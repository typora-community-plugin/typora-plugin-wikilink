import { I18n, SettingTab } from "@typora-community-plugin/core"
import type WikilinkPlugin from "./main"


export class WikilinkSettingTab extends SettingTab {

  get name() {
    return 'Wiki Link'
  }

  i18n = new I18n({
    resources: {
      'en': {
        useSuggest: {
          name: 'Use suggestion',
          desc: 'Input text prefix `[[` to trigger wikilink suggestions.'
        },
        headingAdditional: 'Additional',
        useInFileExplorer: {
          name: 'Use in file explorer',
          desc: 'Click file `[[name]].md` will open `name.md`',
        },
      },
      'zh-cn': {
        useSuggest: {
          name: '输入建议',
          desc: '输入触发字符 `[[` 触发 wikilink 建议。'
        },
        headingAdditional: '附加功能',
        useInFileExplorer: {
          name: '在文件管理器中使用 Wikilink',
          desc: '点击文件 `[[name]].md` 将会打开 `name.md`',
        },
      },
    }
  })

  constructor(private plugin: WikilinkPlugin) {
    super()
  }

  onload() {
  }

  show() {
    const { plugin } = this
    const { t } = this.i18n

    this.addSetting(setting => {
      setting.addName(t.useSuggest.name)
      setting.addDescription(t.useSuggest.desc)
      setting.addCheckbox(checkbox => {
        checkbox.checked = plugin.settings.useSuggest
        checkbox.onclick = () => {
          plugin.settings.useSuggest = checkbox.checked
          checkbox.checked
            ? plugin._useSuggest.load()
            : plugin._useSuggest.unload()
          plugin.saveSettings()
        }
      })
    })

    this.addSettingTitle(t.headingAdditional)
    this.addSetting(setting => {
      setting.addName(t.useInFileExplorer.name)
      setting.addDescription(t.useInFileExplorer.desc)
      setting.addCheckbox(checkbox => {
        checkbox.checked = plugin.settings.useInFileExplorer
        checkbox.onclick = () => {
          plugin.settings.useInFileExplorer = checkbox.checked
          checkbox.checked
            ? plugin.enableWikilinkInFileExplorer()
            : plugin.disableWikilinkInFileExplorer()
          plugin.saveSettings()
        }
      })
    })

    super.show()
  }

  hide() {
    this.containerEl.innerHTML = ''
    super.hide()
  }

}
