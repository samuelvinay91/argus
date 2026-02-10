/**
 * useFloatingPanels - Manages floating (popped-out) panels
 *
 * Features:
 * - Track positions of floating panels
 * - Z-index management (click to bring to front)
 * - Persist positions to localStorage
 * - Cascade new panels (offset from previous)
 */

'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface FloatingPanelState {
  id: string;
  position: Position;
  size: Size;
  zIndex: number;
  isMinimized: boolean;
  isMaximized: boolean;
  previousPosition?: Position;
  previousSize?: Size;
}

export interface FloatingPanelsState {
  panels: Record<string, FloatingPanelState>;
  maxZIndex: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const STORAGE_KEY = 'skopaq-floating-panels';
const CASCADE_OFFSET = 30;
const DEFAULT_WIDTH = 480;
const DEFAULT_HEIGHT = 400;
const MIN_WIDTH = 300;
const MIN_HEIGHT = 200;

// =============================================================================
// ACTIONS
// =============================================================================

type FloatingPanelAction =
  | { type: 'ADD_PANEL'; payload: { id: string; position?: Position; size?: Size } }
  | { type: 'REMOVE_PANEL'; payload: { id: string } }
  | { type: 'UPDATE_POSITION'; payload: { id: string; position: Position } }
  | { type: 'UPDATE_SIZE'; payload: { id: string; size: Size } }
  | { type: 'BRING_TO_FRONT'; payload: { id: string } }
  | { type: 'MINIMIZE'; payload: { id: string } }
  | { type: 'MAXIMIZE'; payload: { id: string } }
  | { type: 'RESTORE'; payload: { id: string } }
  | { type: 'RESTORE_STATE'; payload: FloatingPanelsState }
  | { type: 'RESET' };

// =============================================================================
// HELPERS
// =============================================================================

function getInitialPosition(
  existingPanels: Record<string, FloatingPanelState>
): Position {
  const panelCount = Object.keys(existingPanels).length;

  // Base position (top-left area with padding)
  const baseX = 100;
  const baseY = 100;

  // Cascade offset based on number of existing panels
  const offset = panelCount * CASCADE_OFFSET;

  // Ensure panel stays within viewport
  const maxX = typeof window !== 'undefined' ? window.innerWidth - DEFAULT_WIDTH - 50 : 800;
  const maxY = typeof window !== 'undefined' ? window.innerHeight - DEFAULT_HEIGHT - 50 : 600;

  return {
    x: Math.min(baseX + offset, maxX),
    y: Math.min(baseY + offset, maxY),
  };
}

function loadPersistedState(): FloatingPanelsState | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate the structure
      if (parsed && typeof parsed.panels === 'object' && typeof parsed.maxZIndex === 'number') {
        return parsed as FloatingPanelsState;
      }
    }
  } catch {
    // Ignore localStorage errors
  }

  return null;
}

function persistState(state: FloatingPanelsState): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore localStorage errors
  }
}

// =============================================================================
// REDUCER
// =============================================================================

const initialState: FloatingPanelsState = {
  panels: {},
  maxZIndex: 1000,
};

function floatingPanelsReducer(
  state: FloatingPanelsState,
  action: FloatingPanelAction
): FloatingPanelsState {
  switch (action.type) {
    case 'ADD_PANEL': {
      const { id, position, size } = action.payload;

      // Skip if panel already exists
      if (state.panels[id]) return state;

      const newZIndex = state.maxZIndex + 1;
      const initialPosition = position ?? getInitialPosition(state.panels);
      const initialSize = size ?? { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };

      return {
        ...state,
        panels: {
          ...state.panels,
          [id]: {
            id,
            position: initialPosition,
            size: initialSize,
            zIndex: newZIndex,
            isMinimized: false,
            isMaximized: false,
          },
        },
        maxZIndex: newZIndex,
      };
    }

    case 'REMOVE_PANEL': {
      const { [action.payload.id]: removed, ...remainingPanels } = state.panels;
      return {
        ...state,
        panels: remainingPanels,
      };
    }

    case 'UPDATE_POSITION': {
      const { id, position } = action.payload;
      const panel = state.panels[id];
      if (!panel) return state;

      return {
        ...state,
        panels: {
          ...state.panels,
          [id]: {
            ...panel,
            position,
          },
        },
      };
    }

    case 'UPDATE_SIZE': {
      const { id, size } = action.payload;
      const panel = state.panels[id];
      if (!panel) return state;

      // Enforce minimum size
      const constrainedSize = {
        width: Math.max(MIN_WIDTH, size.width),
        height: Math.max(MIN_HEIGHT, size.height),
      };

      return {
        ...state,
        panels: {
          ...state.panels,
          [id]: {
            ...panel,
            size: constrainedSize,
          },
        },
      };
    }

    case 'BRING_TO_FRONT': {
      const { id } = action.payload;
      const panel = state.panels[id];
      if (!panel) return state;

      // Already at front
      if (panel.zIndex === state.maxZIndex) return state;

      const newZIndex = state.maxZIndex + 1;

      return {
        ...state,
        panels: {
          ...state.panels,
          [id]: {
            ...panel,
            zIndex: newZIndex,
          },
        },
        maxZIndex: newZIndex,
      };
    }

    case 'MINIMIZE': {
      const { id } = action.payload;
      const panel = state.panels[id];
      if (!panel || panel.isMinimized) return state;

      return {
        ...state,
        panels: {
          ...state.panels,
          [id]: {
            ...panel,
            isMinimized: true,
            isMaximized: false,
            previousPosition: panel.position,
            previousSize: panel.size,
          },
        },
      };
    }

    case 'MAXIMIZE': {
      const { id } = action.payload;
      const panel = state.panels[id];
      if (!panel || panel.isMaximized) return state;

      const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
      const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;

      return {
        ...state,
        panels: {
          ...state.panels,
          [id]: {
            ...panel,
            isMinimized: false,
            isMaximized: true,
            previousPosition: panel.position,
            previousSize: panel.size,
            position: { x: 0, y: 0 },
            size: { width: viewportWidth, height: viewportHeight },
          },
        },
      };
    }

    case 'RESTORE': {
      const { id } = action.payload;
      const panel = state.panels[id];
      if (!panel || (!panel.isMinimized && !panel.isMaximized)) return state;

      return {
        ...state,
        panels: {
          ...state.panels,
          [id]: {
            ...panel,
            isMinimized: false,
            isMaximized: false,
            position: panel.previousPosition ?? panel.position,
            size: panel.previousSize ?? panel.size,
            previousPosition: undefined,
            previousSize: undefined,
          },
        },
      };
    }

    case 'RESTORE_STATE': {
      return action.payload;
    }

    case 'RESET': {
      return initialState;
    }

    default:
      return state;
  }
}

