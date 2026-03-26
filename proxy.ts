import { NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { createMiddlewareSupabaseClient } from '@/lib/supabase-server'
import { locales, defaultLocale } from './i18n/config'

const intlProxy = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'never',
  localeDetection: false,
})

export async function proxy(request: NextRequest) {
  const response = intlProxy(request)
  const supabase = createMiddlewareSupabaseClient(request, response)
  await supabase.auth.getUser()
  return response
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}

