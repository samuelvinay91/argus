'use client';

/**
 * API Client Provider
 *
 * This component initializes the global authenticated API client
 * by providing the Clerk token getter function.
 *
 * Add this to your app layout to enable authenticated API calls
 * throughout the application.
 */

import { useEffect, useLayoutEffect, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { setGlobalTokenGetter, clearGlobalTokenGetter } from '@/lib/api-client';

// Use useLayoutEffect on client to set token getter before paint
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function ApiClientProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const initializedRef = useRef(false);

  // Use layout effect to set token getter synchronously before child components render
  useIsomorphicLayoutEffect(() => {
    if (isLoaded && !initializedRef.current) {
      initializedRef.current = true;
      // Set the global token getter when auth is loaded
      setGlobalTokenGetter(async () => {
        try {
          const token = await getToken();
          if (!token && isSignedIn) {
            console.warn('[ApiClientProvider] User is signed in but token is null');
          }
          return token;
        } catch (error) {
          console.error('[ApiClientProvider] Failed to get token:', error);
          return null;
        }
      });
    }

    return () => {
      // Clean up on unmount
      if (initializedRef.current) {
        clearGlobalTokenGetter();
        initializedRef.current = false;
      }
    };
  }, [getToken, isLoaded, isSignedIn]);

  return <>{children}</>;
}
