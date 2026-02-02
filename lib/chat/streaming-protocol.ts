/**
 * Streaming Protocol Parser
 *
 * Parses AG-UI style Server-Sent Events (SSE) for rich real-time updates.
 * Handles: text_delta, agent_start, agent_progress, phase_transition, screenshot, etc.
 */

import type { StreamingEventType } from './chat-store';
import { getAgentConfig } from './agent-config';

// =============================================================================
// TYPES
// =============================================================================

/** Raw SSE event from backend */
export interface RawStreamEvent {
  event?: string;
  data: string;
  id?: string;
  retry?: number;
}

/** Parsed streaming event */
export interface ParsedStreamEvent {
  type: StreamingEventType;
  data: StreamEventData;
  id?: string;
  timestamp: Date;
}

/** Union type for all event data payloads */
export type StreamEventData =
  | TextDeltaData
  | AgentStartData
  | AgentProgressData
  | AgentCompleteData
  | PhaseTransitionData
  | ToolCallData
  | ToolResultData
  | ScreenshotData
  | ErrorData;

// === Event Data Types ===

export interface TextDeltaData {
  delta: string;
  messageId: string;
}

export interface AgentStartData {
  agentId: string;
  agentType: string;
  name?: string;
  message?: string;
}

export interface AgentProgressData {
  agentId: string;
  progress: number; // 0-100
  message?: string;
  currentTool?: string;
}

export interface AgentCompleteData {
  agentId: string;
  status: 'complete' | 'error';
  confidence?: number;
  message?: string;
  result?: unknown;
}

export interface PhaseTransitionData {
  from: string;
  to: string;
  message?: string;
}

export interface ToolCallData {
  id: string;
  toolName: string;
  args: Record<string, unknown>;
}

export interface ToolResultData {
  id: string;
  result: unknown;
  success: boolean;
  error?: string;
}

export interface ScreenshotData {
  id: string;
  url?: string;
  base64?: string;
  label?: string;
  step?: number;
}

export interface ErrorData {
  code: string;
  message: string;
  details?: unknown;
}

// =============================================================================
// PARSER
// =============================================================================

/**
 * Parse a raw SSE line into a structured event
 */
export function parseSSELine(line: string): RawStreamEvent | null {
  if (!line || line.startsWith(':')) return null; // Comment or empty

  const colonIndex = line.indexOf(':');
  if (colonIndex === -1) return null;

  const field = line.slice(0, colonIndex);
  const value = line.slice(colonIndex + 1).trimStart();

  return {
    [field]: value,
  } as unknown as RawStreamEvent;
}

/**
 * Parse SSE event data (JSON or plain text)
 */
export function parseEventData(data: string): unknown {
  try {
    return JSON.parse(data);
  } catch {
    // Return as plain text if not JSON
    return data;
  }
}

/**
 * Determine event type from SSE event name or data structure
 */
export function determineEventType(eventName: string | undefined, data: unknown): StreamingEventType {
  // Use explicit event name if provided
  if (eventName) {
    const typeMap: Record<string, StreamingEventType> = {
      'text-delta': 'text_delta',
      'text_delta': 'text_delta',
      'agent-start': 'agent_start',
      'agent_start': 'agent_start',
      'agent-progress': 'agent_progress',
      'agent_progress': 'agent_progress',
      'agent-complete': 'agent_complete',
      'agent_complete': 'agent_complete',
      'phase-transition': 'phase_transition',
      'phase_transition': 'phase_transition',
      'tool-call': 'tool_call',
      'tool_call': 'tool_call',
      'tool-result': 'tool_result',
      'tool_result': 'tool_result',
      'screenshot': 'screenshot',
      'error': 'error',
    };
    return typeMap[eventName] || 'text_delta';
  }

  // Infer from data structure
  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    if ('delta' in obj) return 'text_delta';
    if ('agentType' in obj && 'agentId' in obj) {
      if ('status' in obj) return 'agent_complete';
      if ('progress' in obj) return 'agent_progress';
      return 'agent_start';
    }
    if ('from' in obj && 'to' in obj) return 'phase_transition';
    if ('toolName' in obj && 'args' in obj) return 'tool_call';
    if ('result' in obj && 'id' in obj) return 'tool_result';
    if ('base64' in obj || ('url' in obj && 'step' in obj)) return 'screenshot';
    if ('code' in obj && 'message' in obj) return 'error';
  }

  // Default to text delta for simple strings
  return 'text_delta';
}

