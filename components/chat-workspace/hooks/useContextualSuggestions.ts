/**
 * useContextualSuggestions - Smart suggestion logic based on conversation state
 *
 * Analyzes the conversation to determine the current context and provide
 * relevant suggestions for the user's next action.
 */

'use client';

import { useMemo } from 'react';
import type { UIMessage } from '@ai-sdk/react';

// =============================================================================
// TYPES
// =============================================================================

export type SuggestionContext =
  | 'empty'
  | 'afterTest'
  | 'afterError'
  | 'afterReport'
  | 'afterAnalysis'
  | 'afterDiscovery'
  | 'afterHealing'
  | 'general';

export interface Suggestion {
  id: string;
  text: string;
  prompt: string;
  icon?: string;
  category?: string;
}

// =============================================================================
// SUGGESTION DEFINITIONS
// =============================================================================

const SUGGESTIONS: Record<SuggestionContext, Suggestion[]> = {
  empty: [
    {
      id: 'discover',
      text: 'Discover elements',
      prompt: 'Discover testable elements on ',
      icon: 'search',
      category: 'Discovery',
    },
    {
      id: 'generate-test',
      text: 'Generate a test',
      prompt: 'Generate a test for ',
      icon: 'wand',
      category: 'Creation',
    },
    {
      id: 'run-suite',
      text: 'Run test suite',
      prompt: 'Run the test suite for ',
      icon: 'play',
      category: 'Execution',
    },
    {
      id: 'analyze-codebase',
      text: 'Analyze codebase',
      prompt: 'Analyze the codebase and suggest tests for ',
      icon: 'code',
      category: 'Analysis',
    },
    {
      id: 'quality-report',
      text: 'Quality report',
      prompt: 'Generate a quality report for the project',
      icon: 'chart',
      category: 'Reports',
    },
  ],

  afterTest: [
    {
      id: 'view-details',
      text: 'View test details',
      prompt: 'Show me the detailed results of the last test',
      icon: 'info',
      category: 'Details',
    },
    {
      id: 'run-again',
      text: 'Run again',
      prompt: 'Run the same test again',
      icon: 'refresh',
      category: 'Execution',
    },
    {
      id: 'fix-failures',
      text: 'Fix failures',
      prompt: 'Help me fix the failing tests',
      icon: 'wrench',
      category: 'Healing',
    },
    {
      id: 'generate-report',
      text: 'Generate report',
      prompt: 'Generate a report for these test results',
      icon: 'file-text',
      category: 'Reports',
    },
    {
      id: 'expand-coverage',
      text: 'Expand coverage',
      prompt: 'Suggest additional tests to improve coverage',
      icon: 'expand',
      category: 'Analysis',
    },
  ],

  afterError: [
    {
      id: 'explain-error',
      text: 'Explain error',
      prompt: 'Explain what caused this error',
      icon: 'help',
      category: 'Analysis',
    },
    {
      id: 'suggest-fix',
      text: 'Suggest fix',
      prompt: 'Suggest how to fix this error',
      icon: 'lightbulb',
      category: 'Healing',
    },
    {
      id: 'auto-heal',
      text: 'Auto-heal',
      prompt: 'Automatically fix this test',
      icon: 'magic',
      category: 'Healing',
    },
    {
      id: 'find-similar',
      text: 'Find similar',
      prompt: 'Find similar errors in the codebase',
      icon: 'search',
      category: 'Analysis',
    },
    {
      id: 'create-issue',
      text: 'Create issue',
      prompt: 'Create an issue for this bug',
      icon: 'flag',
      category: 'Reporting',
    },
  ],

  afterReport: [
    {
      id: 'export-report',
      text: 'Export report',
      prompt: 'Export this report as PDF',
      icon: 'download',
      category: 'Export',
    },
    {
      id: 'share-report',
      text: 'Share report',
      prompt: 'Share this report with the team',
      icon: 'share',
      category: 'Collaboration',
    },
    {
      id: 'drill-down',
      text: 'Drill down',
      prompt: 'Show me more details about the failing areas',
      icon: 'zoom-in',
      category: 'Analysis',
    },
    {
      id: 'compare-previous',
      text: 'Compare previous',
      prompt: 'Compare this report with the previous run',
      icon: 'compare',
      category: 'Analysis',
    },
    {
      id: 'suggest-improvements',
      text: 'Suggest improvements',
      prompt: 'Suggest improvements based on this report',
      icon: 'trending-up',
      category: 'Optimization',
    },
  ],

  afterAnalysis: [
    {
      id: 'generate-tests',
      text: 'Generate tests',
      prompt: 'Generate tests based on this analysis',
      icon: 'plus',
      category: 'Creation',
    },
    {
      id: 'prioritize',
      text: 'Prioritize areas',
      prompt: 'Prioritize which areas to test first',
      icon: 'sort',
      category: 'Planning',
    },
    {
      id: 'estimate-effort',
      text: 'Estimate effort',
      prompt: 'Estimate the testing effort required',
      icon: 'clock',
      category: 'Planning',
    },
    {
      id: 'identify-risks',
      text: 'Identify risks',
      prompt: 'Identify high-risk areas that need testing',
      icon: 'alert',
      category: 'Analysis',
    },
  ],

  afterDiscovery: [
    {
      id: 'generate-from-discovery',
      text: 'Generate tests',
      prompt: 'Generate tests for the discovered elements',
      icon: 'wand',
      category: 'Creation',
    },
    {
      id: 'filter-elements',
      text: 'Filter elements',
      prompt: 'Filter to show only interactive elements',
      icon: 'filter',
      category: 'Refinement',
    },
    {
      id: 'save-snapshot',
      text: 'Save snapshot',
      prompt: 'Save this discovery as a baseline',
      icon: 'camera',
      category: 'Baseline',
    },
    {
      id: 'explore-deeper',
      text: 'Explore deeper',
      prompt: 'Explore child elements and dynamic content',
      icon: 'layers',
      category: 'Discovery',
    },
  ],

  afterHealing: [
    {
      id: 'apply-fix',
      text: 'Apply fix',
      prompt: 'Apply the suggested fix',
      icon: 'check',
      category: 'Action',
    },
    {
      id: 'review-changes',
      text: 'Review changes',
      prompt: 'Show me the changes that will be made',
      icon: 'eye',
      category: 'Review',
    },
    {
      id: 'test-fix',
      text: 'Test fix',
      prompt: 'Run the test again to verify the fix',
      icon: 'play',
      category: 'Verification',
    },
    {
      id: 'similar-fixes',
      text: 'Apply similar fixes',
      prompt: 'Find and fix similar issues in other tests',
      icon: 'copy',
      category: 'Batch',
    },
  ],

  general: [
    {
      id: 'help',
      text: 'Show help',
      prompt: 'What can you help me with?',
      icon: 'help',
      category: 'Help',
    },
    {
      id: 'status',
      text: 'Project status',
      prompt: 'Show me the current project status',
      icon: 'dashboard',
      category: 'Status',
    },
    {
      id: 'recent-runs',
      text: 'Recent runs',
      prompt: 'Show recent test runs',
      icon: 'history',
      category: 'History',
    },
  ],
};

