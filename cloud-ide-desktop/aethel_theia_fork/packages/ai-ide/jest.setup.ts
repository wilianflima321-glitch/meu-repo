import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

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
  // Mocha-style hooks (use a simple Function type to avoid naming a parameter
  // inside the type which can trigger no-unused-vars in some ESLint configs).
  before?: Function;
  after?: Function;
};
// Keep the cast permissive to avoid pulling in ambient global types here.
const gg = global as unknown as JestSetupGlobals & any;

// Polyfill TextEncoder/TextDecoder for older Node environments used by Jest
if (typeof gg.TextEncoder === 'undefined') {
  (gg as any).TextEncoder = TextEncoder;
  (gg as any).TextDecoder = TextDecoder;
}

// Provide mocha-style globals used in Theia tests (before, after)
if (typeof gg.before === 'undefined') {
  (gg as any).before = (_fn: Function) => {
    if (typeof _fn === 'function') {
      _fn();
    }
  };
}
if (typeof gg.after === 'undefined') {
  (gg as any).after = (_fn: Function) => {
    if (typeof _fn === 'function') {
      _fn();
    }
  };
}
