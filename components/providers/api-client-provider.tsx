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

import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { setGlobalTokenGetter, clearGlobalTokenGetter } from '@/lib/api-client';

export function ApiClientProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded } = useAuth();

  useEffect(() => {
    if (isLoaded) {
      // Set the global token getter when auth is loaded
      setGlobalTokenGetter(async () => {
        try {
          return await getToken();
        } catch (error) {
          console.error('[ApiClientProvider] Failed to get token:', error);
          return null;
        }
      });
    }

    return () => {
      // Clean up on unmount
      clearGlobalTokenGetter();
    };
  }, [getToken, isLoaded]);

  return <>{children}</>;
}
