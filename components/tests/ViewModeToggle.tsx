'use client';

import { useEffect, useState, useRef } from 'react';
import { LayoutList, Grid3X3, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ViewMode = 'timeline' | 'grid' | 'list';

const STORAGE_KEY = 'skopaq-test-results-view-mode';

export interface ViewModeToggleProps {
  value?: ViewMode;
  onChange: (mode: ViewMode) => void;
  className?: string;
}

const viewModes: { mode: ViewMode; icon: React.ComponentType<{ className?: string; size?: number }>; label: string }[] = [
  { mode: 'timeline', icon: Clock, label: 'Timeline' },
  { mode: 'grid', icon: Grid3X3, label: 'Grid' },
  { mode: 'list', icon: LayoutList, label: 'List' },
];

export function ViewModeToggle({ value, onChange, className }: ViewModeToggleProps) {
  const [mounted, setMounted] = useState(false);
  const [internalMode, setInternalMode] = useState<ViewMode>('timeline');
  const onChangeRef = useRef(onChange);

  // Keep ref updated
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Load persisted preference on mount
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && ['timeline', 'grid', 'list'].includes(stored)) {
      const mode = stored as ViewMode;
      setInternalMode(mode);
      onChangeRef.current(mode);
    }
  }, []);

  // Sync with controlled value
  useEffect(() => {
    if (value !== undefined) {
      setInternalMode(value);
    }
  }, [value]);

  const handleModeChange = (mode: ViewMode) => {
    setInternalMode(mode);
    onChange(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  };

  const activeMode = value ?? internalMode;

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className={cn('flex items-center border rounded-lg p-1', className)}>
        {viewModes.map(({ mode, icon: Icon, label }) => (
          <Button
            key={mode}
            variant="ghost"
            size="sm"
            className="h-7 px-2 gap-1.5"
            disabled
          >
            <Icon className="h-4 w-4" />
            <span className="text-xs hidden sm:inline">{label}</span>
          </Button>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center border rounded-lg p-1', className)}>
      {viewModes.map(({ mode, icon: Icon, label }) => (
        <Button
          key={mode}
          variant={activeMode === mode ? 'secondary' : 'ghost'}
          size="sm"
          className={cn(
            'h-7 px-2 gap-1.5 transition-all',
            activeMode === mode && 'bg-secondary shadow-sm'
          )}
          onClick={() => handleModeChange(mode)}
          title={label}
        >
          <Icon className="h-4 w-4" />
          <span className="text-xs hidden sm:inline">{label}</span>
        </Button>
      ))}
    </div>
  );
}

// Hook to get persisted view mode preference
export function useViewModePreference(): ViewMode {
  const [mode, setMode] = useState<ViewMode>('timeline');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && ['timeline', 'grid', 'list'].includes(stored)) {
      setMode(stored as ViewMode);
    }
  }, []);

  return mode;
}
