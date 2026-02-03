'use client';

/**
 * SlashCommandMenu - Enhanced Command Palette
 *
 * A glassmorphic dropdown menu for slash commands with fuzzy search,
 * keyboard navigation, and grouped commands by category.
 */

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Command as CommandPrimitive } from 'cmdk';
import {
  Play,
  Wand2,
  Plus,
  Bug,
  Target,
  BarChart3,
  FileText,
  AlertTriangle,
  Rocket,
  GitBranch,
  ScrollText,
  Eye,
  Camera,
  HelpCircle,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlassCard } from '../glass';

// =============================================================================
// TYPES
// =============================================================================

export interface SlashCommand {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  command: string;
  category: CommandCategory;
  keywords?: string[];
}

export type CommandCategory =
  | 'test'
  | 'quality'
  | 'cicd'
  | 'visual'
  | 'help';

export interface SlashCommandMenuProps {
  /** Whether the menu is open */
  isOpen: boolean;
  /** Current filter string (text after /) */
  filter: string;
  /** Called when a command is selected */
  onSelect: (command: SlashCommand) => void;
  /** Called when menu should close */
  onClose: () => void;
  /** Position relative to input */
  position?: 'above' | 'below';
  /** Additional class names */
  className?: string;
}

// =============================================================================
// COMMAND REGISTRY
// =============================================================================

const CATEGORY_INFO: Record<CommandCategory, { label: string; icon: LucideIcon }> = {
  test: { label: 'Test', icon: Play },
  quality: { label: 'Quality', icon: BarChart3 },
  cicd: { label: 'CI/CD', icon: Rocket },
  visual: { label: 'Visual', icon: Eye },
  help: { label: 'Help', icon: HelpCircle },
};

const COMMANDS: SlashCommand[] = [
  // Test commands
  {
    id: 'test-run',
    name: 'Run Tests',
    description: 'Execute test suite or specific tests',
    icon: Play,
    command: '/test run',
    category: 'test',
    keywords: ['execute', 'start', 'launch'],
  },
  {
    id: 'test-create',
    name: 'Create Test',
    description: 'Generate new test from description',
    icon: Plus,
    command: '/test create',
    category: 'test',
    keywords: ['new', 'add', 'generate'],
  },
  {
    id: 'test-heal',
    name: 'Heal Tests',
    description: 'Auto-fix broken selectors and assertions',
    icon: Wand2,
    command: '/test heal',
    category: 'test',
    keywords: ['fix', 'repair', 'auto'],
  },
  {
    id: 'test-impact',
    name: 'Test Impact',
    description: 'Analyze which tests are affected by changes',
    icon: Target,
    command: '/test impact',
    category: 'test',
    keywords: ['affected', 'analysis', 'changes'],
  },
  {
    id: 'test-flaky',
    name: 'Detect Flaky',
    description: 'Find and analyze flaky tests',
    icon: AlertTriangle,
    command: '/test flaky',
    category: 'test',
    keywords: ['unstable', 'intermittent'],
  },

  // Quality commands
  {
    id: 'quality-score',
    name: 'Quality Score',
    description: 'Calculate overall quality metrics',
    icon: BarChart3,
    command: '/quality score',
    category: 'quality',
    keywords: ['metrics', 'health'],
  },
  {
    id: 'quality-report',
    name: 'Quality Report',
    description: 'Generate detailed quality report',
    icon: FileText,
    command: '/quality report',
    category: 'quality',
    keywords: ['summary', 'export'],
  },
  {
    id: 'quality-gaps',
    name: 'Coverage Gaps',
    description: 'Identify areas lacking test coverage',
    icon: Bug,
    command: '/quality gaps',
    category: 'quality',
    keywords: ['coverage', 'missing', 'untested'],
  },

  // CI/CD commands
  {
    id: 'cicd-status',
    name: 'Pipeline Status',
    description: 'Check CI/CD pipeline status',
    icon: GitBranch,
    command: '/cicd status',
    category: 'cicd',
    keywords: ['pipeline', 'build'],
  },
  {
    id: 'cicd-deploy',
    name: 'Deploy',
    description: 'Trigger deployment pipeline',
    icon: Rocket,
    command: '/cicd deploy',
    category: 'cicd',
    keywords: ['release', 'publish'],
  },
  {
    id: 'cicd-logs',
    name: 'Build Logs',
    description: 'View recent build logs',
    icon: ScrollText,
    command: '/cicd logs',
    category: 'cicd',
    keywords: ['output', 'console'],
  },

  // Visual commands
  {
    id: 'visual-compare',
    name: 'Compare Visuals',
    description: 'Compare screenshots for visual changes',
    icon: Eye,
    command: '/visual compare',
    category: 'visual',
    keywords: ['diff', 'screenshot'],
  },
  {
    id: 'visual-baseline',
    name: 'Update Baseline',
    description: 'Set new visual baseline images',
    icon: Camera,
    command: '/visual baseline',
    category: 'visual',
    keywords: ['snapshot', 'reference'],
  },

  // Help commands
  {
    id: 'help',
    name: 'Help',
    description: 'Show available commands and tips',
    icon: HelpCircle,
    command: '/help',
    category: 'help',
    keywords: ['commands', 'guide', 'docs'],
  },
];

// =============================================================================
// COMPONENT
// =============================================================================

