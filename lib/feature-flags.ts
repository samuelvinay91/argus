'use client';

/**
 * Feature Flags for Backend API Migration
 *
 * This module provides feature flags to safely migrate from direct Supabase
 * access to backend API calls. Each domain can be toggled independently.
 *
 * Usage:
 * ```typescript
 * const flags = useFeatureFlags();
 * if (flags.useBackendApi('tests')) {
 *   // Use backend API
 * } else {
 *   // Use direct Supabase (legacy)
 * }
 * ```
 *
 * To enable a feature, set the corresponding environment variable:
 * NEXT_PUBLIC_FF_API_TESTS=true
 * NEXT_PUBLIC_FF_API_PROJECTS=true
 * etc.
 *
 * Or enable all at once:
 * NEXT_PUBLIC_FF_API_ALL=true
 */

export type FeatureDomain =
  | 'tests'
  | 'projects'
  | 'discovery'
  | 'visual'
  | 'quality'
  | 'schedules'
  | 'notifications'
  | 'chat'
  | 'insights'
  | 'global'
  | 'parameterized'
  | 'activity';

interface FeatureFlags {
  /** Check if backend API should be used for a domain */
  useBackendApi: (domain: FeatureDomain) => boolean;
  /** Get all enabled domains */
  getEnabledDomains: () => FeatureDomain[];
  /** Check if any backend API is enabled */
  isAnyEnabled: () => boolean;
  /** Check if all backend APIs are enabled */
  isAllEnabled: () => boolean;
}

// Cache for feature flag values
let flagsCache: Record<FeatureDomain, boolean> | null = null;

function getFlags(): Record<FeatureDomain, boolean> {
  if (flagsCache) return flagsCache;

  // Check for global enable
  const allEnabled = process.env.NEXT_PUBLIC_FF_API_ALL === 'true';

  const domains: FeatureDomain[] = [
    'tests',
    'projects',
    'discovery',
    'visual',
    'quality',
    'schedules',
    'notifications',
    'chat',
    'insights',
    'global',
    'parameterized',
    'activity',
  ];

  flagsCache = {} as Record<FeatureDomain, boolean>;

  for (const domain of domains) {
    const envKey = `NEXT_PUBLIC_FF_API_${domain.toUpperCase()}`;
    const envValue = process.env[envKey];
    flagsCache[domain] = allEnabled || envValue === 'true';
  }

  return flagsCache;
}

/**
 * Get feature flags for backend API migration
 * Can be used in both client and server components
 */
export function getFeatureFlags(): FeatureFlags {
  const flags = getFlags();

  return {
    useBackendApi: (domain: FeatureDomain) => flags[domain] ?? false,

    getEnabledDomains: () => {
      return (Object.entries(flags) as [FeatureDomain, boolean][])
        .filter(([, enabled]) => enabled)
        .map(([domain]) => domain);
    },

    isAnyEnabled: () => Object.values(flags).some(Boolean),

    isAllEnabled: () => Object.values(flags).every(Boolean),
  };
}

/**
 * React hook for feature flags
 * Use this in React components
 */
export function useFeatureFlags(): FeatureFlags {
  return getFeatureFlags();
}

/**
 * Clear the flags cache (useful for testing)
 */
export function clearFlagsCache(): void {
  flagsCache = null;
}