/**
 * Parse a complete SSE event (accumulated from multiple lines)
 */
export function parseStreamEvent(event: RawStreamEvent): ParsedStreamEvent | null {
  if (!event.data) return null;

  const data = parseEventData(event.data);
  const type = determineEventType(event.event, data);

  // Normalize the data based on type
  let normalizedData: StreamEventData;

  switch (type) {
    case 'text_delta':
      normalizedData = typeof data === 'string'
        ? { delta: data, messageId: '' }
        : data as TextDeltaData;
      break;

    case 'agent_start': {
      const agentData = data as Partial<AgentStartData>;
      const agentConfig = getAgentConfig(agentData.agentType || '');
      normalizedData = {
        agentId: agentData.agentId || crypto.randomUUID(),
        agentType: agentData.agentType || 'unknown',
        name: agentData.name || agentConfig.name,
        message: agentData.message,
      } as AgentStartData;
      break;
    }

    case 'agent_progress':
      normalizedData = {
        agentId: (data as Partial<AgentProgressData>).agentId || '',
        progress: Math.min(100, Math.max(0, (data as Partial<AgentProgressData>).progress || 0)),
        message: (data as Partial<AgentProgressData>).message,
        currentTool: (data as Partial<AgentProgressData>).currentTool,
      } as AgentProgressData;
      break;

    case 'agent_complete':
      normalizedData = data as AgentCompleteData;
      break;

    case 'phase_transition':
      normalizedData = data as PhaseTransitionData;
      break;

    case 'tool_call':
      normalizedData = data as ToolCallData;
      break;

    case 'tool_result':
      normalizedData = data as ToolResultData;
      break;

    case 'screenshot':
      normalizedData = data as ScreenshotData;
      break;

    case 'error':
      normalizedData = typeof data === 'string'
        ? { code: 'UNKNOWN', message: data }
        : data as ErrorData;
      break;

    default:
      normalizedData = { delta: String(data), messageId: '' };
  }

  return {
    type,
    data: normalizedData,
    id: event.id,
    timestamp: new Date(),
  };
}

// =============================================================================
// STREAM PROCESSOR
// =============================================================================

export interface StreamProcessor {
  onTextDelta?: (data: TextDeltaData) => void;
  onAgentStart?: (data: AgentStartData) => void;
  onAgentProgress?: (data: AgentProgressData) => void;
  onAgentComplete?: (data: AgentCompleteData) => void;
  onPhaseTransition?: (data: PhaseTransitionData) => void;
  onToolCall?: (data: ToolCallData) => void;
  onToolResult?: (data: ToolResultData) => void;
  onScreenshot?: (data: ScreenshotData) => void;
  onError?: (data: ErrorData) => void;
}

/**
 * Create a stream processor that dispatches events to handlers
 */
export function createStreamProcessor(handlers: StreamProcessor) {
  return (event: ParsedStreamEvent) => {
    switch (event.type) {
      case 'text_delta':
        handlers.onTextDelta?.(event.data as TextDeltaData);
        break;
      case 'agent_start':
        handlers.onAgentStart?.(event.data as AgentStartData);
        break;
      case 'agent_progress':
        handlers.onAgentProgress?.(event.data as AgentProgressData);
        break;
      case 'agent_complete':
        handlers.onAgentComplete?.(event.data as AgentCompleteData);
        break;
      case 'phase_transition':
        handlers.onPhaseTransition?.(event.data as PhaseTransitionData);
        break;
      case 'tool_call':
        handlers.onToolCall?.(event.data as ToolCallData);
        break;
      case 'tool_result':
        handlers.onToolResult?.(event.data as ToolResultData);
        break;
      case 'screenshot':
        handlers.onScreenshot?.(event.data as ScreenshotData);
        break;
      case 'error':
        handlers.onError?.(event.data as ErrorData);
        break;
    }
  };
}

