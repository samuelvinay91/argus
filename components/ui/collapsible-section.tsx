'use client';

import * as React from 'react';
import * as Collapsible from '@radix-ui/react-collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-media-query';

/**
 * CollapsibleSection - Progressive disclosure with auto-collapse on mobile
 *
 * Features:
 * - Auto-collapses on mobile to save space
 * - Smooth animations
 * - Optional count badge
 * - Customizable trigger
 */

export interface CollapsibleSectionProps {
  /** Section title */
  title: string;
  /** Section content */
  children: React.ReactNode;
  /** Whether section is open by default */
  defaultOpen?: boolean;
  /** Auto-collapse on mobile only */
  mobileCollapsed?: boolean;
  /** Optional count badge (e.g., number of items) */
  count?: number;
  /** Optional description */
  description?: string;
  /** Optional icon before title */
  icon?: React.ReactNode;
  /** Additional className for the container */
  className?: string;
  /** Additional className for the content */
  contentClassName?: string;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
}

export function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
  mobileCollapsed = true,
  count,
  description,
  icon,
  className,
  contentClassName,
  onOpenChange,
}: CollapsibleSectionProps) {
  const isMobile = useIsMobile();

  // Determine initial open state
  const initialOpen = mobileCollapsed && isMobile ? false : defaultOpen;
  const [isOpen, setIsOpen] = React.useState(initialOpen);

  // Update state when mobile/desktop changes
  React.useEffect(() => {
    if (mobileCollapsed) {
      setIsOpen(isMobile ? false : defaultOpen);
    }
  }, [isMobile, mobileCollapsed, defaultOpen]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    onOpenChange?.(open);
  };

  return (
    <Collapsible.Root
      open={isOpen}
      onOpenChange={handleOpenChange}
      className={className}
    >
      <Collapsible.Trigger asChild>
        <button
          type="button"
          className={cn(
            'flex items-center justify-between w-full',
            'py-2 px-1 -mx-1 rounded-lg',
            'hover:bg-muted/50 transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
        >
          <div className="flex items-center gap-2">
            {icon && (
              <span className="h-5 w-5 text-muted-foreground">{icon}</span>
            )}
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{title}</span>
                {count !== undefined && (
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                    {count}
                  </span>
                )}
              </div>
              {description && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {description}
                </p>
              )}
            </div>
          </div>
          <span className="text-muted-foreground">
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </span>
        </button>
      </Collapsible.Trigger>

      <Collapsible.Content
        className={cn(
          'overflow-hidden',
          'data-[state=open]:animate-accordion-down',
          'data-[state=closed]:animate-accordion-up',
          contentClassName
        )}
      >
        <div className="pt-2">{children}</div>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

/**
 * CollapsibleCard - Collapsible section styled as a card
 */
export interface CollapsibleCardProps extends CollapsibleSectionProps {
  /** Additional header content (right side) */
  headerAction?: React.ReactNode;
}

export function CollapsibleCard({
  title,
  children,
  defaultOpen = true,
  mobileCollapsed = true,
  count,
  description,
  icon,
  headerAction,
  className,
  contentClassName,
  onOpenChange,
}: CollapsibleCardProps) {
  const isMobile = useIsMobile();

  const initialOpen = mobileCollapsed && isMobile ? false : defaultOpen;
  const [isOpen, setIsOpen] = React.useState(initialOpen);

  React.useEffect(() => {
    if (mobileCollapsed) {
      setIsOpen(isMobile ? false : defaultOpen);
    }
  }, [isMobile, mobileCollapsed, defaultOpen]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    onOpenChange?.(open);
  };

  return (
    <Collapsible.Root
      open={isOpen}
      onOpenChange={handleOpenChange}
      className={cn('rounded-xl border bg-card', className)}
    >
      <div className="flex items-center justify-between p-4">
        <Collapsible.Trigger asChild>
          <button
            type="button"
            className={cn(
              'flex items-center gap-2 flex-1',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded'
            )}
          >
            <span className="text-muted-foreground">
              {isOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </span>
            {icon && (
              <span className="h-5 w-5 text-muted-foreground">{icon}</span>
            )}
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="font-medium">{title}</span>
                {count !== undefined && (
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                    {count}
                  </span>
                )}
              </div>
              {description && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {description}
                </p>
              )}
            </div>
          </button>
        </Collapsible.Trigger>

        {headerAction && <div className="ml-2">{headerAction}</div>}
      </div>

      <Collapsible.Content
        className={cn(
          'overflow-hidden',
          'data-[state=open]:animate-accordion-down',
          'data-[state=closed]:animate-accordion-up'
        )}
      >
        <div className={cn('px-4 pb-4', contentClassName)}>{children}</div>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