// =============================================================================
// HOOK
// =============================================================================

export interface UseFloatingPanelsOptions {
  /** Whether to persist panel positions to localStorage */
  persist?: boolean;
  /** Default size for new panels */
  defaultSize?: Size;
}

export interface UseFloatingPanelsResult {
  /** All floating panel states */
  panels: FloatingPanelState[];
  /** Get a specific panel state */
  getPanel: (id: string) => FloatingPanelState | undefined;
  /** Add a floating panel */
  addPanel: (id: string, position?: Position, size?: Size) => void;
  /** Remove a floating panel */
  removePanel: (id: string) => void;
  /** Update panel position */
  updatePosition: (id: string, position: Position) => void;
  /** Update panel size */
  updateSize: (id: string, size: Size) => void;
  /** Bring panel to front */
  bringToFront: (id: string) => void;
  /** Minimize panel */
  minimize: (id: string) => void;
  /** Maximize panel */
  maximize: (id: string) => void;
  /** Restore panel from minimize/maximize */
  restore: (id: string) => void;
  /** Check if panel exists */
  hasPanel: (id: string) => boolean;
  /** Reset all panels */
  reset: () => void;
}

export function useFloatingPanels({
  persist = true,
}: UseFloatingPanelsOptions = {}): UseFloatingPanelsResult {
  const [state, dispatch] = useReducer(floatingPanelsReducer, initialState);
  const isInitializedRef = useRef(false);

  // Load persisted state on mount
  useEffect(() => {
    if (!persist || isInitializedRef.current) return;

    const persisted = loadPersistedState();
    if (persisted) {
      dispatch({ type: 'RESTORE_STATE', payload: persisted });
    }

    isInitializedRef.current = true;
  }, [persist]);

  // Persist state on changes
  useEffect(() => {
    if (!persist || !isInitializedRef.current) return;

    persistState(state);
  }, [state, persist]);

  // Computed values
  const panels = useMemo(() => {
    return Object.values(state.panels).sort((a, b) => a.zIndex - b.zIndex);
  }, [state.panels]);

  // Actions
  const getPanel = useCallback(
    (id: string) => state.panels[id],
    [state.panels]
  );

  const addPanel = useCallback(
    (id: string, position?: Position, size?: Size) => {
      dispatch({ type: 'ADD_PANEL', payload: { id, position, size } });
    },
    []
  );

  const removePanel = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_PANEL', payload: { id } });
  }, []);

  const updatePosition = useCallback((id: string, position: Position) => {
    dispatch({ type: 'UPDATE_POSITION', payload: { id, position } });
  }, []);

  const updateSize = useCallback((id: string, size: Size) => {
    dispatch({ type: 'UPDATE_SIZE', payload: { id, size } });
  }, []);

  const bringToFront = useCallback((id: string) => {
    dispatch({ type: 'BRING_TO_FRONT', payload: { id } });
  }, []);

  const minimize = useCallback((id: string) => {
    dispatch({ type: 'MINIMIZE', payload: { id } });
  }, []);

  const maximize = useCallback((id: string) => {
    dispatch({ type: 'MAXIMIZE', payload: { id } });
  }, []);

  const restore = useCallback((id: string) => {
    dispatch({ type: 'RESTORE', payload: { id } });
  }, []);

  const hasPanel = useCallback(
    (id: string) => id in state.panels,
    [state.panels]
  );

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return {
    panels,
    getPanel,
    addPanel,
    removePanel,
    updatePosition,
    updateSize,
    bringToFront,
    minimize,
    maximize,
    restore,
    hasPanel,
    reset,
  };
}

export default useFloatingPanels;
