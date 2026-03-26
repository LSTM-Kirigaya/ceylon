import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  // Enable static export for deployment
  output: 'standalone',
  
  // Image optimization config
  images: {
    unoptimized: true,
  },
  
  // Headers for API routes
  async headers() {
    const noStoreHeaders =
      process.env.NODE_ENV !== 'production'
        ? [
            { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, max-age=0' },
            { key: 'Pragma', value: 'no-cache' },
            { key: 'Expires', value: '0' },
          ]
        : []

    return [
      // Dev: disable caching everywhere to avoid stale UI/assets.
      ...(noStoreHeaders.length
        ? [
            {
              source: '/:path*',
              headers: noStoreHeaders,
            },
          ]
        : []),
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
          ...noStoreHeaders,
        ],
      },
    ]
  },
};

export default withNextIntl(nextConfig);
