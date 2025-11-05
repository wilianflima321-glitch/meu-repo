import '@testing-library/jest-dom';

// JSDOM global setup for tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({ matches: false, media: query, addListener: () => { }, removeListener: () => { } })
});

// Narrow the global shape used in this setup without extending NodeJS.Global to
// avoid interface incompatibilities with existing ambient types.
type JestSetupGlobals = {
  TextEncoder?: typeof import('util').TextEncoder;
  TextDecoder?: typeof import('util').TextDecoder;
  before?: (fn: Function) => void;
  after?: (fn: Function) => void;
};
const gg = global as unknown as (JestSetupGlobals & typeof globalThis);

// Polyfill TextEncoder/TextDecoder for older Node environments used by Jest
if (typeof gg.TextEncoder === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { TextEncoder, TextDecoder } = require('util');
  gg.TextEncoder = TextEncoder;
  gg.TextDecoder = TextDecoder;
}

// Provide mocha-style globals used in Theia tests (before, after)
if (typeof gg.before === 'undefined') {
  (gg as any).before = (fn: Function) => fn();
}
if (typeof gg.after === 'undefined') {
  (gg as any).after = (fn: Function) => fn();
}
