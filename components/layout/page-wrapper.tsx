'use client';

import { Sidebar, useSidebar } from './sidebar';
import { AppFooter } from './app-footer';
import { cn } from '@/lib/utils';

interface PageWrapperProps {
  children: React.ReactNode;
  showFooter?: boolean;
}

export function PageWrapper({ children, showFooter = true }: PageWrapperProps) {
  const { isCollapsed } = useSidebar();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className={cn(
        'flex-1 flex flex-col transition-all duration-200',
        isCollapsed ? 'ml-16' : 'ml-64'
      )}>
        <main className="flex-1">
          {children}
        </main>
        {showFooter && <AppFooter />}
      </div>
    </div>
  );
}
