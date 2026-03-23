import { getRequestConfig } from 'next-intl/server'
import { defaultLocale, locales, type Locale } from './config'

export default getRequestConfig(async ({ requestLocale }) => {
  // Use the locale from the request or fall back to the default locale
  let locale = await requestLocale as Locale | undefined
  
  if (!locale || !locales.includes(locale)) {
    locale = defaultLocale
  }

  return {
    locale,
    messages: (await import(`@/messages/${locale}.json`)).default,
    timeZone: 'Asia/Shanghai',
    now: new Date(),
  }
})
