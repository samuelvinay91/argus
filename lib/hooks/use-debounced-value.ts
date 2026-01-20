'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook that returns a debounced version of the provided value.
 * The debounced value only updates after the specified delay has passed
 * without the value changing.
 *
 * @param value - The value to debounce
 * @param delay - Debounce delay in milliseconds (default: 300ms)
 * @returns The debounced value
 *
 * @example
 * ```tsx
 * function SearchInput() {
 *   const [searchTerm, setSearchTerm] = useState('');
 *   const debouncedSearchTerm = useDebouncedValue(searchTerm, 500);
 *
 *   useEffect(() => {
 *     // Only triggers after user stops typing for 500ms
 *     fetchSearchResults(debouncedSearchTerm);
 *   }, [debouncedSearchTerm]);
 *
 *   return (
 *     <input
 *       value={searchTerm}
 *       onChange={(e) => setSearchTerm(e.target.value)}
 *     />
 *   );
 * }
 * ```
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up the debounce timer
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup the timer on value change or unmount
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook that returns a debounced callback function.
 * The callback only executes after the specified delay has passed
 * since the last call.
 *
 * @param callback - The function to debounce
 * @param delay - Debounce delay in milliseconds (default: 300ms)
 * @returns A debounced version of the callback
 *
 * @example
 * ```tsx
 * function AutoSaveForm() {
 *   const debouncedSave = useDebouncedCallback(
 *     (data) => api.save(data),
 *     1000
 *   );
 *
 *   return (
 *     <input
 *       onChange={(e) => debouncedSave({ value: e.target.value })}
 *     />
 *   );
 * }
 * ```
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay = 300
): (...args: Parameters<T>) => void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      // Clear any existing timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      // Set up new timer
      timerRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  );
}

/**
 * Hook that provides both immediate and debounced state management.
 * Useful when you need immediate UI feedback but debounced side effects.
 *
 * @param initialValue - Initial state value
 * @param delay - Debounce delay in milliseconds (default: 300ms)
 *
 * @example
 * ```tsx
 * function FilterInput() {
 *   const [value, debouncedValue, setValue] = useDebouncedState('', 500);
 *
 *   useEffect(() => {
 *     // Only triggers after typing stops
 *     fetchFilteredData(debouncedValue);
 *   }, [debouncedValue]);
 *
 *   return (
 *     <input
 *       value={value}  // Immediate UI feedback
 *       onChange={(e) => setValue(e.target.value)}
 *     />
 *   );
 * }
 * ```
 */
export function useDebouncedState<T>(
  initialValue: T,
  delay = 300
): [T, T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(initialValue);
  const debouncedValue = useDebouncedValue(value, delay);

  return [value, debouncedValue, setValue];
}

export default useDebouncedValue;
