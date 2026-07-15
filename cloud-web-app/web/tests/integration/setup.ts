/**
 * Test Setup
 * Global setup for integration tests
 */

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

// Mock fetch
global.fetch = jest.fn((url: string, options?: any) => {
  console.log(`[Mock Fetch] ${options?.method || 'GET'} ${url}`);
  
  // Mock responses based on URL
  if (url.includes('/api/lsp/start')) {
    return Promise.resolve({
      ok: true,
      json: async () => ({ sessionId: 'mock-lsp-session' }),
    } as Response);
  }

  if (url.includes('/api/dap/start')) {
    return Promise.resolve({
      ok: true,
      json: async () => ({ sessionId: 'mock-dap-session' }),
    } as Response);
  }

  if (url.includes('/api/ai/')) {
    return Promise.resolve({
      ok: true,
      json: async () => ({
        completions: [{ text: 'mock completion', confidence: 0.9 }],
        content: 'mock hover content',
        actions: [],
        analysis: 'mock analysis',
        possibleCauses: ['cause 1'],
        suggestions: ['suggestion 1'],
        tests: 'mock tests',
        coverage: { lines: 100, branches: 100, functions: 100 },
        message: 'mock commit message',
        comments: [],
        summary: 'mock summary',
        score: 85,
        resolution: 'mock resolution',
        explanation: 'mock explanation',
        confidence: 0.9,
      }),
    } as Response);
  }

  if (url.includes('/api/lsp/request') || url.includes('/api/dap/request')) {
    return Promise.resolve({
      ok: true,
      json: async () => ({
        success: true,
        result: {},
        body: {},
      }),
    } as Response);
  }

  // Default mock response
  return Promise.resolve({
    ok: true,
    json: async () => ({}),
  } as Response);
}) as jest.Mock;

// Mock document
Object.defineProperty(global, 'document', {
  value: {
    documentElement: {
      style: {
        setProperty: jest.fn(),
      },
      classList: {
        add: jest.fn(),
        remove: jest.fn(),
      },
    },
  },
});

// Clear mocks before each test
beforeEach(() => {
  localStorageMock.clear();
  (global.fetch as jest.Mock).mockClear();
});

console.log('[Test Setup] Integration test environment initialized');
