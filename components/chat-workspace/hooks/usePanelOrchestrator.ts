/**
 * usePanelOrchestrator - AI-driven panel spawning logic
 *
 * Watches AI messages for tool calls and automatically spawns
 * appropriate panels based on the tool results.
 */

'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { UIMessage } from '@ai-sdk/react';
import type { UseAdaptiveLayoutResult, PanelType } from './useAdaptiveLayout';

// =============================================================================
// TYPES
// =============================================================================

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
}

export interface ToolInvocation {
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  state: 'call' | 'partial-call' | 'result';
  result?: unknown;
}

/** Mapping of tool names to panel configurations */
interface PanelConfig {
  type: PanelType;
  getTitle: (args: Record<string, unknown>) => string;
  transformData?: (result: unknown, args: Record<string, unknown>) => unknown;
}

// =============================================================================
// TOOL TO PANEL MAPPING
// =============================================================================

const TOOL_PANEL_MAP: Record<string, PanelConfig> = {
  // Test execution tools
  run_tests: {
    type: 'test-results',
    getTitle: (args) => `Test Results${args.suite ? ` - ${args.suite}` : ''}`,
    transformData: (result, args) => ({ result, config: args }),
  },
  execute_test: {
    type: 'test-results',
    getTitle: (args) => `Test: ${args.name || 'Unnamed Test'}`,
  },
  run_test_suite: {
    type: 'test-results',
    getTitle: (args) => `Suite: ${args.suite || 'Test Suite'}`,
  },

  // Quality and reports
  quality_report: {
    type: 'quality-report',
    getTitle: () => 'Quality Report',
  },
  generate_report: {
    type: 'quality-report',
    getTitle: (args) => `Report: ${args.type || 'Quality'}`,
  },
  coverage_analysis: {
    type: 'coverage',
    getTitle: () => 'Coverage Analysis',
  },

  // Visual comparison
  visual_compare: {
    type: 'visual-diff',
    getTitle: (args) => `Visual Diff: ${args.page || 'Comparison'}`,
  },
  screenshot_compare: {
    type: 'visual-diff',
    getTitle: () => 'Screenshot Comparison',
  },
  visual_regression: {
    type: 'visual-diff',
    getTitle: () => 'Visual Regression',
  },

  // Code viewing
  show_code: {
    type: 'code-viewer',
    getTitle: (args) => `Code: ${args.file || args.path || 'Viewer'}`,
  },
  view_source: {
    type: 'code-viewer',
    getTitle: (args) => `Source: ${args.file || 'File'}`,
  },
  code_analysis: {
    type: 'code-viewer',
    getTitle: () => 'Code Analysis',
  },

  // Pipeline status
  pipeline_status: {
    type: 'pipeline',
    getTitle: (args) => `Pipeline: ${args.name || 'Status'}`,
  },
  ci_status: {
    type: 'pipeline',
    getTitle: () => 'CI/CD Status',
  },
  deployment_status: {
    type: 'pipeline',
    getTitle: () => 'Deployment Status',
  },

  // Logs
  show_logs: {
    type: 'logs',
    getTitle: (args) => `Logs: ${args.service || 'Execution'}`,
  },
  execution_logs: {
    type: 'logs',
    getTitle: () => 'Execution Logs',
  },

  // Analytics
  test_analytics: {
    type: 'analytics',
    getTitle: () => 'Test Analytics',
  },
  performance_metrics: {
    type: 'analytics',
    getTitle: () => 'Performance Metrics',
  },
};

// =============================================================================
// HOOK
// =============================================================================

export interface UsePanelOrchestratorOptions {
  /** Adaptive layout controller */
  layout: UseAdaptiveLayoutResult;
  /** Messages to watch for tool calls */
  messages: UIMessage[];
  /** Whether to auto-spawn panels */
  autoSpawn?: boolean;
  /** Custom tool handlers */
  customHandlers?: Record<string, (tool: ToolInvocation) => void>;
}

