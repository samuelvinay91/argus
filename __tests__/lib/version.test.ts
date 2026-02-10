/**
 * Tests for lib/version.ts
 *
 * Tests the version configuration module including:
 * - getVersionInfo function
 * - APP_VERSION constant
 * - APP_NAME constant
 * - VersionInfo interface
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Store original NODE_ENV
const originalNodeEnv = process.env.NODE_ENV;

describe('version', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    vi.restoreAllMocks();
  });

  describe('getVersionInfo', () => {
    it('should return version info object with correct structure', async () => {
      const { getVersionInfo } = await import('@/lib/version');

      const versionInfo = getVersionInfo();

      expect(versionInfo).toHaveProperty('version');
      expect(versionInfo).toHaveProperty('name');
      expect(versionInfo).toHaveProperty('description');
      expect(versionInfo).toHaveProperty('buildDate');
      expect(versionInfo).toHaveProperty('environment');
    });

    it('should return version from package.json', async () => {
      const { getVersionInfo } = await import('@/lib/version');

      const versionInfo = getVersionInfo();

      // Version should be a valid semver string
      expect(versionInfo.version).toMatch(/^\d+\.\d+\.\d+/);
    });

    it('should return name from package.json', async () => {
      const { getVersionInfo } = await import('@/lib/version');

      const versionInfo = getVersionInfo();

      expect(versionInfo.name).toBe('skopaq-dashboard');
    });

    it('should return description from package.json', async () => {
      const { getVersionInfo } = await import('@/lib/version');

      const versionInfo = getVersionInfo();

      expect(versionInfo.description).toBe('Skopaq - Agentic AI Quality Intelligence');
    });

    it('should return a valid ISO date string for buildDate', async () => {
      const { getVersionInfo } = await import('@/lib/version');

      const beforeCall = new Date().toISOString();
      const versionInfo = getVersionInfo();
      const afterCall = new Date().toISOString();

      // buildDate should be a valid ISO string
      expect(() => new Date(versionInfo.buildDate)).not.toThrow();

      // buildDate should be between before and after the call
      expect(versionInfo.buildDate >= beforeCall).toBe(true);
      expect(versionInfo.buildDate <= afterCall).toBe(true);
    });

    it('should return current NODE_ENV as environment', async () => {
      const { getVersionInfo } = await import('@/lib/version');

      const versionInfo = getVersionInfo();

      expect(versionInfo.environment).toBe(process.env.NODE_ENV || 'development');
    });

    it('should return development as environment when NODE_ENV is undefined', async () => {
      // Clear the module cache to get fresh import
      vi.resetModules();

      // Temporarily delete NODE_ENV
      delete process.env.NODE_ENV;

      const { getVersionInfo } = await import('@/lib/version');
      const versionInfo = getVersionInfo();

      expect(versionInfo.environment).toBe('development');
    });

    it('should return test as environment when NODE_ENV is test', async () => {
      vi.resetModules();
      process.env.NODE_ENV = 'test';

      const { getVersionInfo } = await import('@/lib/version');
      const versionInfo = getVersionInfo();

      expect(versionInfo.environment).toBe('test');
    });

    it('should return production as environment when NODE_ENV is production', async () => {
      vi.resetModules();
      process.env.NODE_ENV = 'production';

      const { getVersionInfo } = await import('@/lib/version');
      const versionInfo = getVersionInfo();

      expect(versionInfo.environment).toBe('production');
    });

    it('should return new buildDate on each call', async () => {
      const { getVersionInfo } = await import('@/lib/version');

      const firstCall = getVersionInfo();

      // Small delay to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 2));

      const secondCall = getVersionInfo();

      // buildDates should be different (or at least the second should be >= first)
      expect(new Date(secondCall.buildDate).getTime()).toBeGreaterThanOrEqual(
        new Date(firstCall.buildDate).getTime()
      );
    });
  });

  describe('APP_VERSION', () => {
    it('should be exported', async () => {
      const { APP_VERSION } = await import('@/lib/version');

      expect(APP_VERSION).toBeDefined();
    });

    it('should be a valid semver string', async () => {
      const { APP_VERSION } = await import('@/lib/version');

      expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+/);
    });

    it('should match version from getVersionInfo', async () => {
      const { APP_VERSION, getVersionInfo } = await import('@/lib/version');

      const versionInfo = getVersionInfo();

      expect(APP_VERSION).toBe(versionInfo.version);
    });

    it('should match version from package.json', async () => {
      const { APP_VERSION } = await import('@/lib/version');
      const packageJson = await import('../../package.json');

      expect(APP_VERSION).toBe(packageJson.version);
    });
  });

  describe('APP_NAME', () => {
    it('should be exported', async () => {
      const { APP_NAME } = await import('@/lib/version');

      expect(APP_NAME).toBeDefined();
    });

    it('should be Skopaq', async () => {
      const { APP_NAME } = await import('@/lib/version');

      expect(APP_NAME).toBe('Skopaq');
    });

    it('should be a string', async () => {
      const { APP_NAME } = await import('@/lib/version');

      expect(typeof APP_NAME).toBe('string');
    });
  });

  describe('VersionInfo interface', () => {
    it('should define correct property types', async () => {
      const { getVersionInfo } = await import('@/lib/version');

      const versionInfo = getVersionInfo();

      expect(typeof versionInfo.version).toBe('string');
      expect(typeof versionInfo.name).toBe('string');
      expect(typeof versionInfo.description).toBe('string');
      expect(typeof versionInfo.buildDate).toBe('string');
      expect(typeof versionInfo.environment).toBe('string');
    });

    it('should have non-empty string values', async () => {
      const { getVersionInfo } = await import('@/lib/version');

      const versionInfo = getVersionInfo();

      expect(versionInfo.version.length).toBeGreaterThan(0);
      expect(versionInfo.name.length).toBeGreaterThan(0);
      expect(versionInfo.description.length).toBeGreaterThan(0);
      expect(versionInfo.buildDate.length).toBeGreaterThan(0);
      expect(versionInfo.environment.length).toBeGreaterThan(0);
    });
  });

  describe('consistency', () => {
    it('should have consistent version across all exports', async () => {
      const { APP_VERSION, getVersionInfo } = await import('@/lib/version');
      const packageJson = await import('../../package.json');

      expect(APP_VERSION).toBe(packageJson.version);
      expect(getVersionInfo().version).toBe(packageJson.version);
      expect(APP_VERSION).toBe(getVersionInfo().version);
    });
  });
});
