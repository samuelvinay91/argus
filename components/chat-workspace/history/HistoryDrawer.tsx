'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, History, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlassCard } from '../glass';
import { SearchHistory } from './SearchHistory';
import { ConversationItem, type Conversation } from './ConversationItem';
import {
  isToday,
  isYesterday,
  isThisWeek,
  parseISO,
} from 'date-fns';

export interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onSearch: (query: string) => void;
}

interface GroupedConversations {
  today: Conversation[];
  yesterday: Conversation[];
  lastWeek: Conversation[];
  older: Conversation[];
}

function groupConversationsByDate(conversations: Conversation[]): GroupedConversations {
  const groups: GroupedConversations = {
    today: [],
    yesterday: [],
    lastWeek: [],
    older: [],
  };

  for (const conversation of conversations) {
    try {
      const date = parseISO(conversation.updatedAt);
      if (isToday(date)) {
        groups.today.push(conversation);
      } else if (isYesterday(date)) {
        groups.yesterday.push(conversation);
      } else if (isThisWeek(date)) {
        groups.lastWeek.push(conversation);
      } else {
        groups.older.push(conversation);
      }
    } catch {
      // Invalid date, put in older
      groups.older.push(conversation);
    }
  }

  return groups;
}

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const drawerVariants = {
  hidden: { x: '-100%', opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 35,
    },
  },
  exit: {
    x: '-100%',
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: 'easeIn',
    },
  },
};

const contentVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delay: 0.1,
      duration: 0.2,
    },
  },
  exit: { opacity: 0 },
};