// =============================================================================
// CONTEXT DETECTION
// =============================================================================

/**
 * Keywords and patterns to detect context from messages
 */
const CONTEXT_PATTERNS: Array<{
  context: SuggestionContext;
  patterns: RegExp[];
  toolNames?: string[];
}> = [
  {
    context: 'afterTest',
    patterns: [
      /test(s)?\s+(passed|failed|completed|finished)/i,
      /ran?\s+\d+\s+test/i,
      /test\s+results?/i,
      /execution\s+complete/i,
    ],
    toolNames: ['run_tests', 'execute_test', 'run_test_suite'],
  },
  {
    context: 'afterError',
    patterns: [
      /error|exception|failed|failure/i,
      /could\s+not|couldn't|cannot/i,
      /timeout|timed\s+out/i,
      /assertion\s+failed/i,
    ],
    toolNames: [],
  },
  {
    context: 'afterReport',
    patterns: [
      /report\s+(generated|complete)/i,
      /quality\s+score/i,
      /coverage\s+report/i,
      /summary\s+report/i,
    ],
    toolNames: ['quality_report', 'generate_report', 'coverage_analysis'],
  },
  {
    context: 'afterAnalysis',
    patterns: [
      /analysis\s+complete/i,
      /found\s+\d+\s+(issues?|opportunities)/i,
      /code\s+analysis/i,
      /test\s+gaps?/i,
    ],
    toolNames: ['code_analysis', 'analyze_codebase'],
  },
  {
    context: 'afterDiscovery',
    patterns: [
      /discovered?\s+\d+\s+(element|component)/i,
      /found\s+\d+\s+(testable|interactive)/i,
      /element\s+discovery/i,
    ],
    toolNames: ['discover_elements', 'crawl_page'],
  },
  {
    context: 'afterHealing',
    patterns: [
      /heal(ed|ing)/i,
      /self.heal/i,
      /suggested?\s+fix/i,
      /repair(ed)?/i,
    ],
    toolNames: ['self_heal', 'auto_fix', 'repair_test'],
  },
];

