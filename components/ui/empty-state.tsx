'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  FileSearch,
  FolderOpen,
  Search,
  AlertCircle,
  TestTube,
  Lightbulb,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface EmptyStateProps {
  variant?: 'default' | 'no-tests' | 'no-projects' | 'no-results' | 'error';
  illustration?: React.ReactNode;
  headline: string;
  subtext?: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  tip?: string;
  className?: string;
}

// Default illustrations for each variant using Lucide icons arranged creatively
function DefaultIllustration({ variant }: { variant: EmptyStateProps['variant'] }) {
  const iconConfigs = {
    default: {
      primary: FileSearch,
      secondary: [FolderOpen, Search],
      gradient: 'from-primary/20 to-cyan-500/20',
      iconColor: 'text-primary',
    },
    'no-tests': {
      primary: TestTube,
      secondary: [FileSearch, Lightbulb],
      gradient: 'from-violet-500/20 to-purple-500/20',
      iconColor: 'text-violet-500',
    },
    'no-projects': {
      primary: FolderOpen,
      secondary: [Plus, FileSearch],
      gradient: 'from-amber-500/20 to-orange-500/20',
      iconColor: 'text-amber-500',
    },
    'no-results': {
      primary: Search,
      secondary: [FileSearch, FolderOpen],
      gradient: 'from-cyan-500/20 to-teal-500/20',
      iconColor: 'text-cyan-500',
    },
    error: {
      primary: AlertCircle,
      secondary: [FileSearch, Search],
      gradient: 'from-red-500/20 to-rose-500/20',
      iconColor: 'text-red-500',
    },
  };

  const config = iconConfigs[variant || 'default'];
  const PrimaryIcon = config.primary;
  const [SecondaryIcon1, SecondaryIcon2] = config.secondary;

  return (
    <div className="relative w-32 h-32 mx-auto">
      {/* Background glow */}
      <motion.div
        className={cn(
          'absolute inset-0 rounded-full bg-gradient-to-br blur-2xl opacity-60',
          config.gradient
        )}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.4, 0.6, 0.4],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Orbiting secondary icons */}
      <motion.div
        className="absolute -top-2 -left-2 w-10 h-10 rounded-xl bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center shadow-lg"
        animate={{
          y: [0, -6, 0],
          x: [0, 3, 0],
          rotate: [0, 5, 0],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.2,
        }}
      >
        <SecondaryIcon1 className="w-5 h-5 text-muted-foreground" />
      </motion.div>

      <motion.div
        className="absolute -bottom-1 -right-3 w-9 h-9 rounded-xl bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center shadow-lg"
        animate={{
          y: [0, 4, 0],
          x: [0, -4, 0],
          rotate: [0, -8, 0],
        }}
        transition={{
          duration: 3.5,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.5,
        }}
      >
        <SecondaryIcon2 className="w-4 h-4 text-muted-foreground" />
      </motion.div>

      {/* Primary icon with floating animation */}
      <motion.div
        className={cn(
          'absolute inset-4 rounded-2xl bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center shadow-xl'
        )}
        animate={{
          y: [0, -8, 0],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <PrimaryIcon className={cn('w-12 h-12', config.iconColor)} />
      </motion.div>

      {/* Decorative dots */}
      <motion.div
        className="absolute top-1/2 -right-6 w-2 h-2 rounded-full bg-primary/40"
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.4, 0.8, 0.4],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className="absolute bottom-1/4 -left-5 w-1.5 h-1.5 rounded-full bg-cyan-500/40"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.3, 0.7, 0.3],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.3,
        }}
      />
    </div>
  );
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const illustrationVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15,
    },
  },
};

const textVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15,
    },
  },
};

const buttonVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15,
    },
  },
};

const tipVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 80,
      damping: 15,
      delay: 0.4,
    },
  },
};