const HistoryDrawer = React.forwardRef<HTMLDivElement, HistoryDrawerProps>(
  (
    {
      isOpen,
      onClose,
      conversations,
      activeConversationId,
      onSelect,
      onDelete,
      onSearch,
    },
    ref
  ) => {
    const [searchQuery, setSearchQuery] = React.useState('');
    const drawerRef = React.useRef<HTMLDivElement>(null);
    const searchInputRef = React.useRef<HTMLInputElement>(null);
    const listRef = React.useRef<HTMLDivElement>(null);
    const [focusedIndex, setFocusedIndex] = React.useState(-1);

    // Combine refs
    React.useImperativeHandle(ref, () => drawerRef.current as HTMLDivElement);

    // Focus trap and keyboard navigation
    React.useEffect(() => {
      if (!isOpen) {
        setSearchQuery('');
        setFocusedIndex(-1);
        return;
      }

      // Focus search input when drawer opens
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
          return;
        }

        // Arrow key navigation
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          const items = listRef.current?.querySelectorAll('[role="option"]');
          if (!items || items.length === 0) return;

          let newIndex = focusedIndex;
          if (e.key === 'ArrowDown') {
            newIndex = Math.min(focusedIndex + 1, items.length - 1);
          } else {
            newIndex = Math.max(focusedIndex - 1, -1);
          }

          setFocusedIndex(newIndex);
          if (newIndex >= 0) {
            (items[newIndex] as HTMLElement).focus();
          } else {
            searchInputRef.current?.focus();
          }
        }

        // Tab trap
        if (e.key === 'Tab') {
          const focusableElements = drawerRef.current?.querySelectorAll(
            'button, input, [tabindex]:not([tabindex="-1"])'
          );
          if (!focusableElements || focusableElements.length === 0) return;

          const first = focusableElements[0] as HTMLElement;
          const last = focusableElements[focusableElements.length - 1] as HTMLElement;

          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';

      return () => {
        clearTimeout(timer);
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }, [isOpen, onClose, focusedIndex]);

    const handleSearchChange = React.useCallback(
      (value: string) => {
        setSearchQuery(value);
        onSearch(value);
        setFocusedIndex(-1);
      },
      [onSearch]
    );

    const handleSelect = React.useCallback(
      (id: string) => {
        onSelect(id);
        onClose();
      },
      [onSelect, onClose]
    );

    // Group conversations
    const grouped = React.useMemo(
      () => groupConversationsByDate(conversations),
      [conversations]
    );

    const hasConversations = conversations.length > 0;
    const hasResults =
      grouped.today.length > 0 ||
      grouped.yesterday.length > 0 ||
      grouped.lastWeek.length > 0 ||
      grouped.older.length > 0;

    const renderGroup = (label: string, items: Conversation[]) => {
      if (items.length === 0) return null;
      return (
        <div className="space-y-1">
          <div className="px-3 py-2">
            <span className="text-xs font-medium text-white/40 uppercase tracking-wider">
              {label}
            </span>
          </div>
          {items.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              isActive={conversation.id === activeConversationId}
              onClick={() => handleSelect(conversation.id)}
              onDelete={() => onDelete(conversation.id)}
            />
          ))}
        </div>
      );
    };

    return (
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className={cn(
                'fixed inset-0 z-40',
                'bg-black/40 backdrop-blur-[32px]'
              )}
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.2 }}
              onClick={onClose}
              aria-hidden="true"
            />

            {/* Drawer */}
            <motion.div
              ref={drawerRef}
              className={cn(
                'fixed inset-y-0 left-0 z-50',
                'w-full max-w-sm',
                'flex flex-col'
              )}
              variants={drawerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              role="dialog"
              aria-modal="true"
              aria-label="Conversation history"
            >
              <GlassCard
                variant="prominent"
                padding="none"
                className={cn(
                  'h-full flex flex-col',
                  'rounded-none rounded-r-2xl',
                  'border-l-0',
                  'backdrop-blur-[32px]',
                  'shadow-[4px_0_32px_rgba(0,0,0,0.24)]'
                )}
              >
                <motion.div
                  className="flex flex-col h-full"
                  variants={contentVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-4 border-b border-white/[0.08]">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-8 h-8 rounded-lg',
                          'flex items-center justify-center',
                          'bg-indigo-500/20 border border-indigo-500/30'
                        )}
                      >
                        <History className="w-4 h-4 text-indigo-400" />
                      </div>
                      <h2 className="text-base font-semibold text-white">
                        History
                      </h2>
                    </div>
                    <button
                      onClick={onClose}
                      className={cn(
                        'p-2 rounded-lg',
                        'text-white/60 hover:text-white',
                        'hover:bg-white/[0.08]',
                        'transition-colors duration-150',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50'
                      )}
                      aria-label="Close history"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Search */}
                  <div className="px-4 py-3 border-b border-white/[0.06]">
                    <SearchHistory
                      ref={searchInputRef}
                      value={searchQuery}
                      onChange={handleSearchChange}
                      placeholder="Search conversations..."
                    />
                  </div>

                  {/* Conversation list */}
                  <div
                    ref={listRef}
                    className="flex-1 overflow-y-auto overscroll-contain px-2 py-2"
                    role="listbox"
                    aria-label="Conversations"
                  >
                    {!hasConversations ? (
                      // Empty state
                      <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
                        <div
                          className={cn(
                            'w-12 h-12 rounded-xl mb-4',
                            'flex items-center justify-center',
                            'bg-white/[0.06] border border-white/[0.08]'
                          )}
                        >
                          <MessageSquare className="w-6 h-6 text-white/40" />
                        </div>
                        <p className="text-white/60 text-sm font-medium">
                          No conversations yet
                        </p>
                        <p className="text-white/40 text-xs mt-1">
                          Start a new chat to see it here
                        </p>
                      </div>
                    ) : !hasResults && searchQuery ? (
                      // No search results
                      <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
                        <p className="text-white/60 text-sm font-medium">
                          No results found
                        </p>
                        <p className="text-white/40 text-xs mt-1">
                          Try a different search term
                        </p>
                      </div>
                    ) : (
                      // Grouped conversations
                      <div className="space-y-4">
                        {renderGroup('Today', grouped.today)}
                        {renderGroup('Yesterday', grouped.yesterday)}
                        {renderGroup('Last Week', grouped.lastWeek)}
                        {renderGroup('Older', grouped.older)}
                      </div>
                    )}
                  </div>
                </motion.div>
              </GlassCard>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }
);

HistoryDrawer.displayName = 'HistoryDrawer';

export { HistoryDrawer };
