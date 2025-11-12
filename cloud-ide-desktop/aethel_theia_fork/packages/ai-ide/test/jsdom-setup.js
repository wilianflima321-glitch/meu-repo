// Minimal jsdom setup so Theia browser code can run under Node for tests
const { JSDOM } = require('jsdom');
// Provide an explicit URL so window.origin/localStorage are available
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
global.window = dom.window;
// Some browser libs reference the global `self` object (WebWorker/window alias).
// Ensure it's present and points to the jsdom window so code that uses `self` works.
global.self = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator || { userAgent: 'node.js' };
global.HTMLElement = dom.window.HTMLElement;
global.Element = dom.window.Element;
global.Node = dom.window.Node;
global.CustomEvent = dom.window.CustomEvent;
// Some libs reference DragEvent; JSDOM may not implement all UI event types so provide a minimal stub if missing
global.DragEvent = dom.window.DragEvent || function DragEvent() { };
// Basic helpers some libraries expect
global.getComputedStyle = dom.window.getComputedStyle;

// jsdom may not implement some older document APIs used by frontend code.
// Provide small, safe fallbacks so code can feature-detect without throwing.
if (typeof global.document.queryCommandSupported !== 'function') {
	global.document.queryCommandSupported = function () { return false; };
}
if (typeof global.document.execCommand !== 'function') {
	global.document.execCommand = function () { return false; };
}

// Provide a minimal localStorage if jsdom does not expose a usable one for this origin
try {
	if (!global.window.localStorage || typeof global.window.localStorage.getItem !== 'function') {
		const _store = new Map();
		global.window.localStorage = {
			getItem: (k) => (_store.has(k) ? _store.get(k) : null),
			setItem: (k, v) => _store.set(k, String(v)),
			removeItem: (k) => _store.delete(k),
			clear: () => _store.clear()
		};
		global.localStorage = global.window.localStorage;
	}
} catch (e) {
	// ignore and continue
}
