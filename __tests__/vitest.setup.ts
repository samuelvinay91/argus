/**
 * Vitest Setup File
 *
 * This file runs before all tests and sets up the testing environment.
 * Includes comprehensive mocks for browser APIs not available in jsdom.
 */

import '@testing-library/jest-dom/vitest';
import { afterEach, beforeAll, afterAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ============================================
// Browser API Mocks
// ============================================

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
});
window.IntersectionObserver = mockIntersectionObserver as unknown as typeof IntersectionObserver;

// Mock ResizeObserver
const mockResizeObserver = vi.fn();
mockResizeObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
});
window.ResizeObserver = mockResizeObserver as unknown as typeof ResizeObserver;

// Mock scrollTo
window.scrollTo = vi.fn();

// ============================================
// Blob Mock with text() method
// ============================================
class MockBlob {
  private content: string;
  public size: number;
  public type: string;

  constructor(parts?: BlobPart[], options?: BlobPropertyBag) {
    this.content = parts ? parts.map(p => String(p)).join('') : '';
    this.size = this.content.length;
    this.type = options?.type || '';
  }

  async text(): Promise<string> {
    return this.content;
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    return encoder.encode(this.content).buffer;
  }

  slice(start?: number, end?: number, contentType?: string): Blob {
    return new MockBlob([this.content.slice(start, end)], { type: contentType || this.type });
  }

  stream(): ReadableStream {
    return new ReadableStream({
      start: (controller) => {
        controller.enqueue(new TextEncoder().encode(this.content));
        controller.close();
      }
    });
  }
}

// @ts-expect-error - Replacing global Blob
globalThis.Blob = MockBlob;

// ============================================
// URL.createObjectURL / revokeObjectURL
// ============================================
if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = vi.fn(() => 'blob:mock-url');
}
if (typeof URL.revokeObjectURL !== 'function') {
  URL.revokeObjectURL = vi.fn();
}

// ============================================
// Canvas Mock
// ============================================
class MockCanvasRenderingContext2D {
  canvas: HTMLCanvasElement;
  fillStyle = '#000000';
  strokeStyle = '#000000';
  lineWidth = 1;
  font = '10px sans-serif';
  textAlign: CanvasTextAlign = 'start';
  textBaseline: CanvasTextBaseline = 'alphabetic';
  globalAlpha = 1;
  globalCompositeOperation: GlobalCompositeOperation = 'source-over';

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  // Drawing methods
  fillRect = vi.fn();
  clearRect = vi.fn();
  strokeRect = vi.fn();
  fillText = vi.fn();
  strokeText = vi.fn();
  measureText = vi.fn(() => ({ width: 0, actualBoundingBoxAscent: 0, actualBoundingBoxDescent: 0 }));

  // Path methods
  beginPath = vi.fn();
  closePath = vi.fn();
  moveTo = vi.fn();
  lineTo = vi.fn();
  arc = vi.fn();
  arcTo = vi.fn();
  bezierCurveTo = vi.fn();
  quadraticCurveTo = vi.fn();
  rect = vi.fn();
  fill = vi.fn();
  stroke = vi.fn();
  clip = vi.fn();
  isPointInPath = vi.fn(() => false);

  // Transform methods
  scale = vi.fn();
  rotate = vi.fn();
  translate = vi.fn();
  transform = vi.fn();
  setTransform = vi.fn();
  resetTransform = vi.fn();
  getTransform = vi.fn(() => new DOMMatrix());

  // Image methods
  drawImage = vi.fn();
  createImageData = vi.fn(() => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }));
  getImageData = vi.fn(() => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }));
  putImageData = vi.fn();

  // State methods
  save = vi.fn();
  restore = vi.fn();

  // Gradient/Pattern
  createLinearGradient = vi.fn(() => ({
    addColorStop: vi.fn(),
  }));
  createRadialGradient = vi.fn(() => ({
    addColorStop: vi.fn(),
  }));
  createPattern = vi.fn();

  // Other
  setLineDash = vi.fn();
  getLineDash = vi.fn(() => []);
  createConicGradient = vi.fn(() => ({ addColorStop: vi.fn() }));
}

// Override getContext on HTMLCanvasElement
const originalGetContext = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function(
  contextId: string,
  options?: CanvasRenderingContext2DSettings
): RenderingContext | null {
  if (contextId === '2d') {
    return new MockCanvasRenderingContext2D(this) as unknown as CanvasRenderingContext2D;
  }
  return originalGetContext.call(this, contextId, options);
};

// Mock toBlob and toDataURL
HTMLCanvasElement.prototype.toBlob = vi.fn((callback: BlobCallback) => {
  callback(new MockBlob(['mock-image-data'], { type: 'image/png' }) as Blob);
});
HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,mock');

// ============================================
// localStorage Mock
// ============================================
const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = String(value);
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
};

if (typeof window !== 'undefined') {
  const localStorageMock = createLocalStorageMock();
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true,
  });
}

// ============================================
// Element API Mocks (for Radix UI, etc.)
// ============================================
Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
Element.prototype.setPointerCapture = vi.fn();
Element.prototype.releasePointerCapture = vi.fn();
Element.prototype.scrollIntoView = vi.fn();

// ============================================
// Fetch Mock
// ============================================
if (!globalThis.fetch) {
  globalThis.fetch = vi.fn() as typeof fetch;
}

// ============================================
// WebSocket Mock
// ============================================
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.OPEN;
  url: string;
  protocol = '';
  extensions = '';
  bufferedAmount = 0;
  binaryType: BinaryType = 'blob';

  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(url: string, protocols?: string | string[]) {
    this.url = url;
    if (protocols) {
      this.protocol = Array.isArray(protocols) ? protocols[0] : protocols;
    }
    // Simulate connection
    setTimeout(() => {
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 0);
  }

  send = vi.fn();
  close = vi.fn((code?: number, reason?: string) => {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code, reason }));
    }
  });
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  dispatchEvent = vi.fn(() => true);
}

// @ts-expect-error - Replacing global WebSocket
globalThis.WebSocket = MockWebSocket;

// ============================================
// Image Mock
// ============================================
class MockImage {
  src = '';
  width = 100;
  height = 100;
  onload: (() => void) | null = null;
  onerror: ((error: Error) => void) | null = null;

  constructor() {
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 0);
  }
}

// @ts-expect-error - Adding mock
globalThis.Image = MockImage;

// ============================================
// Console Suppression for Expected Errors
// ============================================
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = (...args: unknown[]) => {
    const message = args[0];
    if (
      typeof message === 'string' &&
      (message.includes('Warning: ReactDOM.render') ||
        message.includes('Warning: An update to') ||
        message.includes('act(...)') ||
        message.includes('Not implemented: HTMLCanvasElement'))
    ) {
      return;
    }
    originalConsoleError(...args);
  };

  console.warn = (...args: unknown[]) => {
    const message = args[0];
    if (
      typeof message === 'string' &&
      (message.includes('componentWillReceiveProps has been renamed') ||
        message.includes('React does not recognize'))
    ) {
      return;
    }
    originalConsoleWarn(...args);
  };
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});
