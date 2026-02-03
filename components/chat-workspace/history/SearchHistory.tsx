'use client';

import * as React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SearchHistoryProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const SearchHistory = React.forwardRef<HTMLInputElement, SearchHistoryProps>(
  ({ value, onChange, placeholder = 'Search conversations...', className }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [isFocused, setIsFocused] = React.useState(false);

    // Forward ref
    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    // Debounced onChange
    const [localValue, setLocalValue] = React.useState(value);
    const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);

    React.useEffect(() => {
      setLocalValue(value);
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setLocalValue(newValue);

      // Debounce the onChange callback
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        onChange(newValue);
      }, 150);
    };

    const handleClear = () => {
      setLocalValue('');
      onChange('');
      inputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (localValue) {
          handleClear();
          e.stopPropagation();
        }
      }
    };

    // Cleanup debounce timer
    React.useEffect(() => {
      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
      };
    }, []);

    return (
      <div className={cn('relative', className)}>
        {/* Search icon */}
        <div
          className={cn(
            'absolute left-3 top-1/2 -translate-y-1/2',
            'pointer-events-none',
            'transition-colors duration-150',
            isFocused ? 'text-indigo-400' : 'text-white/40'
          )}
        >
          <Search className="w-4 h-4" />
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={localValue}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            'w-full pl-10 pr-9 py-2.5',
            'bg-white/[0.06] hover:bg-white/[0.08]',
            'border border-white/[0.08]',
            'rounded-xl',
            'text-sm text-white placeholder:text-white/40',
            'backdrop-blur-[20px]',
            'transition-all duration-200 ease-out',
            'focus:outline-none focus:bg-white/[0.10]',
            'focus:border-indigo-500/50',
            'focus:ring-2 focus:ring-indigo-500/20',
            isFocused && 'shadow-[0_0_20px_rgba(99,102,241,0.15)]'
          )}
          aria-label={placeholder}
        />

        {/* Clear button */}
        {localValue && (
          <button
            onClick={handleClear}
            className={cn(
              'absolute right-2.5 top-1/2 -translate-y-1/2',
              'p-1 rounded-md',
              'text-white/40 hover:text-white/70',
              'hover:bg-white/[0.08]',
              'transition-colors duration-150',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50'
            )}
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }
);

SearchHistory.displayName = 'SearchHistory';

export { SearchHistory };
