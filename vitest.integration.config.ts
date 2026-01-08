import { defineConfig, loadEnv } from 'vitest/config';
import { resolve } from 'path';
import * as dotenv from 'dotenv';

// Load .env.local file for integration tests
dotenv.config({ path: resolve(__dirname, '.env.local') });

/**
 * Vitest configuration for integration tests
 *
 * Integration tests run against a real or test Supabase instance
 * and require proper environment variables to be set.
 *
 * Required environment variables:
 * - NEXT_PUBLIC_SUPABASE_URL: Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key for admin access
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY: Anonymous key (optional)
 *
 * Usage:
 *   npm run test:integration
 *   pnpm test:integration
 *
 * Or with specific environment:
 *   NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 npm run test:integration
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['__tests__/integration/**/*.test.ts'],
    exclude: ['node_modules'],
    testTimeout: 30000, // 30 seconds for integration tests
    hookTimeout: 60000, // 60 seconds for setup/teardown
    pool: 'forks', // Use forks for better isolation
    poolOptions: {
      forks: {
        singleFork: true, // Run tests sequentially to avoid DB conflicts
      },
    },
    sequence: {
      shuffle: false, // Don't shuffle - some tests may depend on order
    },
    retry: 1, // Retry failed tests once (network issues, etc.)
    reporters: ['verbose'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['lib/hooks/**/*.ts', 'lib/supabase/**/*.ts'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
});
