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
    // Cache API responses with NetworkFirst (fresh data preferred)
    // Excludes streaming endpoints
    {
      matcher: /^https:\/\/argus-brain-production\.up\.railway\.app\/api\/(?!.*\/stream).*/i,
      handler: new NetworkFirst({
        cacheName: 'api-cache',
        networkTimeoutSeconds: 10,
      }),
    },
    // Cache Supabase API with NetworkFirst
    {
      matcher: /^https:\/\/.*\.supabase\.co\/.*/i,
      handler: new NetworkFirst({
        cacheName: 'supabase-cache',
        networkTimeoutSeconds: 10,
      }),
    },
    // Include default caching strategies for Next.js assets
    ...defaultCache,
  ],
});

serwist.addEventListeners();
