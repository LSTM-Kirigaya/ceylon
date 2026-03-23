import { NextRequest, NextResponse } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { createMiddlewareSupabaseClient } from '@/lib/supabase-server'
import { locales, defaultLocale } from './i18n/config'

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'never',
  localeDetection: false,
})

export default async function middleware(request: NextRequest) {
  const response = intlMiddleware(request)
  const supabase = createMiddlewareSupabaseClient(request, response)
  await supabase.auth.getUser()
  return response
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
