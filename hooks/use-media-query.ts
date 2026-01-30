'use client';

import * as React from 'react';

/**
 * Hook to detect if a media query matches
 *
 * @param query - Media query string (e.g., '(min-width: 768px)')
 * @returns boolean indicating if the query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia(query);

    // Set initial value
    setMatches(mediaQuery.matches);

    // Handler for changes
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Add listener
    mediaQuery.addEventListener('change', handler);

    // Cleanup
    return () => {
      mediaQuery.removeEventListener('change', handler);
    };
  }, [query]);

  return matches;
}

/**
 * Preset media query hooks for common breakpoints
 * These match Tailwind's default breakpoints
 */

/** Returns true on screens >= 375px (xs) */
export function useIsXsScreen(): boolean {
  return useMediaQuery('(min-width: 375px)');
}

/** Returns true on screens >= 640px (sm) */
export function useIsSmScreen(): boolean {
  return useMediaQuery('(min-width: 640px)');
}

/** Returns true on screens >= 768px (md) */
export function useIsMdScreen(): boolean {
  return useMediaQuery('(min-width: 768px)');
}

/** Returns true on screens >= 1024px (lg) */
export function useIsLgScreen(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}

/** Returns true on screens >= 1280px (xl) */
export function useIsXlScreen(): boolean {
  return useMediaQuery('(min-width: 1280px)');
}

/** Returns true when user prefers reduced motion */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

/** Returns true when user prefers dark mode */
export function usePrefersDarkMode(): boolean {
  return useMediaQuery('(prefers-color-scheme: dark)');
}

/**
 * Returns the current breakpoint name
 * Useful for conditional rendering based on screen size
 */
export function useBreakpoint(): 'base' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' {
  const isXl = useIsXlScreen();
  const isLg = useIsLgScreen();
  const isMd = useIsMdScreen();
  const isSm = useIsSmScreen();
  const isXs = useIsXsScreen();

  if (isXl) return 'xl';
  if (isLg) return 'lg';
  if (isMd) return 'md';
  if (isSm) return 'sm';
  if (isXs) return 'xs';
  return 'base';
}

/**
 * Returns true if the device is considered "mobile"
 * Mobile = less than md breakpoint (768px)
 */
export function useIsMobile(): boolean {
  const isMd = useIsMdScreen();
  return !isMd;
}

/**
 * Returns true if the device is considered "desktop"
 * Desktop = lg breakpoint and above (1024px)
 */
export function useIsDesktop(): boolean {
  return useIsLgScreen();
}
