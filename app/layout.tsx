import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/ThemeProvider"
import { AuthProvider } from "@/components/AuthProvider"
import { PWARegister } from "@/components/PWARegister"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0a09" },
  ],
}

export const metadata: Metadata = {
  title: {
    default: "锡兰 Ceylon - 现代化需求管理平台",
    template: "%s | 锡兰 Ceylon",
  },
  description: "锡兰是一个现代化的需求管理平台，帮助团队高效管理项目需求、追踪进度、协作开发。支持版本视图、需求分类、优先级管理等功能。",
  keywords: ["需求管理", "项目管理", "团队协作", "敏捷开发", "产品管理", "Ceylon", "锡兰"],
  authors: [{ name: "Ceylon Team" }],
  creator: "Ceylon Team",
  publisher: "Ceylon",
  metadataBase: new URL("https://ceylon.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "锡兰 Ceylon - 现代化需求管理平台",
    description: "帮助团队高效管理项目需求、追踪进度、协作开发的现代化平台",
    url: "https://ceylon.app",
    siteName: "锡兰 Ceylon",
    locale: "zh_CN",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "锡兰 Ceylon - 现代化需求管理平台",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "锡兰 Ceylon - 现代化需求管理平台",
    description: "帮助团队高效管理项目需求、追踪进度、协作开发的现代化平台",
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
    title: "锡兰",
  },
  applicationName: "锡兰",
  formatDetection: {
    telephone: false,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://vaukvwgvklnpmlwhgyei.supabase.co" />
        <link rel="dns-prefetch" href="https://vaukvwgvklnpmlwhgyei.supabase.co" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <AuthProvider>
            <PWARegister />
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
