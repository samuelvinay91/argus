/**
 * Proactive Intelligence Engine
 *
 * Evaluates trigger conditions and suggests actions to users based on
 * context like time of day, recent failures, and usage patterns.
 */

export interface ProactiveSuggestion {
  id: string;
  title: string;
  description: string;
  action: string;
  actionLabel: string;
  priority: 'high' | 'medium' | 'low';
  category: 'morning' | 'failure' | 'insight' | 'schedule' | 'performance';
}

interface TriggerContext {
  recentFailures: number;
  lastVisitTime?: Date;
  pendingTests: number;
  activeSchedules: number;
  lastTestRunTime?: Date;
  averagePassRate?: number;
}

interface ProactiveTrigger {
  id: string;
  condition: (ctx: TriggerContext) => boolean;
  cooldownMinutes: number;
  suggestion: ProactiveSuggestion;
}

// Storage key for cooldown tracking
const COOLDOWN_STORAGE_KEY = 'argus_proactive_cooldowns';

// Get cooldown state from localStorage
function getCooldowns(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(COOLDOWN_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

// Save cooldown state to localStorage
function saveCooldowns(cooldowns: Record<string, number>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(COOLDOWN_STORAGE_KEY, JSON.stringify(cooldowns));
  } catch {
    // Ignore storage errors
  }
}

// Check if trigger is in cooldown
function isInCooldown(triggerId: string, cooldownMinutes: number): boolean {
  const cooldowns = getCooldowns();
  const lastTriggered = cooldowns[triggerId];

  if (!lastTriggered) return false;

  const cooldownMs = cooldownMinutes * 60 * 1000;
  return Date.now() - lastTriggered < cooldownMs;
}

// Mark trigger as fired
function markTriggerFired(triggerId: string): void {
  const cooldowns = getCooldowns();
  cooldowns[triggerId] = Date.now();
  saveCooldowns(cooldowns);
}

// Check if it's morning (6am-10am) and first visit of the day
function isMorningFirstVisit(lastVisitTime?: Date): boolean {
  const now = new Date();
  const hour = now.getHours();

  if (hour < 6 || hour > 10) return false;

  if (!lastVisitTime) return true;

  // Check if last visit was on a different day
  const today = now.toDateString();
  const lastDay = lastVisitTime.toDateString();

  return today !== lastDay;
}

// Check if user hasn't run tests recently (> 24 hours)
function hasNotRunTestsRecently(lastTestRunTime?: Date): boolean {
  if (!lastTestRunTime) return false;

  const hoursSinceLastRun = (Date.now() - lastTestRunTime.getTime()) / (1000 * 60 * 60);
  return hoursSinceLastRun > 24;
}

// Proactive triggers configuration
const PROACTIVE_TRIGGERS: ProactiveTrigger[] = [
  {
    id: 'morning-summary',
    condition: (ctx) => isMorningFirstVisit(ctx.lastVisitTime),
    cooldownMinutes: 720, // 12 hours
    suggestion: {
      id: 'morning-summary',
      title: 'Good morning! 🌅',
      description: 'View overnight test results and any failures that need attention.',
      action: 'generateReport',
      actionLabel: 'View Summary',
      priority: 'medium',
      category: 'morning',
    },
  },
  {
    id: 'failure-alert',
    condition: (ctx) => ctx.recentFailures >= 3,
    cooldownMinutes: 30,
    suggestion: {
      id: 'failure-alert',
      title: 'Multiple Test Failures Detected',
      description: `${3}+ tests have failed recently. AI can help analyze patterns and suggest fixes.`,
      action: 'getAIInsights',
      actionLabel: 'Analyze Failures',
      priority: 'high',
      category: 'failure',
    },
  },
  {
    id: 'low-pass-rate',
    condition: (ctx) => ctx.averagePassRate !== undefined && ctx.averagePassRate < 70,
    cooldownMinutes: 60,
    suggestion: {
      id: 'low-pass-rate',
      title: 'Pass Rate Below 70%',
      description: 'Your test pass rate is lower than usual. Consider reviewing failing tests.',
      action: 'getTestRuns',
      actionLabel: 'Review Tests',
      priority: 'medium',
      category: 'performance',
    },
  },
  {
    id: 'no-schedules',
    condition: (ctx) => ctx.activeSchedules === 0 && ctx.pendingTests > 0,
    cooldownMinutes: 1440, // 24 hours
    suggestion: {
      id: 'no-schedules',
      title: 'Set Up Automated Testing',
      description: 'You have tests but no schedules. Set up automated runs to catch issues early.',
      action: 'createSchedule',
      actionLabel: 'Create Schedule',
      priority: 'low',
      category: 'schedule',
    },
  },
  {
    id: 'idle-reminder',
    condition: (ctx) => hasNotRunTestsRecently(ctx.lastTestRunTime) && ctx.pendingTests > 0,
    cooldownMinutes: 1440, // 24 hours
    suggestion: {
      id: 'idle-reminder',
      title: 'Time for a Test Run?',
      description: "It's been a while since your last test run. Keep your tests fresh!",
      action: 'runTest',
      actionLabel: 'Run Tests',
      priority: 'low',
      category: 'insight',
    },
  },
];

/**
 * Evaluate all triggers and return applicable suggestions
 */
export function evaluateTriggers(context: TriggerContext): ProactiveSuggestion[] {
  const suggestions: ProactiveSuggestion[] = [];

  for (const trigger of PROACTIVE_TRIGGERS) {
    // Skip if in cooldown
    if (isInCooldown(trigger.id, trigger.cooldownMinutes)) {
      continue;
    }

    // Check condition
    if (trigger.condition(context)) {
      // Customize suggestion based on context
      const suggestion = { ...trigger.suggestion };

      if (trigger.id === 'failure-alert' && context.recentFailures > 3) {
        suggestion.description = `${context.recentFailures} tests have failed recently. AI can help analyze patterns and suggest fixes.`;
      }

      if (trigger.id === 'low-pass-rate' && context.averagePassRate !== undefined) {
        suggestion.description = `Your test pass rate is ${context.averagePassRate.toFixed(0)}%, below the 70% threshold. Consider reviewing failing tests.`;
      }

      suggestions.push(suggestion);
    }
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // Return max 2 suggestions at a time
  return suggestions.slice(0, 2);
}

/**
 * Mark a suggestion as shown (start cooldown)
 */
export function markSuggestionShown(suggestionId: string): void {
  markTriggerFired(suggestionId);
}

/**
 * Clear all cooldowns (for testing)
 */
export function clearCooldowns(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(COOLDOWN_STORAGE_KEY);
}

/**
 * React hook for proactive suggestions
 */
import { useState, useEffect, useCallback } from 'react';

export interface UseProactiveEngineOptions {
  enabled?: boolean;
  checkIntervalMs?: number;
  onSuggestion?: (suggestion: ProactiveSuggestion) => void;
}

export function useProactiveEngine(
  context: TriggerContext,
  options: UseProactiveEngineOptions = {}
) {
  const { enabled = true, checkIntervalMs = 30000, onSuggestion } = options;
  const [suggestions, setSuggestions] = useState<ProactiveSuggestion[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const evaluate = useCallback(() => {
    if (!enabled) return;

    const newSuggestions = evaluateTriggers(context);

    // Filter out dismissed suggestions
    const activeSuggestions = newSuggestions.filter(s => !dismissed.has(s.id));

    setSuggestions(activeSuggestions);

    // Notify for high-priority suggestions
    if (onSuggestion && activeSuggestions.length > 0) {
      const highPriority = activeSuggestions.find(s => s.priority === 'high');
      if (highPriority) {
        onSuggestion(highPriority);
      }
    }
  }, [context, enabled, dismissed, onSuggestion]);

  // Initial evaluation
  useEffect(() => {
    evaluate();
  }, [evaluate]);

  // Periodic re-evaluation
  useEffect(() => {
    if (!enabled || checkIntervalMs <= 0) return;

    const interval = setInterval(evaluate, checkIntervalMs);
    return () => clearInterval(interval);
  }, [enabled, checkIntervalMs, evaluate]);

  const dismiss = useCallback((suggestionId: string) => {
    setDismissed(prev => new Set(prev).add(suggestionId));
    markSuggestionShown(suggestionId);
  }, []);

  const accept = useCallback((suggestionId: string) => {
    setDismissed(prev => new Set(prev).add(suggestionId));
    markSuggestionShown(suggestionId);
  }, []);

  return {
    suggestions,
    dismiss,
    accept,
    refresh: evaluate,
  };
}

export default evaluateTriggers;
