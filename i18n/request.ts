import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'
import { defaultLocale, locales, type Locale } from './config'

// Cookie name for locale (must match the client-side cookie name)
const LOCALE_COOKIE = 'NEXT_LOCALE'

export default getRequestConfig(async () => {
  // Get locale from cookie
  const cookieStore = await cookies()
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value
  
  // Validate and set locale
  let locale: Locale = defaultLocale
  if (cookieLocale && locales.includes(cookieLocale as Locale)) {
    locale = cookieLocale as Locale
  }

  return {
    locale,
    messages: (await import(`@/messages/${locale}.json`)).default,
    timeZone: 'Asia/Shanghai',
    now: new Date(),
  }
})
