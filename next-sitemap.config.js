/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || 'https://ceylonm.com',
  generateRobotsTxt: true,
  robotsTxtOptions: {
    additionalSitemaps: [],
    policies: [
      {
        userAgent: '*',
        allow: '/',
      },
    ],
  },
  exclude: ['/preview/*', '/api/*', '/admin/*'],
  alternateRefs: [
    {
      href: 'https://ceylonm.com/zh',
      hreflang: 'zh-CN',
    },
    {
      href: 'https://ceylonm.com/en',
      hreflang: 'en-US',
    },
  ],
}
