'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

// ============================================================================
// Reduced Motion Provider
// ============================================================================
// Provides a context for components to check if user prefers reduced motion.
// This respects the prefers-reduced-motion media query and can be used to
// disable or simplify animations throughout the application.

interface ReducedMotionContextValue {
  prefersReducedMotion: boolean;
}

const ReducedMotionContext = createContext<ReducedMotionContextValue>({
  prefersReducedMotion: false,
});

export function useReducedMotion(): boolean {
  const context = useContext(ReducedMotionContext);
  return context.prefersReducedMotion;
}

function ReducedMotionProvider({ children }: { children: ReactNode }) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check if window is available (client-side only)
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Set initial value
    setPrefersReducedMotion(mediaQuery.matches);

    // Listen for changes
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return (
    <ReducedMotionContext.Provider value={{ prefersReducedMotion }}>
      {children}
    </ReducedMotionContext.Provider>
  );
}

// ============================================================================
// Main Providers Component
// ============================================================================

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes - reduce unnecessary refetches
            gcTime: 10 * 60 * 1000, // 10 minutes - keep cached data longer
            refetchOnWindowFocus: false,
            retry: 1, // Reduce retry attempts to speed up failures
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ReducedMotionProvider>{children}</ReducedMotionProvider>
    </QueryClientProvider>
  );
}
