// apps/web/next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'localhost',
      process.env.CLOUDFRONT_DOMAIN ?? '',
    ].filter(Boolean),
  },
  env: {
    NEXT_PUBLIC_API_URL:         process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_URL:         process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_MAX_FILE_SIZE_MB: process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB,
  },
};

module.exports = nextConfig;