/**
 * Detect the context from a message - AI SDK v6 uses parts array
 */
function detectContext(message: UIMessage): SuggestionContext | null {
  if (message.role !== 'assistant') return null;

  // Extract text content from parts array (AI SDK v6 format)
  const textParts = message.parts?.filter(
    (part): part is { type: 'text'; text: string } => part.type === 'text'
  ) || [];
  const content = textParts.map(p => p.text).join('\n').toLowerCase();

  // Check for tool invocation parts (v6 format)
  const toolParts = message.parts?.filter(
    (part) => part.type === 'tool-invocation'
  ) || [];

  if (toolParts.length > 0) {
    const lastTool = toolParts[toolParts.length - 1] as unknown as {
      type: 'tool-invocation';
      toolInvocation: { toolName: string };
    };
    const toolName = lastTool.toolInvocation?.toolName;

    if (toolName) {
      for (const pattern of CONTEXT_PATTERNS) {
        if (pattern.toolNames?.includes(toolName)) {
          return pattern.context;
        }
      }
    }
  }

  // Check content patterns
  for (const pattern of CONTEXT_PATTERNS) {
    for (const regex of pattern.patterns) {
      if (regex.test(content)) {
        return pattern.context;
      }
    }
  }

  return null;
}

// =============================================================================
// HOOK
// =============================================================================

export interface UseContextualSuggestionsOptions {
  /** Messages to analyze */
  messages: UIMessage[];
  /** Maximum number of suggestions to return */
  maxSuggestions?: number;
  /** Custom suggestions to include */
  customSuggestions?: Suggestion[];
}

export interface UseContextualSuggestionsResult {
  /** Detected context */
  context: SuggestionContext;
  /** Suggested actions based on context */
  suggestions: Suggestion[];
  /** Get suggestions for a specific context */
  getSuggestionsForContext: (ctx: SuggestionContext) => Suggestion[];
  /** All available contexts */
  availableContexts: SuggestionContext[];
}

export function useContextualSuggestions({
  messages,
  maxSuggestions = 5,
  customSuggestions = [],
}: UseContextualSuggestionsOptions): UseContextualSuggestionsResult {
  const result = useMemo(() => {
    // Detect context from the last few messages
    let detectedContext: SuggestionContext = 'empty';

    if (messages.length > 0) {
      // Check last 3 messages for context
      for (let i = messages.length - 1; i >= Math.max(0, messages.length - 3); i--) {
        const ctx = detectContext(messages[i]);
        if (ctx) {
          detectedContext = ctx;
          break;
        }
      }

      // If no specific context detected but there are messages, use general
      if (detectedContext === 'empty' && messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        // Extract text content length from parts array (AI SDK v6 format)
        const textParts = lastMessage.parts?.filter(
          (part): part is { type: 'text'; text: string } => part.type === 'text'
        ) || [];
        const contentLength = textParts.reduce((sum, p) => sum + p.text.length, 0);

        if (lastMessage.role === 'assistant' && contentLength > 50) {
          detectedContext = 'general';
        }
      }
    }

    // Get suggestions for the detected context
    const contextSuggestions = SUGGESTIONS[detectedContext] || SUGGESTIONS.general;

    // Combine with custom suggestions
    const allSuggestions = [...customSuggestions, ...contextSuggestions];

    // Limit to max suggestions
    const limitedSuggestions = allSuggestions.slice(0, maxSuggestions);

    return {
      context: detectedContext,
      suggestions: limitedSuggestions,
    };
  }, [messages, maxSuggestions, customSuggestions]);

  const getSuggestionsForContext = useMemo(() => {
    return (ctx: SuggestionContext): Suggestion[] => {
      return SUGGESTIONS[ctx] || SUGGESTIONS.general;
    };
  }, []);

  const availableContexts = useMemo(() => {
    return Object.keys(SUGGESTIONS) as SuggestionContext[];
  }, []);

  return {
    context: result.context,
    suggestions: result.suggestions,
    getSuggestionsForContext,
    availableContexts,
  };
}

export default useContextualSuggestions;
