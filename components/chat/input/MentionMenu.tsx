/**
 * MentionMenu - @agent mention picker
 *
 * Shows a searchable list of available agents when user types @
 * Allows routing messages to specific agents.
 */

'use client';

import { memo, useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import {
  AGENT_CONFIG,
  searchAgents,
  getAgentsByCategory,
  type AgentType,
} from '@/lib/chat/agent-config';

// =============================================================================
// TYPES
// =============================================================================

export interface MentionMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (agentType: AgentType) => void;
  position?: { top: number; left: number };
  className?: string;
}

export interface MentionTriggerResult {
  isActive: boolean;
  query: string;
  startIndex: number;
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook to detect @ mentions in input text
 */
export function useMentionTrigger(
  inputValue: string,
  cursorPosition: number
): MentionTriggerResult {
  return useMemo(() => {
    if (!inputValue || cursorPosition === 0) {
      return { isActive: false, query: '', startIndex: -1 };
    }

    // Find the @ symbol before cursor
    const textBeforeCursor = inputValue.slice(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex === -1) {
      return { isActive: false, query: '', startIndex: -1 };
    }

    // Check if @ is at start or preceded by whitespace
    const charBeforeAt = lastAtIndex > 0 ? inputValue[lastAtIndex - 1] : ' ';
    if (charBeforeAt !== ' ' && charBeforeAt !== '\n') {
      return { isActive: false, query: '', startIndex: -1 };
    }

    // Extract query after @
    const query = textBeforeCursor.slice(lastAtIndex + 1);

    // Check if query contains spaces (mention completed)
    if (query.includes(' ')) {
      return { isActive: false, query: '', startIndex: -1 };
    }

    return {
      isActive: true,
      query,
      startIndex: lastAtIndex,
    };
  }, [inputValue, cursorPosition]);
}

// =============================================================================
// AGENT ITEM
// =============================================================================

interface AgentItemProps {
  agentType: AgentType;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}

const AgentItem = memo(function AgentItem({
  agentType,
  isSelected,
  onClick,
  onMouseEnter,
}: AgentItemProps) {
  const config = AGENT_CONFIG[agentType];
  const Icon = config.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 text-left rounded-md transition-colors',
        'hover:bg-accent focus:bg-accent focus:outline-none',
        isSelected && 'bg-accent'
      )}
    >
      {/* Agent Icon */}
      <div className={cn('p-1.5 rounded-md flex-shrink-0', config.bgColor)}>
        <Icon className={cn('w-4 h-4', config.color)} />
      </div>

      {/* Agent Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{config.name}</span>
        </div>
        {config.description && (
          <p className="text-xs text-muted-foreground truncate">
            {config.description}
          </p>
        )}
      </div>

      {/* Keyboard hint */}
      {isSelected && (
        <span className="text-[10px] text-muted-foreground flex-shrink-0">
          Enter ↵
        </span>
      )}
    </button>
  );
});

// =============================================================================
// CATEGORY SECTION
// =============================================================================

interface CategorySectionProps {
  title: string;
  agents: AgentType[];
  selectedIndex: number;
  globalStartIndex: number;
  onSelect: (agentType: AgentType) => void;
  onHover: (index: number) => void;
}

const CategorySection = memo(function CategorySection({
  title,
  agents,
  selectedIndex,
  globalStartIndex,
  onSelect,
  onHover,
}: CategorySectionProps) {
  if (agents.length === 0) return null;

  return (
    <div className="py-1">
      <div className="px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
        {title}
      </div>
      {agents.map((agentType, localIndex) => {
        const globalIndex = globalStartIndex + localIndex;
        return (
          <AgentItem
            key={agentType}
            agentType={agentType}
            isSelected={selectedIndex === globalIndex}
            onClick={() => onSelect(agentType)}
            onMouseEnter={() => onHover(globalIndex)}
          />
        );
      })}
    </div>
  );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const MentionMenu = memo(function MentionMenu({
  isOpen,
  onClose,
  onSelect,
  position,
  className,
}: MentionMenuProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get filtered agents
  const filteredAgents = useMemo(() => {
    if (searchQuery.trim()) {
      return searchAgents(searchQuery);
    }
    return Object.keys(AGENT_CONFIG) as AgentType[];
  }, [searchQuery]);

  // All agent categories
  const CATEGORIES: Array<{ id: string; title: string }> = [
    { id: 'core', title: 'Core Testing' },
    { id: 'specialized', title: 'Specialized' },
    { id: 'analysis', title: 'Analysis' },
    { id: 'automation', title: 'Automation' },
    { id: 'infrastructure', title: 'Infrastructure' },
    { id: 'advanced', title: 'Advanced AI' },
  ];

  // Group by category for display
  const agentsByCategory = useMemo(() => {
    const result: Array<{ title: string; agents: AgentType[] }> = [];
    const filteredSet = new Set(filteredAgents);

    for (const category of CATEGORIES) {
      const categoryAgents = getAgentsByCategory(category.id as any).filter((a) => filteredSet.has(a));
      if (categoryAgents.length > 0) {
        result.push({
          title: category.title,
          agents: categoryAgents,
        });
      }
    }

    return result;
  }, [filteredAgents]);

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredAgents.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredAgents.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredAgents[selectedIndex]) {
            onSelect(filteredAgents[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case 'Tab':
          e.preventDefault();
          if (filteredAgents[selectedIndex]) {
            onSelect(filteredAgents[selectedIndex]);
          }
          break;
      }
    },
    [filteredAgents, selectedIndex, onSelect, onClose]
  );

  // Handle agent selection
  const handleSelect = useCallback(
    (agentType: AgentType) => {
      onSelect(agentType);
    },
    [onSelect]
  );

  // Handle hover
  const handleHover = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className={cn(
            'absolute z-50 w-80 bg-popover border rounded-lg shadow-lg overflow-hidden',
            className
          )}
          style={position ? { top: position.top, left: position.left } : undefined}
          onKeyDown={handleKeyDown}
        >
          {/* Search Header */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search agents..."
                className="pl-8 pr-8 h-8 text-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Agent List */}
          <div className="max-h-72 overflow-y-auto">
            {filteredAgents.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No agents found
              </div>
            ) : (
              <div className="py-1">
                {agentsByCategory.map((category, categoryIndex) => {
                  // Calculate global start index for this category
                  let globalStartIndex = 0;
                  for (let i = 0; i < categoryIndex; i++) {
                    globalStartIndex += agentsByCategory[i].agents.length;
                  }

                  return (
                    <CategorySection
                      key={category.title}
                      title={category.title}
                      agents={category.agents}
                      selectedIndex={selectedIndex}
                      globalStartIndex={globalStartIndex}
                      onSelect={handleSelect}
                      onHover={handleHover}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 border-t bg-muted/30 text-[10px] text-muted-foreground">
            <span className="font-medium">@agent</span> routes your message to a
            specific agent
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

// =============================================================================
// INLINE MENTION BADGE
// =============================================================================

export interface MentionBadgeProps {
  agentType: AgentType;
  onRemove?: () => void;
  className?: string;
}

export const MentionBadge = memo(function MentionBadge({
  agentType,
  onRemove,
  className,
}: MentionBadgeProps) {
  const config = AGENT_CONFIG[agentType];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium',
        config.bgColor,
        config.color,
        className
      )}
    >
      <Icon className="w-3 h-3" />
      <span>@{config.name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 hover:bg-background/50 rounded p-0.5"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}
    </span>
  );
});

export default MentionMenu;
