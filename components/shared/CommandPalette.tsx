'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import {
  LayoutDashboard,
  FolderKanban,
  MessageSquare,
  TestTube,
  Compass,
  Eye,
  Calendar,
  Table2,
  Shield,
  Brain,
  Globe,
  AlertCircle,
  AlertTriangle,
  Wrench,
  BarChart3,
  Users,
  Key,
  ScrollText,
  Bell,
  Activity,
  Zap,
  Settings,
  Play,
  Plus,
  Search,
  FileText,
  Clock,
  Moon,
  Sun,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommandItem {
  id: string;
  name: string;
  shortcut?: string[];
  icon: React.ReactNode;
  action: () => void;
  keywords?: string[];
  section: 'navigation' | 'actions' | 'recent';
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const router = useRouter();

  // Navigation items
  const navigationItems: CommandItem[] = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      icon: <LayoutDashboard className="h-4 w-4" />,
      action: () => router.push('/dashboard'),
      keywords: ['home', 'overview', 'main'],
      section: 'navigation',
    },
    {
      id: 'projects',
      name: 'Projects',
      icon: <FolderKanban className="h-4 w-4" />,
      action: () => router.push('/projects'),
      keywords: ['apps', 'applications'],
      section: 'navigation',
    },
    {
      id: 'chat',
      name: 'AI Chat',
      icon: <MessageSquare className="h-4 w-4" />,
      action: () => router.push('/'),
      keywords: ['assistant', 'ai', 'conversation'],
      section: 'navigation',
    },
    {
      id: 'tests',
      name: 'Test Runner',
      icon: <TestTube className="h-4 w-4" />,
      action: () => router.push('/tests'),
      keywords: ['execute', 'run'],
      section: 'navigation',
    },
    {
      id: 'discovery',
      name: 'Discovery',
      icon: <Compass className="h-4 w-4" />,
      action: () => router.push('/discovery'),
      keywords: ['find', 'testable', 'surfaces'],
      section: 'navigation',
    },
    {
      id: 'visual',
      name: 'Visual AI',
      icon: <Eye className="h-4 w-4" />,
      action: () => router.push('/visual'),
      keywords: ['regression', 'screenshots', 'compare'],
      section: 'navigation',
    },
    {
      id: 'schedules',
      name: 'Schedules',
      icon: <Calendar className="h-4 w-4" />,
      action: () => router.push('/schedules'),
      keywords: ['cron', 'automated', 'recurring'],
      section: 'navigation',
    },
    {
      id: 'parameterized',
      name: 'Parameterized Tests',
      icon: <Table2 className="h-4 w-4" />,
      action: () => router.push('/parameterized'),
      keywords: ['data-driven', 'variables', 'datasets'],
      section: 'navigation',
    },
    {
      id: 'quality',
      name: 'Quality Audit',
      icon: <Shield className="h-4 w-4" />,
      action: () => router.push('/quality'),
      keywords: ['code', 'health', 'analysis'],
      section: 'navigation',
    },
    {
      id: 'insights',
      name: 'AI Insights',
      icon: <Brain className="h-4 w-4" />,
      action: () => router.push('/insights'),
      keywords: ['patterns', 'analysis', 'recommendations'],
      section: 'navigation',
    },
    {
      id: 'global',
      name: 'Global Testing',
      icon: <Globe className="h-4 w-4" />,
      action: () => router.push('/global'),
      keywords: ['cross-browser', 'regions', 'devices'],
      section: 'navigation',
    },
    {
      id: 'intelligence',
      name: 'Intelligence',
      icon: <AlertCircle className="h-4 w-4" />,
      action: () => router.push('/intelligence'),
      keywords: ['score', 'quality', 'metrics'],
      section: 'navigation',
    },
    {
      id: 'flaky',
      name: 'Flaky Tests',
      icon: <AlertTriangle className="h-4 w-4" />,
      action: () => router.push('/flaky'),
      keywords: ['unstable', 'unreliable', 'intermittent'],
      section: 'navigation',
    },
    {
      id: 'healing',
      name: 'Self-Healing',
      icon: <Wrench className="h-4 w-4" />,
      action: () => router.push('/healing'),
      keywords: ['autofix', 'repair', 'selectors'],
      section: 'navigation',
    },
    {
      id: 'reports',
      name: 'Reports',
      icon: <BarChart3 className="h-4 w-4" />,
      action: () => router.push('/reports'),
      keywords: ['analytics', 'statistics', 'charts'],
      section: 'navigation',
    },
    {
      id: 'team',
      name: 'Team',
      icon: <Users className="h-4 w-4" />,
      action: () => router.push('/team'),
      keywords: ['members', 'users', 'invite'],
      section: 'navigation',
    },
    {
      id: 'api-keys',
      name: 'API Keys',
      icon: <Key className="h-4 w-4" />,
      action: () => router.push('/api-keys'),
      keywords: ['tokens', 'access', 'authentication'],
      section: 'navigation',
    },
    {
      id: 'audit',
      name: 'Audit Logs',
      icon: <ScrollText className="h-4 w-4" />,
      action: () => router.push('/audit'),
      keywords: ['logs', 'history', 'changes'],
      section: 'navigation',
    },
    {
      id: 'notifications',
      name: 'Notifications',
      icon: <Bell className="h-4 w-4" />,
      action: () => router.push('/notifications'),
      keywords: ['alerts', 'channels', 'slack', 'email'],
      section: 'navigation',
    },
    {
      id: 'activity',
      name: 'Activity',
      icon: <Activity className="h-4 w-4" />,
      action: () => router.push('/activity'),
      keywords: ['live', 'feed', 'events'],
      section: 'navigation',
    },
    {
      id: 'integrations',
      name: 'Integrations',
      icon: <Zap className="h-4 w-4" />,
      action: () => router.push('/integrations'),
      keywords: ['github', 'slack', 'jira', 'connect'],
      section: 'navigation',
    },
    {
      id: 'settings',
      name: 'Settings',
      icon: <Settings className="h-4 w-4" />,
      action: () => router.push('/settings'),
      keywords: ['preferences', 'config', 'options'],
      section: 'navigation',
    },
  ];

  // Action items
  const actionItems: CommandItem[] = [
    {
      id: 'run-all-tests',
      name: 'Run All Tests',
      shortcut: ['R'],
      icon: <Play className="h-4 w-4" />,
      action: () => {
        router.push('/tests');
        // TODO: Trigger test run
      },
      keywords: ['execute', 'start'],
      section: 'actions',
    },
    {
      id: 'create-test',
      name: 'Create New Test',
      shortcut: ['N'],
      icon: <Plus className="h-4 w-4" />,
      action: () => {
        router.push('/tests');
        // TODO: Open new test modal
      },
      keywords: ['add', 'new'],
      section: 'actions',
    },
    {
      id: 'create-project',
      name: 'Create New Project',
      icon: <FolderKanban className="h-4 w-4" />,
      action: () => {
        router.push('/projects');
        // TODO: Open new project modal
      },
      keywords: ['add', 'new', 'app'],
      section: 'actions',
    },
    {
      id: 'search-tests',
      name: 'Search Tests',
      icon: <Search className="h-4 w-4" />,
      action: () => router.push('/tests'),
      keywords: ['find', 'filter'],
      section: 'actions',
    },
    {
      id: 'view-reports',
      name: 'View Latest Report',
      icon: <FileText className="h-4 w-4" />,
      action: () => router.push('/reports'),
      keywords: ['analytics', 'results'],
      section: 'actions',
    },
    {
      id: 'view-activity',
      name: 'View Recent Activity',
      icon: <Clock className="h-4 w-4" />,
      action: () => router.push('/activity'),
      keywords: ['history', 'events'],
      section: 'actions',
    },
  ];

  // All items combined
  const allItems = [...navigationItems, ...actionItems];

  // Toggle palette with Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleSelect = useCallback((item: CommandItem) => {
    setOpen(false);
    setSearch('');
    item.action();
  }, []);

  return (
    <>
      {/* Trigger button - fixed position on desktop */}
      <button
        onClick={() => setOpen(true)}
        className="hidden lg:flex fixed top-4 right-4 z-40 items-center gap-2 h-9 px-3 text-sm text-muted-foreground rounded-md border bg-card shadow-sm hover:bg-muted transition-colors"
      >
        <Search className="h-4 w-4" />
        <span>Search...</span>
        <kbd className="ml-4 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* Command Dialog */}
      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Command Palette"
        className={cn(
          'fixed inset-0 z-50',
          open ? 'pointer-events-auto' : 'pointer-events-none'
        )}
      >
        {/* Backdrop */}
        <div
          className={cn(
            'fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity duration-200',
            open ? 'opacity-100' : 'opacity-0'
          )}
          onClick={() => setOpen(false)}
        />

        {/* Dialog */}
        <div className="fixed left-1/2 top-[20%] -translate-x-1/2 w-full max-w-xl">
          <div
            className={cn(
              'rounded-xl border bg-card shadow-2xl overflow-hidden transition-all duration-200',
              open ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            )}
          >
            {/* Input */}
            <div className="flex items-center border-b px-4">
              <Search className="h-4 w-4 text-muted-foreground mr-2" />
              <Command.Input
                value={search}
                onValueChange={setSearch}
                placeholder="Type a command or search..."
                className="flex-1 h-12 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
              />
              <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <Command.List className="max-h-80 overflow-y-auto p-2">
              <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                No results found.
              </Command.Empty>

              {/* Actions Group */}
              <Command.Group heading="Quick Actions" className="px-2">
                {actionItems.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={`${item.name} ${item.keywords?.join(' ')}`}
                    onSelect={() => handleSelect(item)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer hover:bg-muted aria-selected:bg-muted transition-colors"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-md border bg-background">
                      {item.icon}
                    </span>
                    <span className="flex-1">{item.name}</span>
                    {item.shortcut && (
                      <div className="flex items-center gap-1">
                        {item.shortcut.map((key, i) => (
                          <kbd
                            key={i}
                            className="h-5 px-1.5 inline-flex items-center rounded border bg-muted font-mono text-[10px] font-medium text-muted-foreground"
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>

              {/* Navigation Group */}
              <Command.Group heading="Navigation" className="px-2 mt-2">
                {navigationItems.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={`${item.name} ${item.keywords?.join(' ')}`}
                    onSelect={() => handleSelect(item)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer hover:bg-muted aria-selected:bg-muted transition-colors"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-md border bg-background">
                      {item.icon}
                    </span>
                    <span className="flex-1">{item.name}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            </Command.List>

            {/* Footer */}
            <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="h-4 px-1 rounded border bg-muted font-mono text-[10px]">↑↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="h-4 px-1 rounded border bg-muted font-mono text-[10px]">↵</kbd>
                  Select
                </span>
              </div>
              <span className="flex items-center gap-1">
                <kbd className="h-4 px-1 rounded border bg-muted font-mono text-[10px]">ESC</kbd>
                Close
              </span>
            </div>
          </div>
        </div>
      </Command.Dialog>
    </>
  );
}
