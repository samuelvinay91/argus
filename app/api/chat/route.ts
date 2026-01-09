/**
 * Chat API Route - Proxies to Python LangGraph Orchestrator
 *
 * This route forwards all chat requests to the Python backend which provides:
 * - Full LangGraph state management
 * - Durable execution (survives crashes via PostgresSaver)
 * - Long-term memory and conversation history
 * - Human-in-the-loop capabilities
 * - Multi-agent coordination
 *
 * Falls back to direct Claude API if Python backend is unavailable.
 */

import { anthropic } from '@ai-sdk/anthropic';
import { streamText, tool } from 'ai';
import { z } from 'zod';

// Use Edge runtime to avoid serverless function size limits
export const runtime = 'edge';

// Allow streaming responses up to 5 minutes for long-running tests
export const maxDuration = 300;

// Argus Core Backend (Python - LangGraph Orchestrator)
const BACKEND_URL = process.env.ARGUS_BACKEND_URL || 'http://localhost:8000';

// Cloudflare Worker API URL (Browser Automation)
const WORKER_URL = process.env.E2E_WORKER_URL || 'https://argus-api.samuelvinay-kumar.workers.dev';

// Helper to create fetch with timeout and retry logic
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = 90000,
  maxRetries: number = 2
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      // Don't retry on client errors (4xx), only on server errors (5xx) or network issues
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }

      // Server error - retry with exponential backoff
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on abort (timeout)
      if (lastError.name === 'AbortError') {
        throw lastError;
      }

      // Network error - retry with exponential backoff
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      throw lastError;
    }
  }

  throw lastError || new Error('Request failed after retries');
}

// Check if Python backend is available
async function isBackendAvailable(): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(`${BACKEND_URL}/health`, {
      method: 'GET',
    }, 5000, 0);
    return response.ok;
  } catch {
    return false;
  }
}

