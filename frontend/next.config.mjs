import withPWA from 'next-pwa';

const isProd = process.env.NODE_ENV === 'production';
const enablePWA = isProd || process.env.NEXT_ENABLE_PWA === 'true';
const disablePWA = process.env.NEXT_DISABLE_PWA === 'true' || !enablePWA;

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://images.pexels.com https://a0.muscache.com https://*.tile.openstreetmap.org https://server.arcgisonline.com https://*.r2.dev https://*.cloudflarestorage.com",
  "font-src 'self' data:",
  "connect-src 'self' https://yeloo-api.onrender.com https://*.onrender.com",
  "media-src 'self' blob: https://*.r2.dev https://*.cloudflarestorage.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join('; ');

const securityHeaders = [
  {
    key: 'Content-Security-Policy-Report-Only',
    value: csp,
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self)',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
      {
        protocol: 'https',
        hostname: 'a0.muscache.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default withPWA({
  dest: 'public',
  disable: disablePWA,
  fallbacks: {
    document: '/offline',
  },
  importScripts: ['/notification-worker.js'],
  register: true,
  skipWaiting: true,
  clientsClaim: true,
  cleanupOutdatedCaches: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'yeloo-osm-map-tiles',
        expiration: {
          maxEntries: 900,
          maxAgeSeconds: 7 * 24 * 60 * 60,
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
  ],
})(nextConfig);

