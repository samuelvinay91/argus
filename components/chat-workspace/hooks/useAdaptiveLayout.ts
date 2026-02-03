/**
 * useAdaptiveLayout - State machine for layout management
 *
 * Manages the workspace layout state between focused, split, and multi-panel modes.
 * Handles panel spawning, closing, pinning, and pop-out functionality.
 */

'use client';

import { useCallback, useMemo, useReducer } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export type LayoutState = 'focused' | 'split' | 'multi';

export type PanelType =
  | 'test-results'
  | 'quality-report'
  | 'visual-diff'
  | 'code-viewer'
  | 'pipeline'
  | 'logs'
  | 'coverage'
  | 'analytics';

export interface Panel {
  id: string;
  type: PanelType;
  title: string;
  data: unknown;
  isPinned: boolean;
  isFloating: boolean;
  createdAt: Date;
}

export interface AdaptiveLayoutState {
  layoutState: LayoutState;
  panels: Panel[];
  activePanel: string | null;
}

// =============================================================================
// ACTIONS
// =============================================================================

type LayoutAction =
  | { type: 'SPAWN_PANEL'; payload: { type: PanelType; title: string; data: unknown } }
  | { type: 'CLOSE_PANEL'; payload: { id: string } }
  | { type: 'SET_ACTIVE_PANEL'; payload: { id: string | null } }
  | { type: 'PIN_PANEL'; payload: { id: string } }
  | { type: 'UNPIN_PANEL'; payload: { id: string } }
  | { type: 'POP_OUT_PANEL'; payload: { id: string } }
  | { type: 'POP_IN_PANEL'; payload: { id: string } }
  | { type: 'SET_LAYOUT_STATE'; payload: { state: LayoutState } }
  | { type: 'RESET' };

// =============================================================================
// HELPERS
// =============================================================================

