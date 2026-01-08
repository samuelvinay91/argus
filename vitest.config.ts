import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./__tests__/vitest.setup.ts'],
    include: [
      '__tests__/**/*.test.{ts,tsx}',
      'lib/**/*.test.{ts,tsx}',
      'components/**/*.test.{ts,tsx}',
    ],
    exclude: [
      'node_modules',
      '__tests__/integration/**/*.test.ts', // Exclude integration tests from default run
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '__tests__/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/types/**',
      ],
    },
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
});
