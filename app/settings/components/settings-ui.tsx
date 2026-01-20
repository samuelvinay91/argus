'use client';

import { Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Accessible toggle switch component with proper touch targets (44px minimum)
 * WCAG 2.1 AA compliant for mobile touch targets
 */
interface ToggleProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  'aria-label'?: string;
}

export function Toggle({
  checked,
  onChange,
  disabled = false,
  'aria-label': ariaLabel,
}: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={cn(
        // Base styles - 44px height for WCAG touch target compliance
        'relative inline-flex h-11 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        // Track color
        checked ? 'bg-primary' : 'bg-muted',
        // Disabled state
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span
        className={cn(
          // Thumb - larger for better visibility
          'inline-block h-8 w-8 transform rounded-full bg-white shadow-md transition-transform',
          // Position based on state
          checked ? 'translate-x-5' : 'translate-x-1'
        )}
      />
    </button>
  );
}

/**
 * Loading spinner component for consistent loading states
 */
export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-8" role="status" aria-label="Loading">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

/**
 * Error message component for consistent error display
 */
interface ErrorMessageProps {
  message: string;
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <div
      className="flex items-center gap-2 p-4 rounded-lg bg-red-500/10 text-red-500"
      role="alert"
    >
      <AlertCircle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

/**
 * Section skeleton for loading states
 */
export function SectionSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-muted rounded" />
      <div className="h-4 w-64 bg-muted rounded" />
      <div className="space-y-3 mt-6">
        <div className="h-10 bg-muted rounded" />
        <div className="h-10 bg-muted rounded" />
        <div className="h-10 bg-muted rounded" />
      </div>
    </div>
  );
}

/**
 * Toggle row component for consistent toggle layout
 */
interface ToggleRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

export function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="font-medium">{label}</div>
        {description && (
          <div className="text-sm text-muted-foreground">{description}</div>
        )}
      </div>
      <Toggle
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        aria-label={label}
      />
    </div>
  );
}

/**
 * Get plan badge styling based on plan type
 */
export function getPlanBadgeColor(plan: string): string {
  switch (plan?.toLowerCase()) {
    case 'enterprise':
      return 'bg-purple-500/10 text-purple-500';
    case 'pro':
      return 'bg-blue-500/10 text-blue-500';
    case 'team':
      return 'bg-green-500/10 text-green-500';
    default:
      return 'bg-gray-500/10 text-gray-500';
  }
}
