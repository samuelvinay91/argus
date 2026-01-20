'use client';

import { type ReactNode } from 'react';
import {
  Settings,
  Key,
  Bell,
  Shield,
  Info,
  User,
  Building,
  Cpu,
} from 'lucide-react';
import { Sidebar } from '@/components/layout/sidebar';
import { cn } from '@/lib/utils';

export type SettingsSection =
  | 'profile'
  | 'organization'
  | 'api'
  | 'ai'
  | 'notifications'
  | 'defaults'
  | 'security'
  | 'about';

interface SectionConfig {
  id: SettingsSection;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
}

const sections: SectionConfig[] = [
  { id: 'profile', name: 'Profile', icon: User },
  { id: 'organization', name: 'Organization', icon: Building },
  { id: 'api', name: 'API Keys', icon: Key },
  { id: 'ai', name: 'AI Configuration', icon: Cpu },
  { id: 'notifications', name: 'Notifications', icon: Bell },
  { id: 'defaults', name: 'Test Defaults', icon: Settings },
  { id: 'security', name: 'Security', icon: Shield },
  { id: 'about', name: 'About', icon: Info },
];

interface SettingsLayoutProps {
  /** Currently active section */
  activeSection: SettingsSection;
  /** Callback when section is changed */
  onSectionChange: (section: SettingsSection) => void;
  /** Header actions (e.g., save button) */
  headerActions?: ReactNode;
  /** Content to render in the main area */
  children: ReactNode;
}

/**
 * Shared layout component for the settings page.
 * Provides the sidebar navigation and header.
 */
export function SettingsLayout({
  activeSection,
  onSectionChange,
  headerActions,
  children,
}: SettingsLayoutProps) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-6">
          <div className="flex-1">
            <h1 className="text-xl font-semibold">Settings</h1>
            <p className="text-sm text-muted-foreground">
              Configure your profile and preferences
            </p>
          </div>
          {headerActions}
        </header>

        <div className="p-6">
          <div className="flex gap-6">
            {/* Sidebar Navigation */}
            <nav className="w-56 space-y-1" aria-label="Settings sections">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => onSectionChange(section.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left',
                    activeSection === section.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                  aria-current={activeSection === section.id ? 'page' : undefined}
                >
                  <section.icon className="h-4 w-4" aria-hidden="true" />
                  {section.name}
                </button>
              ))}
            </nav>

            {/* Settings Content */}
            <div className="flex-1 space-y-6">{children}</div>
          </div>
        </div>
      </main>
    </div>
  );
}

export { sections };
export type { SectionConfig };
