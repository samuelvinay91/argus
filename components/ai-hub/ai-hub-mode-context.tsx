'use client';

/**
 * AI Hub Mode Context
 *
 * Provides Simple/Expert mode toggle for the AI Hub.
 * - Simple mode: Streamlined UI with auto-mode slider
 * - Expert mode: Full control with routing tables and advanced options
 *
 * Persists preference to localStorage for consistent experience.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';

// Storage key for persisting mode preference
const AI_HUB_MODE_KEY = 'skopaq_ai_hub_mode';

/**
 * AI Hub display modes
 * - 'simple': Streamlined interface with auto-mode slider
 * - 'expert': Full interface with routing tables and advanced configuration
 */
export type AIHubMode = 'simple' | 'expert';

interface AIHubModeContextValue {
  /** Current display mode */
  mode: AIHubMode;

  /** Update the display mode */
  setMode: (mode: AIHubMode) => void;

  /** Toggle between simple and expert modes */
  toggleMode: () => void;

  /** Whether the mode is currently 'simple' */
  isSimple: boolean;

  /** Whether the mode is currently 'expert' */
  isExpert: boolean;
}

const AIHubModeContext = createContext<AIHubModeContextValue | null>(null);

interface AIHubModeProviderProps {
  children: ReactNode;
  /** Default mode if no preference is stored (defaults to 'simple') */
  defaultMode?: AIHubMode;
}

/**
 * Provider that manages AI Hub display mode state.
 *
 * Wraps AI Hub pages to provide mode-aware rendering.
 * Persists preference to localStorage.
 *
 * @example
 * ```tsx
 * // In layout.tsx
 * <AIHubModeProvider>
 *   {children}
 * </AIHubModeProvider>
 *
 * // In a component
 * const { mode, isSimple, toggleMode } = useAIHubMode();
 * ```
 */
export function AIHubModeProvider({
  children,
  defaultMode = 'simple',
}: AIHubModeProviderProps) {
  // Initialize with default, then load from localStorage
  const [mode, setModeState] = useState<AIHubMode>(defaultMode);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load saved preference on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem(AI_HUB_MODE_KEY);
      if (savedMode === 'simple' || savedMode === 'expert') {
        setModeState(savedMode);
      }
      setIsHydrated(true);
    }
  }, []);

  // Update mode and persist to localStorage
  const setMode = useCallback((newMode: AIHubMode) => {
    setModeState(newMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem(AI_HUB_MODE_KEY, newMode);
    }
  }, []);

  // Toggle between modes
  const toggleMode = useCallback(() => {
    setMode(mode === 'simple' ? 'expert' : 'simple');
  }, [mode, setMode]);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo<AIHubModeContextValue>(
    () => ({
      mode,
      setMode,
      toggleMode,
      isSimple: mode === 'simple',
      isExpert: mode === 'expert',
    }),
    [mode, setMode, toggleMode]
  );

  // Prevent hydration mismatch by rendering null until hydrated
  // This ensures server and client render the same initial state
  if (!isHydrated) {
    return (
      <AIHubModeContext.Provider value={{ ...value, mode: defaultMode, isSimple: defaultMode === 'simple', isExpert: defaultMode === 'expert' }}>
        {children}
      </AIHubModeContext.Provider>
    );
  }

  return (
    <AIHubModeContext.Provider value={value}>
      {children}
    </AIHubModeContext.Provider>
  );
}

/**
 * Hook to access AI Hub mode context.
 *
 * Must be used within an AIHubModeProvider.
 *
 * @example
 * ```tsx
 * function RoutingPage() {
 *   const { isSimple, isExpert, toggleMode } = useAIHubMode();
 *
 *   return (
 *     <div>
 *       {isSimple && <SimpleRoutingSlider />}
 *       {isExpert && <FullRoutingTable />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useAIHubMode(): AIHubModeContextValue {
  const context = useContext(AIHubModeContext);

  if (!context) {
    throw new Error(
      'useAIHubMode must be used within an AIHubModeProvider. ' +
        'Make sure AIHubModeProvider is in your component tree.'
    );
  }

  return context;
}

/**
 * Hook that returns just the mode value (convenience for simple checks)
 */
export function useAIHubModeValue(): AIHubMode {
  const { mode } = useAIHubMode();
  return mode;
}
