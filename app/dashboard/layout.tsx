import { cookies } from 'next/headers'
import { getMessages } from 'next-intl/server'
import { NextIntlClientProvider } from 'next-intl'
import { defaultLocale, locales, type Locale } from '@/i18n/config'
import { ThemeProvider } from "@/components/ThemeProvider"
import { AuthProvider } from "@/components/AuthProvider"
import { PWARegister } from "@/components/PWARegister"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value
  let locale: Locale = defaultLocale
  if (cookieLocale && locales.includes(cookieLocale as Locale)) {
    locale = cookieLocale as Locale
  }
  const messages = await getMessages({ locale })

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <ThemeProvider>
        <AuthProvider>
          <PWARegister />
          {children}
        </AuthProvider>
      </ThemeProvider>
    </NextIntlClientProvider>
  )
}
