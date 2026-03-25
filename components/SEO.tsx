import Head from 'next/head'

interface SEOProps {
  title?: string
  description?: string
  keywords?: string[]
  ogImage?: string
  ogType?: string
  canonical?: string
  noIndex?: boolean
}

const DEFAULT_TITLE = '锡兰 ceylonm - 现代化需求管理平台'
const DEFAULT_DESCRIPTION = '锡兰是一个现代化的需求管理平台，帮助团队高效管理项目需求、追踪进度、协作开发。支持版本视图、需求分类、优先级管理等功能。'
const DEFAULT_KEYWORDS = ['需求管理', '项目管理', '团队协作', '敏捷开发', '产品管理', 'ceylonm', '锡兰']
const SITE_URL = 'https://ceylonm.com'

export function SEO({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  keywords = DEFAULT_KEYWORDS,
  ogImage = '/og-image.png',
  ogType = 'website',
  canonical,
  noIndex = false,
}: SEOProps) {
  const fullTitle = title === DEFAULT_TITLE ? title : `${title} | 锡兰 ceylonm`
  const fullUrl = canonical ? `${SITE_URL}${canonical}` : SITE_URL

  return (
    <Head>
      {/* 基础标签 */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords.join(', ')} />
      <meta name="author" content="ceylonm Team" />
      <meta name="robots" content={noIndex ? 'noindex, nofollow' : 'index, follow'} />

      {/* 视口和主题 */}
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      <meta name="theme-color" content="#C85C1B" />
      <meta name="msapplication-TileColor" content="#C85C1B" />

      {/* PWA */}
      <link rel="manifest" href="/manifest.json" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content="锡兰" />
      <meta name="application-name" content="锡兰" />
      <meta name="mobile-web-app-capable" content="yes" />

      {/* 图标 */}
      <link rel="apple-touch-icon" sizes="72x72" href="/icons/icon-72x72.png" />
      <link rel="apple-touch-icon" sizes="96x96" href="/icons/icon-96x96.png" />
      <link rel="apple-touch-icon" sizes="128x128" href="/icons/icon-128x128.png" />
      <link rel="apple-touch-icon" sizes="144x144" href="/icons/icon-144x144.png" />
      <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
      <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192x192.png" />
      <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-16x16.png" />
      <link rel="shortcut icon" href="/favicon.ico" />
      <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#C85C1B" />

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:image" content={`${SITE_URL}${ogImage}`} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="锡兰 ceylonm" />
      <meta property="og:locale" content="zh_CN" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={`${SITE_URL}${ogImage}`} />

      {/* 规范链接 */}
      <link rel="canonical" href={fullUrl} />

      {/* 结构化数据 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: '锡兰 ceylonm',
            description: description,
            url: SITE_URL,
            applicationCategory: 'Productivity',
            operatingSystem: 'Any',
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'CNY',
            },
            author: {
              '@type': 'Organization',
              name: 'ceylonm Team',
            },
          }),
        }}
      />

      {/* 预连接 */}
      <link rel="preconnect" href="https://vaukvwgvklnpmlwhgyei.supabase.co" />
      <link rel="dns-prefetch" href="https://vaukvwgvklnpmlwhgyei.supabase.co" />
    </Head>
  )
}

export function PageSEO({
  title,
  description,
  keywords = [],
  ...props
}: SEOProps) {
  return (
    <SEO
      title={title}
      description={description}
      keywords={[...DEFAULT_KEYWORDS, ...keywords]}
      {...props}
    />
  )
}