function generatePanelId(): string {
  return `panel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function calculateLayoutState(panels: Panel[]): LayoutState {
  const dockedPanels = panels.filter((p) => !p.isFloating);
  if (dockedPanels.length === 0) return 'focused';
  if (dockedPanels.length === 1) return 'split';
  return 'multi';
}

// =============================================================================
// REDUCER
// =============================================================================

const initialState: AdaptiveLayoutState = {
  layoutState: 'focused',
  panels: [],
  activePanel: null,
};

function layoutReducer(
  state: AdaptiveLayoutState,
  action: LayoutAction
): AdaptiveLayoutState {
  switch (action.type) {
    case 'SPAWN_PANEL': {
      const newPanel: Panel = {
        id: generatePanelId(),
        type: action.payload.type,
        title: action.payload.title,
        data: action.payload.data,
        isPinned: false,
        isFloating: false,
        createdAt: new Date(),
      };

      const newPanels = [...state.panels, newPanel];
      const newLayoutState = calculateLayoutState(newPanels);

      return {
        ...state,
        panels: newPanels,
        layoutState: newLayoutState,
        activePanel: newPanel.id,
      };
    }

    case 'CLOSE_PANEL': {
      const newPanels = state.panels.filter((p) => p.id !== action.payload.id);
      const newLayoutState = calculateLayoutState(newPanels);

      // If closing the active panel, select another one or null
      let newActivePanel = state.activePanel;
      if (state.activePanel === action.payload.id) {
        const dockedPanels = newPanels.filter((p) => !p.isFloating);
        newActivePanel = dockedPanels.length > 0 ? dockedPanels[0].id : null;
      }

      return {
        ...state,
        panels: newPanels,
        layoutState: newLayoutState,
        activePanel: newActivePanel,
      };
    }

    case 'SET_ACTIVE_PANEL': {
      return {
        ...state,
        activePanel: action.payload.id,
      };
    }

    case 'PIN_PANEL': {
      return {
        ...state,
        panels: state.panels.map((p) =>
          p.id === action.payload.id ? { ...p, isPinned: true } : p
        ),
      };
    }

    case 'UNPIN_PANEL': {
      return {
        ...state,
        panels: state.panels.map((p) =>
          p.id === action.payload.id ? { ...p, isPinned: false } : p
        ),
      };
    }

    case 'POP_OUT_PANEL': {
      const newPanels = state.panels.map((p) =>
        p.id === action.payload.id ? { ...p, isFloating: true } : p
      );
      const newLayoutState = calculateLayoutState(newPanels);

      // Select another docked panel if the popped out one was active
      let newActivePanel = state.activePanel;
      if (state.activePanel === action.payload.id) {
        const dockedPanels = newPanels.filter((p) => !p.isFloating);
        newActivePanel = dockedPanels.length > 0 ? dockedPanels[0].id : null;
      }

      return {
        ...state,
        panels: newPanels,
        layoutState: newLayoutState,
        activePanel: newActivePanel,
      };
    }

    case 'POP_IN_PANEL': {
      const newPanels = state.panels.map((p) =>
        p.id === action.payload.id ? { ...p, isFloating: false } : p
      );
      const newLayoutState = calculateLayoutState(newPanels);

      return {
        ...state,
        panels: newPanels,
        layoutState: newLayoutState,
        activePanel: action.payload.id,
      };
    }

    case 'SET_LAYOUT_STATE': {
      return {
        ...state,
        layoutState: action.payload.state,
      };
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

export interface UseAdaptiveLayoutOptions {
  initialState?: Partial<AdaptiveLayoutState>;
}

export interface UseAdaptiveLayoutResult {
  /** Current layout state */
  layoutState: LayoutState;
  /** All panels (docked and floating) */
  panels: Panel[];
  /** Docked panels only */
  dockedPanels: Panel[];
  /** Floating panels only */
  floatingPanels: Panel[];
  /** Currently active panel ID */
  activePanel: string | null;
  /** Active panel object */
  activePanelData: Panel | null;
  /** Spawn a new panel */
  spawnPanel: (type: PanelType, title: string, data: unknown) => void;
  /** Close a panel by ID */
  closePanel: (id: string) => void;
  /** Pin a panel to prevent auto-close */
  pinPanel: (id: string) => void;
  /** Unpin a panel */
  unpinPanel: (id: string) => void;
  /** Pop out a panel to floating mode */
  popOutPanel: (id: string) => void;
  /** Pop in a floating panel back to docked mode */
  popInPanel: (id: string) => void;
  /** Set the active panel */
  setActivePanel: (id: string | null) => void;
  /** Reset to initial state */
  reset: () => void;
  /** Check if a panel exists by type */
  hasPanelOfType: (type: PanelType) => boolean;
  /** Get panel by type */
  getPanelByType: (type: PanelType) => Panel | undefined;
}

export function useAdaptiveLayout(
  options: UseAdaptiveLayoutOptions = {}
): UseAdaptiveLayoutResult {
  const [state, dispatch] = useReducer(layoutReducer, {
    ...initialState,
    ...options.initialState,
  });

  // Computed values
  const dockedPanels = useMemo(
    () => state.panels.filter((p) => !p.isFloating),
    [state.panels]
  );

  const floatingPanels = useMemo(
    () => state.panels.filter((p) => p.isFloating),
    [state.panels]
  );

  const activePanelData = useMemo(
    () => state.panels.find((p) => p.id === state.activePanel) ?? null,
    [state.panels, state.activePanel]
  );

  // Actions
  const spawnPanel = useCallback((type: PanelType, title: string, data: unknown) => {
    dispatch({ type: 'SPAWN_PANEL', payload: { type, title, data } });
  }, []);

  const closePanel = useCallback((id: string) => {
    dispatch({ type: 'CLOSE_PANEL', payload: { id } });
  }, []);

  const pinPanel = useCallback((id: string) => {
    dispatch({ type: 'PIN_PANEL', payload: { id } });
  }, []);

  const unpinPanel = useCallback((id: string) => {
    dispatch({ type: 'UNPIN_PANEL', payload: { id } });
  }, []);

  const popOutPanel = useCallback((id: string) => {
    dispatch({ type: 'POP_OUT_PANEL', payload: { id } });
  }, []);

  const popInPanel = useCallback((id: string) => {
    dispatch({ type: 'POP_IN_PANEL', payload: { id } });
  }, []);

  const setActivePanel = useCallback((id: string | null) => {
    dispatch({ type: 'SET_ACTIVE_PANEL', payload: { id } });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const hasPanelOfType = useCallback(
    (type: PanelType) => state.panels.some((p) => p.type === type),
    [state.panels]
  );

  const getPanelByType = useCallback(
    (type: PanelType) => state.panels.find((p) => p.type === type),
    [state.panels]
  );

  return {
    layoutState: state.layoutState,
    panels: state.panels,
    dockedPanels,
    floatingPanels,
    activePanel: state.activePanel,
    activePanelData,
    spawnPanel,
    closePanel,
    pinPanel,
    unpinPanel,
    popOutPanel,
    popInPanel,
    setActivePanel,
    reset,
    hasPanelOfType,
    getPanelByType,
  };
}

export default useAdaptiveLayout;
