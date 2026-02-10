'use client';

import { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Search,
  Clock,
  Shield,
  FileText,
  Activity,
  List,
  Calendar,
  BarChart3,
  Lightbulb,
  Server,
  Sparkles,
  Command,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Slash command definitions
export interface SlashCommand {
  command: string;
  args?: string[];
  description: string;
  icon: typeof Play;
  category: 'test' | 'schedule' | 'report' | 'infra' | 'ai';
  transform: (args?: string) => string;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    command: '/run',
    args: ['test'],
    description: 'Run a test by name or ID',
    icon: Play,
    category: 'test',
    transform: (args) => `Run the test "${args || 'login'}"`,
  },
  {
    command: '/discover',
    args: ['url?'],
    description: 'Discover elements on a page',
    icon: Search,
    category: 'test',
    transform: (args) => `Discover all interactive elements on ${args || 'the current page'}`,
  },
  {
    command: '/create',
    args: ['description'],
    description: 'Create a new test from description',
    icon: Sparkles,
    category: 'test',
    transform: (args) => `Create a test: ${args || 'login with valid credentials'}`,
  },
  {
    command: '/schedule',
    args: ['test', 'when'],
    description: 'Schedule a recurring test run',
    icon: Clock,
    category: 'schedule',
    transform: (args) => {
      const parts = (args || '').split(' ');
      const when = parts.slice(1).join(' ') || 'daily at 9am';
      return `Schedule the ${parts[0] || 'login test'} to run ${when}`;
    },
  },
  {
    command: '/schedules',
    description: 'List all scheduled test runs',
    icon: Calendar,
    category: 'schedule',
    transform: () => 'Show me all my scheduled test runs',
  },
  {
    command: '/audit',
    args: ['url?'],
    description: 'Run quality audit (a11y, perf, SEO)',
    icon: Shield,
    category: 'report',
    transform: (args) => `Run a quality audit on ${args || 'the current page'}`,
  },
  {
    command: '/report',
    args: ['period?'],
    description: 'Generate test execution report',
    icon: FileText,
    category: 'report',
    transform: (args) => `Generate a test report for ${args || 'the past week'}`,
  },
  {
    command: '/insights',
    args: ['category?'],
    description: 'Get AI insights about patterns',
    icon: Lightbulb,
    category: 'ai',
    transform: (args) => `Show me AI insights ${args ? `about ${args}` : 'and recommendations'}`,
  },
  {
    command: '/status',
    description: 'Check system and browser pool status',
    icon: Activity,
    category: 'infra',
    transform: () => 'Check the status of all Skopaq components',
  },
  {
    command: '/infra',
    args: ['costs?'],
    description: 'Get browser pool infrastructure status',
    icon: Server,
    category: 'infra',
    transform: (args) => args === 'costs'
      ? 'Show me the browser pool costs and savings'
      : 'Show me the browser pool infrastructure status',
  },
  {
    command: '/tests',
    args: ['search?'],
    description: 'List tests with optional search',
    icon: List,
    category: 'test',
    transform: (args) => args
      ? `List all tests matching "${args}"`
      : 'List all my tests',
  },
  {
    command: '/runs',
    args: ['period?'],
    description: 'Show recent test runs',
    icon: BarChart3,
    category: 'test',
    transform: (args) => `Show me test runs from ${args || 'this week'}`,
  },
];

// Category colors
const CATEGORY_COLORS: Record<string, string> = {
  test: 'text-green-500',
  schedule: 'text-blue-500',
  report: 'text-purple-500',
  infra: 'text-orange-500',
  ai: 'text-pink-500',
};

interface SlashCommandMenuProps {
  input: string;
  onSelect: (transformedInput: string) => void;
  onClose: () => void;
  className?: string;
}

