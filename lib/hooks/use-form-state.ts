'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

// Default debounce delay for state updates
const DEFAULT_DEBOUNCE_MS = 300;

interface UseFormStateOptions<T> {
  /** Initial value from server/API */
  initialValue: T;
  /** Debounce delay in milliseconds (default: 300ms) */
  debounceMs?: number;
  /** Callback when form is saved */
  onSave?: (value: T, signal?: AbortSignal) => void | Promise<void> | Promise<unknown>;
  /** Whether the form is read-only */
  disabled?: boolean;
}

interface UseFormStateReturn<T> {
  /** Current form value (optimistic/local state) */
  value: T;
  /** Update a single field in the form */
  updateField: <K extends keyof T>(field: K, fieldValue: T[K]) => void;
  /** Update multiple fields at once */
  updateFields: (updates: Partial<T>) => void;
  /** Reset form to server/initial value */
  reset: () => void;
  /** Save the current form state */
  save: () => Promise<void>;
  /** Whether the form has unsaved changes */
  isDirty: boolean;
  /** Whether a save operation is in progress */
  isSaving: boolean;
  /** Error from the last save attempt */
  saveError: Error | null;
  /** Whether the last save was successful */
  saveSuccess: boolean;
  /** Clear the save success/error state */
  clearStatus: () => void;
}

/**
 * Deep equality check for objects
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;

  const aKeys = Object.keys(a as object);
  const bKeys = Object.keys(b as object);

  if (aKeys.length !== bKeys.length) return false;

  for (const key of aKeys) {
    if (!deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) {
      return false;
    }
  }

  return true;
}

/**
 * Hook for managing form state with debouncing, dirty tracking, and optimistic updates.
 *
 * Features:
 * - Debounced state updates (300ms default) to reduce re-renders
 * - Dirty tracking to show "unsaved changes" indicator
 * - Optimistic updates with rollback on error
 * - AbortController integration for canceling pending saves
 * - Clear separation between local (UI) and server state
 *
 * @example
 * ```tsx
 * const {
 *   value: profile,
 *   updateField,
 *   isDirty,
 *   isSaving,
 *   save,
 * } = useFormState({
 *   initialValue: serverProfile,
 *   onSave: async (data) => {
 *     await api.updateProfile(data);
 *   },
 * });
 *
 * return (
 *   <form onSubmit={(e) => { e.preventDefault(); save(); }}>
 *     <input
 *       value={profile.name}
 *       onChange={(e) => updateField('name', e.target.value)}
 *     />
 *     {isDirty && <span>Unsaved changes</span>}
 *     <button disabled={isSaving}>Save</button>
 *   </form>
 * );
 * ```
 */
export function useFormState<T extends Record<string, unknown>>({
  initialValue,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  onSave,
  disabled = false,
}: UseFormStateOptions<T>): UseFormStateReturn<T> {
  // Server/persisted state (what was last saved or loaded)
  const [serverValue, setServerValue] = useState<T>(initialValue);
  // Local/optimistic state (what user sees and edits)
  const [localValue, setLocalValue] = useState<T>(initialValue);
  // Save operation state
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<Error | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Refs for debouncing and abort handling
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingUpdatesRef = useRef<Partial<T>>({});
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync with new initial value from server
  useEffect(() => {
    setServerValue(initialValue);
    // Only update local if not dirty
    if (deepEqual(localValue, serverValue)) {
      setLocalValue(initialValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValue]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Check if form has unsaved changes
  const isDirty = useMemo(() => !deepEqual(localValue, serverValue), [localValue, serverValue]);

  // Apply pending updates after debounce
  const applyPendingUpdates = useCallback(() => {
    const pending = pendingUpdatesRef.current;
    if (Object.keys(pending).length > 0) {
      setLocalValue((prev) => ({ ...prev, ...pending }));
      pendingUpdatesRef.current = {};
    }
  }, []);

  // Update a single field with debouncing
  const updateField = useCallback(
    <K extends keyof T>(field: K, fieldValue: T[K]) => {
      if (disabled) return;

      // Queue the update
      pendingUpdatesRef.current = {
        ...pendingUpdatesRef.current,
        [field]: fieldValue,
      };

      // Clear any existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Immediately update for responsive UI (but still debounce batching)
      setLocalValue((prev) => ({ ...prev, [field]: fieldValue }));

      // Schedule batch update (for any additional changes)
      debounceTimerRef.current = setTimeout(applyPendingUpdates, debounceMs);
    },
    [disabled, debounceMs, applyPendingUpdates]
  );

  // Update multiple fields at once
  const updateFields = useCallback(
    (updates: Partial<T>) => {
      if (disabled) return;

      // Queue all updates
      pendingUpdatesRef.current = {
        ...pendingUpdatesRef.current,
        ...updates,
      };

      // Clear any existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Immediately update for responsive UI
      setLocalValue((prev) => ({ ...prev, ...updates }));

      // Schedule batch update
      debounceTimerRef.current = setTimeout(applyPendingUpdates, debounceMs);
    },
    [disabled, debounceMs, applyPendingUpdates]
  );

  // Reset to server value
  const reset = useCallback(() => {
    setLocalValue(serverValue);
    pendingUpdatesRef.current = {};
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setSaveError(null);
    setSaveSuccess(false);
  }, [serverValue]);

  // Save the current form state
  const save = useCallback(async () => {
    if (disabled || !onSave || isSaving) return;

    // Apply any pending updates first
    applyPendingUpdates();

    // Cancel any previous save operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this save
    abortControllerRef.current = new AbortController();

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    // Capture the value we're saving (for rollback)
    const valueToSave = localValue;
    const previousServerValue = serverValue;

    try {
      // Optimistically update server value
      setServerValue(valueToSave);

      await onSave(valueToSave, abortControllerRef.current.signal);

      setSaveSuccess(true);

      // Auto-clear success after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (error) {
      // Check if this was an abort
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      // Rollback server value on error
      setServerValue(previousServerValue);
      setSaveError(error instanceof Error ? error : new Error('Save failed'));
    } finally {
      setIsSaving(false);
      abortControllerRef.current = null;
    }
  }, [disabled, onSave, isSaving, localValue, serverValue, applyPendingUpdates]);

  // Clear status messages
  const clearStatus = useCallback(() => {
    setSaveError(null);
    setSaveSuccess(false);
  }, []);

  return {
    value: localValue,
    updateField,
    updateFields,
    reset,
    save,
    isDirty,
    isSaving,
    saveError,
    saveSuccess,
    clearStatus,
  };
}

export default useFormState;