// Main handler - routes through Python orchestrator with fallback
export async function POST(req: Request) {
  try {
    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY is not set');
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY environment variable is not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Extract authentication from request headers
    const authHeader = req.headers.get('Authorization');
    const apiKey = req.headers.get('X-API-Key');

    const body = await req.json();
    const { messages, threadId, appUrl } = body;

    // Check if Python backend is available
    const backendAvailable = await isBackendAvailable();

    // TODO: Re-enable Python backend routing once SSE format is compatible with Vercel AI SDK
    // Currently the Python backend uses sse_starlette format which doesn't match AI SDK's expected format
    // For now, use direct Claude API with tools which has better browser automation support
    const usePythonBackend = false; // Temporarily disabled

    if (backendAvailable && usePythonBackend) {
      // Route through Python LangGraph orchestrator for full capabilities
      console.log('Routing chat through Python LangGraph orchestrator');

      try {
        // Build headers with authentication
        const backendHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        // Forward authentication to backend
        if (authHeader) {
          backendHeaders['Authorization'] = authHeader;
        }
        if (apiKey) {
          backendHeaders['X-API-Key'] = apiKey;
        }

        const response = await fetchWithTimeout(`${BACKEND_URL}/api/v1/chat/stream`, {
          method: 'POST',
          headers: backendHeaders,
          body: JSON.stringify({
            messages: messages.map((m: { role: string; content: string }) => ({
              role: m.role,
              content: m.content,
            })),
            thread_id: threadId,
            app_url: appUrl,
          }),
        }, 300000); // 5 minute timeout for streaming

        if (!response.ok) {
          console.error('Python backend error:', response.status, await response.text());
          // Fall through to direct Claude API
        } else {
          // Return the SSE stream directly from Python backend
          return new Response(response.body, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
            },
          });
        }
      } catch (error) {
        console.error('Failed to connect to Python backend, falling back to direct API:', error);
        // Fall through to direct Claude API
      }
    }

    // Fallback: Direct Claude API (limited capabilities)
    console.log('Using direct Claude API (Python backend not available)');

    const result = streamText({
      model: anthropic('claude-sonnet-4-20250514'),
      system: `You are Argus, an AI-powered E2E Testing Agent. You help users:
1. Create tests from natural language descriptions
2. Run tests and report results with self-healing capabilities
3. Discover application flows automatically
4. Detect visual regressions
5. Execute browser actions

NOTE: Running in DIRECT MODE (Python LangGraph backend not connected).
For full capabilities including durable execution, long-term memory, and human-in-the-loop,
deploy the Python backend: python -m uvicorn src.api.server:app --port 8000

QUICK ACTIONS (Always Available):
- Use executeAction for single browser actions (click, type, navigate)
- Use runTest for simple multi-step tests
- Use discoverElements to find interactive elements
- Use extractData to scrape structured data
- Use runAgent for autonomous task completion

Be helpful, concise, and proactive. Format test results clearly with pass/fail status.
When showing test steps, use numbered lists. When showing code or selectors, use code blocks.
Report any self-healing that occurred during tests.`,
      messages,
      tools: {
        // Execute a browser action using natural language
        executeAction: tool({
          description: 'Execute a browser action like clicking, typing, or navigating. Use for quick single actions.',
          parameters: z.object({
            url: z.string().describe('URL of the page to test'),
            instruction: z.string().describe('Natural language instruction (e.g., "Click the login button")'),
          }),
          execute: async ({ url, instruction }) => {
            try {
              const response = await fetchWithTimeout(`${WORKER_URL}/act`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  url,
                  instruction,
                  selfHeal: true,
                  screenshot: true,
                }),
              }, 60000);

              if (!response.ok) {
                const error = await response.text();
                return { success: false, error: `Action failed: ${error}` };
              }

              const data = await response.json();
              return {
                success: data.success,
                message: data.message,
                actions: data.actions,
                screenshot: data.screenshot,
                healed: data.healed,
                healingMethod: data.healingMethod,
              };
            } catch (error) {
              if (error instanceof Error && error.name === 'AbortError') {
                return { success: false, error: 'Action timed out after 60 seconds' };
              }
              return { success: false, error: String(error) };
            }
          },
        }),

        // Run a multi-step test
        runTest: tool({
          description: 'Run a multi-step E2E test with self-healing and screenshots. Use for quick test execution.',
          parameters: z.object({
            url: z.string().describe('Application URL to test'),
            steps: z.array(z.string()).describe('Array of test step instructions'),
            browser: z.string().optional().describe('Browser to use (chrome, firefox, safari)'),
          }),
          execute: async ({ url, steps, browser }) => {
            // Longer timeout for tests: 3 minutes base + 45 seconds per step
            const timeout = Math.max(180000, steps.length * 45000 + 60000);

            try {
              const response = await fetchWithTimeout(`${WORKER_URL}/test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  url,
                  steps,
                  browser: browser || 'chrome',
                  screenshot: true,
                  captureScreenshots: true,
                }),
              }, timeout);

              if (!response.ok) {
                const error = await response.text();
                return { success: false, error: `Test failed: ${error}` };
              }

              const data = await response.json();
              return {
                success: data.success,
                steps: data.steps,
                browsers: data.browsers,
                screenshots: data.screenshots,
                finalScreenshot: data.finalScreenshot,
                healingReport: data.healingReport,
              };
            } catch (error) {
              if (error instanceof Error && error.name === 'AbortError') {
                return {
                  success: false,
                  error: `Test timed out after ${Math.round(timeout / 1000)} seconds. The test may still be running on the server.`,
                  errorDetails: {
                    category: 'timeout',
                    isRetryable: true,
                    suggestedAction: 'Try reducing the number of steps or running fewer steps at once.',
                  },
                };
              }
              return {
                success: false,
                error: String(error),
                errorDetails: {
                  category: 'network',
                  isRetryable: true,
                  suggestedAction: 'Check your internet connection and try again.',
                },
              };
            }
          },
        }),

        // Discover interactive elements on a page
        discoverElements: tool({
          description: 'Discover interactive elements and possible actions on a page',
          parameters: z.object({
            url: z.string().describe('URL to analyze'),
            instruction: z.string().optional().describe('What to look for (e.g., "Find all buttons")'),
          }),
          execute: async ({ url, instruction }) => {
            try {
              const response = await fetchWithTimeout(`${WORKER_URL}/observe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  url,
                  instruction: instruction || 'What actions can I take on this page?',
                }),
              }, 60000);

              if (!response.ok) {
                const error = await response.text();
                return { success: false, error: `Discovery failed: ${error}` };
              }

              const data = await response.json();
              return { success: true, actions: data.actions };
            } catch (error) {
              if (error instanceof Error && error.name === 'AbortError') {
                return { success: false, error: 'Discovery timed out after 60 seconds' };
              }
              return { success: false, error: String(error) };
            }
          },
        }),

        // Extract data from a page
        extractData: tool({
          description: 'Extract structured data from a web page',
          parameters: z.object({
            url: z.string().describe('URL to extract data from'),
            instruction: z.string().describe('What data to extract'),
            schema: z.record(z.string()).optional().describe('Expected data schema'),
          }),
          execute: async ({ url, instruction, schema }) => {
            try {
              const response = await fetchWithTimeout(`${WORKER_URL}/extract`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  url,
                  instruction,
                  schema: schema || {},
                }),
              }, 60000);

              if (!response.ok) {
                const error = await response.text();
                return { success: false, error: `Extraction failed: ${error}` };
              }

              const data = await response.json();
              return { success: true, data };
            } catch (error) {
              if (error instanceof Error && error.name === 'AbortError') {
                return { success: false, error: 'Extraction timed out after 60 seconds' };
              }
              return { success: false, error: String(error) };
            }
          },
        }),

        // Run an autonomous agent task
        runAgent: tool({
          description: 'Run an autonomous agent to complete a complex task with screenshots',
          parameters: z.object({
            url: z.string().describe('Starting URL'),
            instruction: z.string().describe('Task to complete (e.g., "Sign up for a new account")'),
            maxSteps: z.number().optional().describe('Maximum steps to take'),
          }),
          execute: async ({ url, instruction, maxSteps }) => {
            const steps = maxSteps || 10;
            // Longer timeout for agent: 3 minutes base + 45 seconds per step
            const timeout = Math.max(180000, steps * 45000 + 60000);

            try {
              const response = await fetchWithTimeout(`${WORKER_URL}/agent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  url,
                  instruction,
                  maxSteps: steps,
                  captureScreenshots: true,
                }),
              }, timeout);

              if (!response.ok) {
                const error = await response.text();
                return { success: false, error: `Agent failed: ${error}` };
              }

              const data = await response.json();
              return {
                success: data.success,
                completed: data.completed,
                message: data.message,
                actions: data.actions,
                usage: data.usage,
                screenshots: data.screenshots,
              };
            } catch (error) {
              if (error instanceof Error && error.name === 'AbortError') {
                return {
                  success: false,
                  error: `Agent timed out after ${Math.round(timeout / 1000)} seconds. The task may still be running.`,
                  errorDetails: {
                    category: 'timeout',
                    isRetryable: true,
                    suggestedAction: 'Try reducing maxSteps or breaking the task into smaller parts.',
                  },
                };
              }
              return {
                success: false,
                error: String(error),
                errorDetails: {
                  category: 'network',
                  isRetryable: true,
                  suggestedAction: 'Check your internet connection and try again.',
                },
              };
            }
          },
        }),

        // Check system status
        checkSystemStatus: tool({
          description: 'Check the status of Argus components (Brain and Browser Worker)',
          parameters: z.object({}),
          execute: async () => {
            const [brainStatus, workerStatus] = await Promise.all([
              isBackendAvailable().then(ok => ({
                name: 'Argus Brain (Python/LangGraph)',
                url: BACKEND_URL,
                status: ok ? 'connected' : 'disconnected',
                capabilities: ok ? ['orchestration', 'code-analysis', 'nlp-tests', 'visual-ai', 'auto-discovery', 'durable-execution', 'memory'] : [],
              })),
              fetchWithTimeout(`${WORKER_URL}/health`, { method: 'GET' }, 5000)
                .then(r => r.ok)
                .catch(() => false)
                .then(ok => ({
                  name: 'Argus Worker (Cloudflare/Browser)',
                  url: WORKER_URL,
                  status: ok ? 'connected' : 'disconnected',
                  capabilities: ok ? ['browser-automation', 'self-healing', 'screenshots', 'extraction'] : [],
                })),
            ]);

            return {
              success: true,
              components: [brainStatus, workerStatus],
              fullCapabilities: brainStatus.status === 'connected' && workerStatus.status === 'connected',
              mode: brainStatus.status === 'connected' ? 'orchestrated' : 'direct',
            };
          },
        }),
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        details: String(error)
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
