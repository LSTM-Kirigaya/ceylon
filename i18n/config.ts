export type Locale = 'zh' | 'en' | 'ja'

export const locales: Locale[] = ['zh', 'en', 'ja']

export const defaultLocale: Locale = 'zh'

export const localeNames: Record<Locale, string> = {
  zh: '中文',
  en: 'English',
  ja: '日本語',
}

export const localeFlags: Record<Locale, string> = {
  zh: '🇨🇳',
  en: '🇺🇸',
  ja: '🇯🇵',
}
