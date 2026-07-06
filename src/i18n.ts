import { I18n } from "@typora-community-plugin/core"
import * as Locale from './locales/lang.en.json'


export const i18n = new I18n<typeof Locale>({
  localePath: 'locales'
})