export const SlashCommandMenu = memo(function SlashCommandMenu({
  input,
  onSelect,
  onClose,
  className,
}: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Filter commands based on input
  const filteredCommands = useMemo(() => {
    // Strip the leading "/" for matching
    const query = input.slice(1).toLowerCase();

    if (!query) {
      return SLASH_COMMANDS;
    }

    // Check if input matches a command with args (e.g., "/run login")
    const parts = query.split(' ');
    const commandPart = parts[0];
    const argsPart = parts.slice(1).join(' ');

    // If there's a space, find exact command match and pass args
    if (parts.length > 1) {
      const exactMatch = SLASH_COMMANDS.find(
        c => c.command.toLowerCase() === `/${commandPart}`
      );
      if (exactMatch) {
        return [{ ...exactMatch, _args: argsPart }];
      }
    }

    // Otherwise filter by command prefix
    return SLASH_COMMANDS.filter(
      c => c.command.toLowerCase().startsWith(`/${commandPart}`)
    );
  }, [input]);

  // Reset selection when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands.length]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => (i + 1) % filteredCommands.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => (i - 1 + filteredCommands.length) % filteredCommands.length);
        break;
      case 'Tab':
      case 'Enter':
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          const cmd = filteredCommands[selectedIndex] as SlashCommand & { _args?: string };
          onSelect(cmd.transform(cmd._args || undefined));
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [filteredCommands, selectedIndex, onSelect, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Handle click selection
  const handleSelect = (index: number) => {
    const cmd = filteredCommands[index] as SlashCommand & { _args?: string };
    onSelect(cmd.transform(cmd._args || undefined));
  };

  if (filteredCommands.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className={cn(
        'absolute bottom-full left-0 right-0 mb-2 z-50',
        'bg-popover border rounded-lg shadow-lg overflow-hidden',
        'max-h-[300px] overflow-y-auto',
        className
      )}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b bg-muted/50 flex items-center gap-2">
        <Command className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">
          Slash Commands
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground">
          ↑↓ navigate • Tab select • Esc close
        </span>
      </div>

      {/* Commands list */}
      <div className="py-1">
        {filteredCommands.map((cmd, index) => {
          const Icon = cmd.icon;
          const isSelected = index === selectedIndex;

          return (
            <button
              key={cmd.command}
              onClick={() => handleSelect(index)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={cn(
                'w-full px-3 py-2 flex items-center gap-3 text-left transition-colors',
                isSelected ? 'bg-accent' : 'hover:bg-accent/50'
              )}
            >
              <div className={cn('p-1.5 rounded-md bg-muted', CATEGORY_COLORS[cmd.category])}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium">{cmd.command}</span>
                  {cmd.args && (
                    <span className="text-xs text-muted-foreground">
                      {cmd.args.map(a => `<${a}>`).join(' ')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {cmd.description}
                </p>
              </div>
              {isSelected && (
                <kbd className="hidden sm:inline-flex h-5 px-1.5 items-center rounded bg-muted text-[10px] font-mono">
                  Tab
                </kbd>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer with category legend */}
      <div className="px-3 py-2 border-t bg-muted/30 flex items-center gap-4 text-[10px] text-muted-foreground">
        <span className={cn('flex items-center gap-1', CATEGORY_COLORS.test)}>
          <span className="w-1.5 h-1.5 rounded-full bg-current" /> Test
        </span>
        <span className={cn('flex items-center gap-1', CATEGORY_COLORS.schedule)}>
          <span className="w-1.5 h-1.5 rounded-full bg-current" /> Schedule
        </span>
        <span className={cn('flex items-center gap-1', CATEGORY_COLORS.report)}>
          <span className="w-1.5 h-1.5 rounded-full bg-current" /> Report
        </span>
        <span className={cn('flex items-center gap-1', CATEGORY_COLORS.infra)}>
          <span className="w-1.5 h-1.5 rounded-full bg-current" /> Infra
        </span>
        <span className={cn('flex items-center gap-1', CATEGORY_COLORS.ai)}>
          <span className="w-1.5 h-1.5 rounded-full bg-current" /> AI
        </span>
      </div>
    </motion.div>
  );
});

// Hook to detect slash command input
export function useSlashCommands(input: string) {
  const isSlashCommand = input.startsWith('/') && !input.startsWith('//');
  const showMenu = isSlashCommand && input.length >= 1;

  return {
    isSlashCommand,
    showMenu,
  };
}

export default SlashCommandMenu;
