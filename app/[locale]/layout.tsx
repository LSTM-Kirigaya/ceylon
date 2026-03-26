import type { Metadata, Viewport } from "next"
import { Montserrat } from "next/font/google"
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import { locales } from '@/i18n/config'
import { NextIntlClientProvider } from 'next-intl'
import "../globals.css"
import { ThemeProvider } from "@/components/ThemeProvider"
import { AuthProvider } from "@/components/AuthProvider"
import { PWARegister } from "@/components/PWARegister"

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
})

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'metadata' })
  
  return {
    title: {
      default: t('title'),
      template: "%s | ceylonm",
    },
    description: t('description'),
    keywords: ["requirements management", "project management", "team collaboration", "agile development", "product management", "ceylonm"],
    authors: [{ name: "ceylonm Team" }],
    creator: "ceylonm Team",
    publisher: "ceylonm",
    metadataBase: new URL("https://ceylonm.app"),
    alternates: {
      canonical: "/",
    },
    openGraph: {
      title: t('title'),
      description: t('description'),
      url: "https://ceylonm.app",
      siteName: "ceylonm",
      type: "website",
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: t('title'),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t('title'),
      description: t('description'),
      images: ["/og-image.png"],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    manifest: "/manifest.json",
    icons: {
      icon: [
        { url: "/icons/icon.svg", type: "image/svg+xml" },
        { url: "/icons/icon.png", sizes: "128x128", type: "image/png" },
        { url: "/icons/icon-32x32.png", sizes: "32x32", type: "image/png" },
        { url: "/icons/icon-16x16.png", sizes: "16x16", type: "image/png" },
      ],
      apple: [
        { url: "/icons/icon-72x72.png", sizes: "72x72" },
        { url: "/icons/icon-96x96.png", sizes: "96x96" },
        { url: "/icons/icon-128x128.png", sizes: "128x128" },
        { url: "/icons/icon-144x144.png", sizes: "144x144" },
        { url: "/icons/icon-152x152.png", sizes: "152x152" },
        { url: "/icons/icon-192x192.png", sizes: "192x192" },
      ],
      other: [
        {
          rel: "mask-icon",
          url: "/safari-pinned-tab.svg",
          color: "#C85C1B",
        },
      ],
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "ceylonm",
    },
    applicationName: "ceylonm",
    formatDetection: {
      telephone: false,
    },
  }
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0a09" },
  ],
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const messages = await getMessages({ locale })
  const supabaseOrigin = process.env.SUPABASE_URL

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {supabaseOrigin ? (
          <>
            <link rel="preconnect" href={supabaseOrigin} />
            <link rel="dns-prefetch" href={supabaseOrigin} />
          </>
        ) : null}
      </head>
      <body className={`${montserrat.variable} antialiased`}>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
            <AuthProvider>
              <PWARegister />
              {children}
            </AuthProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
