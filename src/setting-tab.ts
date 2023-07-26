import { I18n, SettingTab } from "@typora-community-plugin/core"
import type WikilinkPlugin from "./main"


export class WikilinkSettingTab extends SettingTab {

  get name() {
    return 'Wiki Link'
  }

  i18n = new I18n({
    resources: {
      'en': {
        headingAdditional: 'Additional',
        useInFileExplorer: {
          name: 'Use in file explorer',
          desc: 'Click file `[[name]].md` will open `name.md`',
        },
      },
      'zh-cn': {
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
    const { t } = this.i18n

    this.containerEl.innerHTML = ''

    this.addSettingTitle(t.headingAdditional)
    this.addSetting(setting => {
      setting.addName(t.useInFileExplorer.name)
      setting.addDescription(t.useInFileExplorer.desc)
      setting.addCheckbox(checkbox => {
        checkbox.checked = this.plugin.settings.useInFileExplorer
        checkbox.addEventListener('click', event => {
          const el = event.target as HTMLInputElement
          this.plugin.settings.useInFileExplorer = el.checked
          el.checked
            ? this.plugin.enableWikilinkInFileExplorer()
            : this.plugin.disableWikilinkInFileExplorer()
        })
      })
    })

    super.show()
  }

}
