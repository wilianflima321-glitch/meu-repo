"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("@testing-library/jest-dom");
const util_1 = require("util");
// JSDOM global setup for tests
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query) => ({ matches: false, media: query, addListener: () => { }, removeListener: () => { } })
});
// Keep the cast permissive to avoid pulling in ambient global types here.
const gg = global;
// Polyfill TextEncoder/TextDecoder for older Node environments used by Jest
if (typeof gg.TextEncoder === 'undefined') {
    gg.TextEncoder = util_1.TextEncoder;
    gg.TextDecoder = util_1.TextDecoder;
}
// Provide mocha-style globals used in Theia tests (before, after)
if (typeof gg.before === 'undefined') {
    gg.before = (_fn) => {
        if (typeof _fn === 'function') {
            _fn();
        }
    };
}
if (typeof gg.after === 'undefined') {
    gg.after = (_fn) => {
        if (typeof _fn === 'function') {
            _fn();
        }
    };
}