const SlashCommandMenu = React.forwardRef<HTMLDivElement, SlashCommandMenuProps>(
  (
    {
      isOpen,
      filter,
      onSelect,
      onClose,
      position = 'above',
      className,
    },
    ref
  ) => {
    const [selectedIndex, setSelectedIndex] = React.useState(0);

    // Filter commands based on input
    const filteredCommands = React.useMemo(() => {
      if (!filter) return COMMANDS;

      const lowerFilter = filter.toLowerCase();
      return COMMANDS.filter((cmd) => {
        return (
          cmd.name.toLowerCase().includes(lowerFilter) ||
          cmd.description.toLowerCase().includes(lowerFilter) ||
          cmd.command.toLowerCase().includes(lowerFilter) ||
          cmd.keywords?.some((kw) => kw.toLowerCase().includes(lowerFilter))
        );
      });
    }, [filter]);

    // Group by category
    const groupedCommands = React.useMemo(() => {
      const groups: Record<CommandCategory, SlashCommand[]> = {
        test: [],
        quality: [],
        cicd: [],
        visual: [],
        help: [],
      };

      filteredCommands.forEach((cmd) => {
        groups[cmd.category].push(cmd);
      });

      return groups;
    }, [filteredCommands]);

    // Flatten for keyboard navigation
    const flatCommands = React.useMemo(() => {
      return Object.values(groupedCommands).flat();
    }, [groupedCommands]);

    // Reset selection when filter changes
    React.useEffect(() => {
      setSelectedIndex(0);
    }, [filter]);

    // Keyboard navigation
    React.useEffect(() => {
      if (!isOpen) return;

      const handleKeyDown = (e: KeyboardEvent) => {
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            setSelectedIndex((prev) =>
              prev < flatCommands.length - 1 ? prev + 1 : 0
            );
            break;
          case 'ArrowUp':
            e.preventDefault();
            setSelectedIndex((prev) =>
              prev > 0 ? prev - 1 : flatCommands.length - 1
            );
            break;
          case 'Enter':
            e.preventDefault();
            if (flatCommands[selectedIndex]) {
              onSelect(flatCommands[selectedIndex]);
            }
            break;
          case 'Escape':
            e.preventDefault();
            onClose();
            break;
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, selectedIndex, flatCommands, onSelect, onClose]);

    const positionStyles = position === 'above'
      ? 'bottom-full mb-2'
      : 'top-full mt-2';

    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={ref}
            initial={{ opacity: 0, y: position === 'above' ? 10 : -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: position === 'above' ? 10 : -10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: [0.25, 0.4, 0.25, 1] }}
            className={cn(
              'absolute left-0 right-0 z-50',
              positionStyles,
              className
            )}
          >
            <GlassCard
              variant="prominent"
              padding="none"
              className="overflow-hidden shadow-2xl"
            >
              <CommandPrimitive
                className="flex flex-col"
                shouldFilter={false}
              >
                {/* Search hint */}
                <div className="px-3 py-2 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Sparkles className="w-3 h-3" />
                    <span>Type to filter commands</span>
                    <span className="ml-auto opacity-50">
                      {filteredCommands.length} available
                    </span>
                  </div>
                </div>

                {/* Command list */}
                <CommandPrimitive.List
                  className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10"
                >
                  {filteredCommands.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No commands found for "{filter}"
                    </div>
                  ) : (
                    Object.entries(groupedCommands).map(([category, commands]) => {
                      if (commands.length === 0) return null;

                      const categoryInfo = CATEGORY_INFO[category as CommandCategory];
                      const CategoryIcon = categoryInfo.icon;

                      return (
                        <CommandPrimitive.Group
                          key={category}
                          heading={
                            <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground">
                              <CategoryIcon className="w-3 h-3" />
                              {categoryInfo.label}
                            </div>
                          }
                        >
                          {commands.map((command) => {
                            const Icon = command.icon;
                            const isSelected =
                              flatCommands[selectedIndex]?.id === command.id;

                            return (
                              <CommandPrimitive.Item
                                key={command.id}
                                value={command.id}
                                onSelect={() => onSelect(command)}
                                className={cn(
                                  'flex items-center gap-3',
                                  'px-3 py-2.5 mx-1 rounded-lg',
                                  'cursor-pointer',
                                  'transition-colors duration-150',
                                  isSelected
                                    ? 'bg-primary/20 text-foreground'
                                    : 'hover:bg-white/[0.06] text-muted-foreground'
                                )}
                              >
                                <div
                                  className={cn(
                                    'flex items-center justify-center',
                                    'w-8 h-8 rounded-lg',
                                    isSelected
                                      ? 'bg-primary/20'
                                      : 'bg-white/[0.06]'
                                  )}
                                >
                                  <Icon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm">
                                    {command.name}
                                  </div>
                                  <div className="text-xs text-muted-foreground truncate">
                                    {command.description}
                                  </div>
                                </div>
                                <div className="text-xs text-muted-foreground/50 font-mono">
                                  {command.command}
                                </div>
                              </CommandPrimitive.Item>
                            );
                          })}
                        </CommandPrimitive.Group>
                      );
                    })
                  )}
                </CommandPrimitive.List>

                {/* Keyboard hints */}
                <div className="px-3 py-2 border-t border-white/[0.06] flex items-center gap-4 text-[10px] text-muted-foreground/50">
                  <span>
                    <kbd className="px-1 py-0.5 rounded bg-white/[0.06]">↑↓</kbd> navigate
                  </span>
                  <span>
                    <kbd className="px-1 py-0.5 rounded bg-white/[0.06]">Enter</kbd> select
                  </span>
                  <span>
                    <kbd className="px-1 py-0.5 rounded bg-white/[0.06]">Esc</kbd> close
                  </span>
                </div>
              </CommandPrimitive>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
);

SlashCommandMenu.displayName = 'SlashCommandMenu';

// =============================================================================
// EXPORTS
// =============================================================================

export { SlashCommandMenu, COMMANDS, CATEGORY_INFO };
