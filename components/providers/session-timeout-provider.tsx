'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { useSession, useClerk } from '@clerk/nextjs';
import { SessionWarningModal } from '@/components/ui/session-warning-modal';

// Configuration constants
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes of inactivity
const WARNING_BEFORE_TIMEOUT_MS = 5 * 60 * 1000; // Show warning 5 minutes before timeout
const ACTIVITY_THROTTLE_MS = 1000; // Throttle activity updates to 1 per second

interface SessionTimeoutContextValue {
  /** Time remaining in seconds before session expires */
  timeRemaining: number;
  /** Whether the session is about to expire (warning shown) */
  isWarningShown: boolean;
  /** Extend the session by resetting the timeout */
  extendSession: () => void;
  /** Sign out the user */
  logout: () => void;
}

const SessionTimeoutContext = createContext<SessionTimeoutContextValue | null>(null);

/**
 * Hook to access session timeout state and actions
 */
export function useSessionTimeout(): SessionTimeoutContextValue {
  const context = useContext(SessionTimeoutContext);
  if (!context) {
    throw new Error('useSessionTimeout must be used within SessionTimeoutProvider');
  }
  return context;
}

interface SessionTimeoutProviderProps {
  children: ReactNode;
  /** Override default timeout in milliseconds (default: 30 minutes) */
  timeoutMs?: number;
  /** Override warning time before timeout in milliseconds (default: 5 minutes) */
  warningBeforeMs?: number;
  /** Disable session timeout (useful for testing) */
  disabled?: boolean;
}

/**
 * Provider that tracks user activity and shows a warning modal before session expires.
 *
 * Features:
 * - Tracks mouse, keyboard, scroll, and touch activity
 * - Shows warning modal 5 minutes before session expiry
 * - "Stay Logged In" button refreshes the session
 * - Auto-logout after grace period if user doesn't respond
 * - Integrates with Clerk for session management
 */
export function SessionTimeoutProvider({
  children,
  timeoutMs = SESSION_TIMEOUT_MS,
  warningBeforeMs = WARNING_BEFORE_TIMEOUT_MS,
  disabled = false,
}: SessionTimeoutProviderProps) {
  const { session, isLoaded, isSignedIn } = useSession();
  const { signOut } = useClerk();

  // Track last activity timestamp
  const lastActivityRef = useRef<number>(Date.now());
  const lastActivityUpdateRef = useRef<number>(0);

  // State for warning modal and countdown
  const [isWarningShown, setIsWarningShown] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(timeoutMs / 1000);

  // Update last activity time (throttled)
  const updateActivity = useCallback(() => {
    const now = Date.now();
    // Throttle updates to avoid excessive state changes
    if (now - lastActivityUpdateRef.current >= ACTIVITY_THROTTLE_MS) {
      lastActivityRef.current = now;
      lastActivityUpdateRef.current = now;

      // If warning was shown and user is active, reset it
      if (isWarningShown) {
        setIsWarningShown(false);
        setTimeRemaining(timeoutMs / 1000);
      }
    }
  }, [isWarningShown, timeoutMs]);

  // Extend session by refreshing Clerk token and resetting timeout
  const extendSession = useCallback(async () => {
    try {
      // Refresh the Clerk session token
      if (session) {
        await session.getToken({ skipCache: true });
      }

      // Reset activity tracking
      lastActivityRef.current = Date.now();
      setIsWarningShown(false);
      setTimeRemaining(timeoutMs / 1000);
    } catch (error) {
      console.error('Failed to extend session:', error);
    }
  }, [session, timeoutMs]);

  // Logout user
  const logout = useCallback(async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Failed to sign out:', error);
      // Force reload to clear any stale state
      window.location.href = '/';
    }
  }, [signOut]);

  // Set up activity listeners
  useEffect(() => {
    if (disabled || !isLoaded || !isSignedIn) {
      return;
    }

    // Event types to track
    const events: (keyof WindowEventMap)[] = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click',
    ];

    // Add passive listeners for better performance
    const options: AddEventListenerOptions = { passive: true };

    events.forEach((event) => {
      window.addEventListener(event, updateActivity, options);
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, updateActivity);
      });
    };
  }, [disabled, isLoaded, isSignedIn, updateActivity]);

  // Check for timeout and update countdown
  useEffect(() => {
    if (disabled || !isLoaded || !isSignedIn) {
      return;
    }

    const checkInterval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastActivityRef.current;
      const remaining = timeoutMs - elapsed;

      if (remaining <= 0) {
        // Session expired - logout
        logout();
        return;
      }

      // Update time remaining (in seconds)
      setTimeRemaining(Math.ceil(remaining / 1000));

      // Show warning if within warning period
      if (remaining <= warningBeforeMs && !isWarningShown) {
        setIsWarningShown(true);
      }
    }, 1000);

    return () => {
      clearInterval(checkInterval);
    };
  }, [disabled, isLoaded, isSignedIn, timeoutMs, warningBeforeMs, isWarningShown, logout]);

  // Context value
  const value: SessionTimeoutContextValue = {
    timeRemaining,
    isWarningShown,
    extendSession,
    logout,
  };

  return (
    <SessionTimeoutContext.Provider value={value}>
      {children}
      {isSignedIn && (
        <SessionWarningModal
          isOpen={isWarningShown}
          timeRemaining={timeRemaining}
          onStayLoggedIn={extendSession}
          onLogout={logout}
        />
      )}
    </SessionTimeoutContext.Provider>
  );
}