export interface UsePanelOrchestratorResult {
  /** Process a single tool call manually */
  processToolCall: (toolCall: ToolCall) => void;
  /** Process tool invocations from a message */
  processToolInvocations: (invocations: ToolInvocation[]) => void;
  /** Check if a tool should spawn a panel */
  shouldSpawnPanel: (toolName: string) => boolean;
  /** Get the panel type for a tool */
  getPanelTypeForTool: (toolName: string) => PanelType | null;
}

export function usePanelOrchestrator({
  layout,
  messages,
  autoSpawn = true,
  customHandlers = {},
}: UsePanelOrchestratorOptions): UsePanelOrchestratorResult {
  // Track processed tool calls to avoid duplicates
  const processedToolsRef = useRef<Set<string>>(new Set());

  /**
   * Check if a tool should spawn a panel
   */
  const shouldSpawnPanel = useCallback((toolName: string): boolean => {
    return toolName in TOOL_PANEL_MAP || toolName in customHandlers;
  }, [customHandlers]);

  /**
   * Get the panel type for a tool
   */
  const getPanelTypeForTool = useCallback((toolName: string): PanelType | null => {
    const config = TOOL_PANEL_MAP[toolName];
    return config?.type ?? null;
  }, []);

  /**
   * Process a single tool call
   */
  const processToolCall = useCallback((toolCall: ToolCall) => {
    const { id, name, args, result } = toolCall;

    // Skip if already processed
    if (processedToolsRef.current.has(id)) return;

    // Check for custom handler
    if (customHandlers[name]) {
      customHandlers[name]({
        toolCallId: id,
        toolName: name,
        args,
        state: 'result',
        result,
      });
      processedToolsRef.current.add(id);
      return;
    }

    // Check for built-in panel mapping
    const config = TOOL_PANEL_MAP[name];
    if (config && result !== undefined) {
      const title = config.getTitle(args);
      const data = config.transformData
        ? config.transformData(result, args)
        : { result, args };

      layout.spawnPanel(config.type, title, data);
      processedToolsRef.current.add(id);
    }
  }, [layout, customHandlers]);

  /**
   * Process tool invocations from messages
   */
  const processToolInvocations = useCallback((invocations: ToolInvocation[]) => {
    for (const invocation of invocations) {
      if (invocation.state !== 'result') continue;

      processToolCall({
        id: invocation.toolCallId,
        name: invocation.toolName,
        args: invocation.args,
        result: invocation.result,
      });
    }
  }, [processToolCall]);

  /**
   * Auto-spawn panels when messages change - AI SDK v6 uses parts array
   */
  useEffect(() => {
    if (!autoSpawn) return;

    // Process tool invocation parts from messages (AI SDK v6 format)
    for (const message of messages) {
      if (message.role !== 'assistant') continue;

      // Extract tool invocation parts (v6 format)
      const toolParts = message.parts?.filter(
        (part) => part.type === 'tool-invocation'
      ) || [];

      for (const part of toolParts) {
        const toolPart = part as unknown as {
          type: 'tool-invocation';
          toolInvocation: {
            toolCallId: string;
            toolName: string;
            args: Record<string, unknown>;
            state: string;
            result?: unknown;
          };
        };
        const invocation = toolPart.toolInvocation;

        if (!invocation.toolCallId || invocation.state !== 'result') continue;
        if (processedToolsRef.current.has(invocation.toolCallId)) continue;

        const config = TOOL_PANEL_MAP[invocation.toolName];
        if (config && invocation.result !== undefined) {
          const title = config.getTitle(invocation.args);
          const data = config.transformData
            ? config.transformData(invocation.result, invocation.args)
            : { result: invocation.result, args: invocation.args };

          layout.spawnPanel(config.type, title, data);
          processedToolsRef.current.add(invocation.toolCallId);
        }
      }
    }
  }, [messages, autoSpawn, layout]);

  return {
    processToolCall,
    processToolInvocations,
    shouldSpawnPanel,
    getPanelTypeForTool,
  };
}

export default usePanelOrchestrator;