// =============================================================================
// SSE EVENT SOURCE WRAPPER
// =============================================================================

export interface StreamConnectionOptions {
  url: string;
  headers?: Record<string, string>;
  onEvent: (event: ParsedStreamEvent) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Error) => void;
  retryOnError?: boolean;
  maxRetries?: number;
}

/**
 * Create an SSE connection with automatic parsing
 */
export function createStreamConnection(options: StreamConnectionOptions) {
  const {
    url,
    headers,
    onEvent,
    onOpen,
    onClose,
    onError,
    retryOnError = true,
    maxRetries = 3,
  } = options;

  let eventSource: EventSource | null = null;
  let retryCount = 0;
  let buffer = '';

  const connect = () => {
    // Use fetch for custom headers support (EventSource doesn't support custom headers)
    const abortController = new AbortController();

    fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
        ...headers,
      },
      signal: abortController.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        onOpen?.();
        retryCount = 0;

        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          let currentEvent: RawStreamEvent = { data: '' };

          for (const line of lines) {
            if (line === '') {
              // Empty line = end of event
              if (currentEvent.data) {
                const parsed = parseStreamEvent(currentEvent);
                if (parsed) {
                  onEvent(parsed);
                }
              }
              currentEvent = { data: '' };
            } else if (line.startsWith('data:')) {
              const data = line.slice(5).trimStart();
              currentEvent.data = currentEvent.data
                ? currentEvent.data + '\n' + data
                : data;
            } else if (line.startsWith('event:')) {
              currentEvent.event = line.slice(6).trimStart();
            } else if (line.startsWith('id:')) {
              currentEvent.id = line.slice(3).trimStart();
            } else if (line.startsWith('retry:')) {
              currentEvent.retry = parseInt(line.slice(6).trimStart(), 10);
            }
          }
        }

        onClose?.();
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;

        onError?.(error);

        if (retryOnError && retryCount < maxRetries) {
          retryCount++;
          setTimeout(connect, 1000 * retryCount);
        } else {
          onClose?.();
        }
      });

    return {
      close: () => {
        abortController.abort();
        onClose?.();
      },
    };
  };

  return connect();
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if an event indicates the stream is complete
 */
export function isStreamComplete(event: ParsedStreamEvent): boolean {
  if (event.type === 'error') return true;
  if (event.type === 'phase_transition') {
    const data = event.data as PhaseTransitionData;
    return data.to === 'idle' || data.to === 'complete';
  }
  return false;
}

/**
 * Get a human-readable description of an event
 */
export function getEventDescription(event: ParsedStreamEvent): string {
  switch (event.type) {
    case 'text_delta':
      return 'Receiving response...';
    case 'agent_start': {
      const data = event.data as AgentStartData;
      return `${data.name || data.agentType} started`;
    }
    case 'agent_progress': {
      const data = event.data as AgentProgressData;
      return data.message || `Progress: ${data.progress}%`;
    }
    case 'agent_complete': {
      const data = event.data as AgentCompleteData;
      return data.status === 'complete'
        ? `Agent completed${data.confidence ? ` (${data.confidence}% confidence)` : ''}`
        : `Agent failed: ${data.message || 'Unknown error'}`;
    }
    case 'phase_transition': {
      const data = event.data as PhaseTransitionData;
      return `Phase: ${data.from} → ${data.to}`;
    }
    case 'tool_call': {
      const data = event.data as ToolCallData;
      return `Calling ${data.toolName}...`;
    }
    case 'tool_result': {
      const data = event.data as ToolResultData;
      return data.success ? 'Tool completed' : `Tool failed: ${data.error}`;
    }
    case 'screenshot':
      return 'Screenshot captured';
    case 'error': {
      const data = event.data as ErrorData;
      return `Error: ${data.message}`;
    }
    default:
      return 'Processing...';
  }
}

export default {
  parseSSELine,
  parseEventData,
  parseStreamEvent,
  createStreamProcessor,
  createStreamConnection,
  isStreamComplete,
  getEventDescription,
};
