'use client';

import { cn } from '@/lib/utils';
import { useSidebar } from './sidebar';

interface MainContentProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * MainContent wrapper that automatically adjusts margin based on sidebar collapsed state.
 * Use this instead of hardcoded `lg:ml-64` in page components.
 *
 * @example
 * <MainContent className="min-w-0">
 *   <YourPageContent />
 * </MainContent>
 */
export function MainContent({ children, className }: MainContentProps) {
  const { isCollapsed } = useSidebar();

  return (
    <main
      className={cn(
        'flex-1 transition-all duration-200',
        // On mobile/tablet, no margin (sidebar is overlay)
        // On desktop (lg+), margin adjusts based on sidebar state
        isCollapsed ? 'lg:ml-16' : 'lg:ml-64',
        className
      )}
    >
      {children}
    </main>
  );
}
