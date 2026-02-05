import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';
import withSerwistInit from '@serwist/next';

// PWA configuration using Serwist (official Next.js recommended package)
// Caching strategies are defined in app/sw.ts
const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  // Disable in development to avoid service worker issues with HMR
  disable: process.env.NODE_ENV === 'development',
});

// Content Security Policy configuration
// Note: 'unsafe-inline' for scripts is required by Next.js for inline script hydration
// Note: 'unsafe-eval' is only added in development for hot reload
const isDev = process.env.NODE_ENV === 'development';

const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ''} https://*.clerk.accounts.dev https://clerk.heyargus.ai https://challenges.cloudflare.com https://www.googletagmanager.com https://www.google-analytics.com https://www.clarity.ms https://*.sentry.io https://va.vercel-scripts.com https://vercel.live https://*.spline.design https://*.splinecdn.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://ddwl4m2hdecbv.cloudfront.net https://assets.apollo.io;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: blob: https: http://localhost:*;
  font-src 'self' data: https://fonts.gstatic.com;
  worker-src 'self' blob: https://*.spline.design https://*.splinecdn.com;
  media-src 'self' blob: https://argus-api.samuelvinay-kumar.workers.dev;
  connect-src 'self' https://*.clerk.accounts.dev https://clerk.heyargus.ai https://clerk-telemetry.com https://img.clerk.com https://*.supabase.co wss://*.supabase.co https://argus-brain-production.up.railway.app https://argus-api.samuelvinay-kumar.workers.dev https://*.sentry.io https://www.google-analytics.com https://www.clarity.ms https://vitals.vercel-insights.com https://vercel.live https://prod.spline.design https://*.spline.design https://*.splinecdn.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://cdn.simpleicons.org https://models.dev https://ddwl4m2hdecbv.cloudfront.net https://assets.apollo.io ${isDev ? 'http://localhost:* ws://localhost:*' : ''};
  frame-src 'self' https://*.clerk.accounts.dev https://clerk.heyargus.ai https://challenges.cloudflare.com https://vercel.live;
  frame-ancestors 'none';
  form-action 'self';
  base-uri 'self';
  object-src 'none';
  upgrade-insecure-requests;
`.replace(/\s{2,}/g, ' ').trim();

const nextConfig: NextConfig = {
  // Ignore ESLint warnings during build (pre-existing issues)
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Security headers for all routes
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: ContentSecurityPolicy,
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
    ];
  },
  // Proxy API calls to the Railway backend
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://argus-brain-production.up.railway.app';
    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ];
  },
  // Enable experimental features for AI SDK
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Allow external images from CDNs
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.simpleicons.org',
      },
    ],
  },
  // Exclude heavy files from serverless function traces (must be at root level)
  outputFileTracingExcludes: {
    '*': [
      'node_modules/@swc/core-linux-x64-gnu',
      'node_modules/@swc/core-linux-x64-musl',
      'node_modules/@esbuild/linux-x64',
      'node_modules/@esbuild',
      'node_modules/esbuild',
      'node_modules/terser',
      'node_modules/webpack',
    ],
  },
  // Externalize heavy packages to reduce serverless function size
  serverExternalPackages: [
    '@anthropic-ai/sdk',
    'anthropic',
  ],
  // Environment variables for client-side
  env: {
    NEXT_PUBLIC_E2E_WORKER_URL: process.env.NEXT_PUBLIC_E2E_WORKER_URL || 'https://argus-api.samuelvinay-kumar.workers.dev',
  },
  // Transpile Spline packages for ES module compatibility
  transpilePackages: ['@splinetool/react-spline', '@splinetool/runtime'],
};

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  org: "raphatech",
  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Automatically annotate React components to show their full name in breadcrumbs and session replay
  reactComponentAnnotation: {
    enabled: true,
  },

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  tunnelRoute: "/monitoring",

  // Hides source maps from generated client bundles
  hideSourceMaps: true,

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors
  automaticVercelMonitors: true,
};

// Apply Serwist (PWA) wrapper first, then Sentry
export default withSentryConfig(withSerwist(nextConfig), sentryWebpackPluginOptions);
