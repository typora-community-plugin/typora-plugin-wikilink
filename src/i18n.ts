import { I18n } from "@typora-community-plugin/core"


export const i18n = new I18n({
  resources: {
    'en': {
      commandToggle: 'Toggle Focused/Selected Text Wikilink Style',
      notSuchFile: 'Can not found the file: ',
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
      commandToggle: '切换 Wikilink 样式',
      notSuchFile: '找不到文件: ',
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
