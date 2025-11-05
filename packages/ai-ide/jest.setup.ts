import '@testing-library/jest-dom';

// JSDOM global setup for tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({ matches: false, media: query, addListener: () => { }, removeListener: () => { } })
});

// Narrow the global to a typed shape so we avoid repeated `as any` casts.
interface GlobalWithJestPolyfills extends NodeJS.Global {
  TextEncoder?: typeof import('util').TextEncoder;
  TextDecoder?: typeof import('util').TextDecoder;
  before?: (fn: Function) => void;
  after?: (fn: Function) => void;
}
const gg = global as unknown as GlobalWithJestPolyfills;

// Polyfill TextEncoder/TextDecoder for older Node environments used by Jest
if (typeof gg.TextEncoder === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { TextEncoder, TextDecoder } = require('util');
  gg.TextEncoder = TextEncoder;
  gg.TextDecoder = TextDecoder;
}

// Provide mocha-style globals used in Theia tests (before, after)
if (typeof gg.before === 'undefined') {
  gg.before = (fn: Function) => fn();
}
if (typeof gg.after === 'undefined') {
  gg.after = (fn: Function) => fn();
}
