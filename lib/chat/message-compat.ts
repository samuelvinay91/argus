/**
 * AI SDK v6 Message Compatibility Layer
 *
 * In AI SDK v6, UIMessage uses a parts-based format:
 * - parts: Array<TextUIPart | ReasoningUIPart | ToolInvocationUIPart | ...>
 *
 * This file provides helper functions for extracting content from messages.
 */

import type { UIMessage } from '@ai-sdk/react';

// Re-export UIMessage type as CompatMessage for backwards compatibility
export type CompatMessage = UIMessage;

/**
 * Extract text content from a message (v6 uses parts array)
 */
export function getMessageContent(message: UIMessage): string {
  if (message.parts) {
    const textParts = message.parts.filter(
      (part): part is { type: 'text'; text: string } => part.type === 'text'
    );
    return textParts.map(p => p.text).join('\n');
  }
  return '';
}

/**
 * Extract tool invocations from a message (v6 uses parts array)
 */
export function getToolInvocations(message: UIMessage): Array<{
  toolCallId: string;
  toolName: string;
  args: unknown;
  state: string;
  result?: unknown;
}> {
  if (message.parts) {
    const toolParts = message.parts.filter(
      (part) => part.type === 'tool-invocation'
    );
    return toolParts.map((part) => {
      // Use 'as unknown as' pattern to avoid TypeScript strict type overlap check
      const toolPart = part as unknown as {
        type: 'tool-invocation';
        toolInvocation: {
          toolCallId: string;
          toolName: string;
          args: unknown;
          state: string;
          result?: unknown;
        };
      };
      return {
        toolCallId: toolPart.toolInvocation.toolCallId,
        toolName: toolPart.toolInvocation.toolName,
        args: toolPart.toolInvocation.args,
        state: toolPart.toolInvocation.state,
        result: toolPart.toolInvocation.result,
      };
    });
  }
  return [];
}

/**
 * Check if a message has any content
 */
export function hasContent(message: UIMessage): boolean {
  return getMessageContent(message).trim().length > 0;
}

/**
 * Check if a message has tool invocations
 */
export function hasToolInvocations(message: UIMessage): boolean {
  return getToolInvocations(message).length > 0;
}

/**
 * Identity function for compatibility
 */
export function toCompatMessage(message: UIMessage): UIMessage {
  return message;
}

/**
 * Identity function for compatibility
 */
export function toCompatMessages(messages: UIMessage[]): UIMessage[] {
  return messages;
}
