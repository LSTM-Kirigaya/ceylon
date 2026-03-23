import createMiddleware from 'next-intl/middleware'
import { locales, defaultLocale } from './i18n/config'

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
})

export const config = {
  matcher: [
    // Enable a redirect to a matching locale at the root
    '/',
    // Set a cookie to remember the previous locale for
    // all requests that have a locale prefix
    '/(zh|en|ja)/:path*',
    // Enable redirects that add missing locales
    // (e.g., `/dashboard` to `/zh/dashboard`)
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
}
