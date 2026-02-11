/**
 * Centralized API endpoint configuration
 *
 * All API URLs should be imported from this file to ensure:
 * 1. Single source of truth for endpoint configuration
 * 2. Consistent environment variable handling
 * 3. Easy updates when endpoints change
 */

/**
 * @deprecated Use BACKEND_URL with /api/v1/browser/* endpoints instead.
 * The Cloudflare Worker is deprecated - all browser automation now routes
 * through the Python backend which connects to the Browser Pool/Selenium Grid.
 *
 * Browser endpoints available on BACKEND_URL:
 * - /api/v1/browser/test - Run multi-step tests
 * - /api/v1/browser/act - Execute single actions
 * - /api/v1/browser/observe - Discover page elements
 * - /api/v1/browser/extract - Extract structured data
 * - /api/v1/browser/agent - Run autonomous agent tasks
 */
export const WORKER_URL =
  process.env.NEXT_PUBLIC_E2E_WORKER_URL ||
  process.env.E2E_WORKER_URL ||
  'https://skopaq-api.samuelvinay-kumar.workers.dev';

/**
 * Backend API URL (Python/LangGraph)
 * Used for: orchestration, AI agents, test planning
 * In local development, returns empty string to use Next.js proxy (rewrites in next.config.ts)
 */
const getBackendUrl = (): string => {
  // Explicit override from environment
  const envUrl = process.env.NEXT_PUBLIC_ARGUS_BACKEND_URL || process.env.ARGUS_BACKEND_URL;
  if (envUrl) {
    return envUrl;
  }
  // Client-side: use production for non-localhost, empty for localhost (proxy)
  if (typeof window !== 'undefined') {
    return window.location.hostname === 'localhost'
      ? '' // Use relative URLs for Next.js proxy
      : 'https://argus-brain-production.up.railway.app';
  }
  // Server-side: use production URL
  return 'https://argus-brain-production.up.railway.app';
};

export const BACKEND_URL = getBackendUrl();

/**
 * Supabase configuration
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