export function EmptyState({
  variant = 'default',
  illustration,
  headline,
  subtext,
  primaryAction,
  secondaryAction,
  tip,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-6',
        className
      )}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Glass card container */}
      <div className="relative max-w-md w-full">
        {/* Background gradient decoration */}
        <div className="absolute inset-0 -z-10 overflow-hidden rounded-3xl">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl" />
        </div>

        <div className="relative rounded-3xl border border-border/50 bg-background/60 backdrop-blur-xl p-8 shadow-xl">
          {/* Gradient accent line */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 rounded-full bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

          {/* Illustration */}
          <motion.div className="mb-8" variants={illustrationVariants}>
            {illustration || <DefaultIllustration variant={variant} />}
          </motion.div>

          {/* Text content */}
          <motion.div className="text-center mb-6" variants={textVariants}>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {headline}
            </h3>
            {subtext && (
              <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
                {subtext}
              </p>
            )}
          </motion.div>

          {/* Action buttons */}
          {(primaryAction || secondaryAction) && (
            <motion.div
              className="flex flex-col sm:flex-row items-center justify-center gap-3"
              variants={buttonVariants}
            >
              {primaryAction && (
                <Button
                  onClick={primaryAction.onClick}
                  className="w-full sm:w-auto gap-2 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/20"
                >
                  {primaryAction.icon || <Plus className="w-4 h-4" />}
                  {primaryAction.label}
                </Button>
              )}
              {secondaryAction && (
                <Button
                  variant="ghost"
                  onClick={secondaryAction.onClick}
                  className="w-full sm:w-auto gap-2 text-muted-foreground hover:text-foreground"
                >
                  {secondaryAction.label}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}
            </motion.div>
          )}

          {/* Pro tip section */}
          {tip && (
            <motion.div
              className="mt-8 pt-6 border-t border-border/50"
              variants={tipVariants}
            >
              <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-500/10">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">
                    Pro Tip
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {tip}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Convenience components for common use cases
export function NoTestsEmptyState({
  onCreateTest,
  onImportTests,
}: {
  onCreateTest?: () => void;
  onImportTests?: () => void;
}) {
  return (
    <EmptyState
      variant="no-tests"
      headline="No tests yet"
      subtext="Create your first test to start monitoring your application's quality and catching bugs before they reach production."
      primaryAction={
        onCreateTest
          ? {
              label: 'Create First Test',
              onClick: onCreateTest,
              icon: <TestTube className="w-4 h-4" />,
            }
          : undefined
      }
      secondaryAction={
        onImportTests
          ? {
              label: 'Import existing tests',
              onClick: onImportTests,
            }
          : undefined
      }
      tip="Start with your most critical user flows. Tests for login, checkout, and core features provide the best coverage-to-effort ratio."
    />
  );
}

export function NoProjectsEmptyState({
  onCreateProject,
}: {
  onCreateProject?: () => void;
}) {
  return (
    <EmptyState
      variant="no-projects"
      headline="No projects found"
      subtext="Create a project to organize your tests, configure integrations, and start monitoring your application's quality."
      primaryAction={
        onCreateProject
          ? {
              label: 'Create Project',
              onClick: onCreateProject,
              icon: <FolderOpen className="w-4 h-4" />,
            }
          : undefined
      }
      tip="Each project can have its own configuration, team members, and notification settings."
    />
  );
}

export function NoResultsEmptyState({
  searchQuery,
  onClearSearch,
}: {
  searchQuery?: string;
  onClearSearch?: () => void;
}) {
  return (
    <EmptyState
      variant="no-results"
      headline="No results found"
      subtext={
        searchQuery
          ? `We couldn't find anything matching "${searchQuery}". Try adjusting your search or filters.`
          : "We couldn't find what you're looking for. Try adjusting your search or filters."
      }
      secondaryAction={
        onClearSearch
          ? {
              label: 'Clear search',
              onClick: onClearSearch,
            }
          : undefined
      }
      tip="Try using broader search terms or check for typos in your query."
    />
  );
}

export function ErrorEmptyState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      variant="error"
      headline="Something went wrong"
      subtext={
        message ||
        "We encountered an error while loading this content. Please try again or contact support if the issue persists."
      }
      primaryAction={
        onRetry
          ? {
              label: 'Try Again',
              onClick: onRetry,
              icon: <ArrowRight className="w-4 h-4" />,
            }
          : undefined
      }
    />
  );
}
