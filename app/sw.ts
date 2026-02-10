/// <reference lib="webworker" />
import { defaultCache } from '@serwist/next/worker';
import { Serwist, NetworkOnly, NetworkFirst } from 'serwist';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope & typeof globalThis;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  // Navigation fallback for offline
  fallbacks: {
    entries: [
      {
        url: '/offline',
        matcher: ({ request }) => request.destination === 'document',
      },
    ],
  },
  runtimeCaching: [
    // CRITICAL: SSE/streaming endpoints must bypass service worker entirely
    // These are long-lived connections that fail if intercepted
    {
      matcher: /\/stream(\?|$)/i,
      handler: new NetworkOnly(),
    },
    // API responses should NEVER be cached - always fetch fresh data
    // This prevents stale data and CORS error caching issues
    {
      matcher: /^https:\/\/skopaq-brain-production\.up\.railway\.app\/api\/.*/i,
      handler: new NetworkOnly(),
    },
    // Supabase API should also not be cached - real-time data
    {
      matcher: /^https:\/\/.*\.supabase\.co\/.*/i,
      handler: new NetworkOnly(),
    },
    // Tracking scripts - bypass service worker to avoid CSP issues
    {
      matcher: /^https:\/\/ddwl4m2hdecbv\.cloudfront\.net\/.*/i,
      handler: new NetworkOnly(),
    },
    {
      matcher: /^https:\/\/assets\.apollo\.io\/.*/i,
      handler: new NetworkOnly(),
    },
    {
      matcher: /^https:\/\/aplo-evnt\.com\/.*/i,
      handler: new NetworkOnly(),
    },
    {
      matcher: /^https:\/\/pro\.ip-api\.com\/.*/i,
      handler: new NetworkOnly(),
    },
    // Include default caching strategies for Next.js assets
    ...defaultCache,
  ],
});

serwist.addEventListeners();
