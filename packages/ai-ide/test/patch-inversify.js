// Lightweight test shim to make inversify decorators tolerant during unit tests.
// This file is intended to be --required before running mocha so modules that
// apply @inject/@injectable at import time don't crash the test runner.
try {
  // Ensure reflect-metadata polyfill is loaded so tslib __metadata decorators
  // produce functions instead of `undefined` entries in decorator arrays.
  try { require('reflect-metadata'); } catch (e) { /* ignore if not installed */ }
  // Make Reflect.decorate tolerant by filtering out any non-function decorators
  try {
    if (typeof Reflect !== 'undefined' && typeof Reflect.decorate === 'function') {
      const _origReflectDecorate = Reflect.decorate;
      // Replace any non-function entries with a no-op decorator to avoid
      // "decorator is not a function" runtime errors when compiled tslib
      // emits undefined or non-callable entries in the decorators array.
      Reflect.decorate = function (decorators, target, propertyKey, descriptor) {
        try {
          if (Array.isArray(decorators)) {
            decorators = decorators.map(d => {
              if (typeof d === 'function') return d;
              // Return a safe no-op decorator: accepts the standard args and
              // returns undefined (i.e. doesn't alter the target/descriptor).
              return function () { /* no-op decorator */ };
            });
          }
        }
        catch (e) { /* ignore */ }
        return _origReflectDecorate.call(this, decorators, target, propertyKey, descriptor);
      };
    }
  }
  catch (e) { /* ignore */ }
  // Patch inversify if present in node_modules
  let inv;
  try {
    inv = require('inversify');
  }
  catch (e) {
    inv = null;
  }
  const Module = require('module');
  const origLoad = Module._load;
  // Map of module request -> mock file (absolute). We'll lazily resolve the mock path.
  const path = require('path');
  const pkgRoot = path.resolve(__dirname, '..');
  const mockMap = new Map([
    // targeted core mappings — avoid mapping top-level '@theia/core' to prevent
    // overriding shared subpaths (e.g. '@theia/core/shared/ajv') which should
    // load real implementations.
    // Lumino domutils triggers Element/document usage; map to a light mock
    ['@lumino/domutils', path.join(pkgRoot, '__mocks__', 'lumino-domutils-mock.js')],
    ['@lumino/domutils/dist/index.js', path.join(pkgRoot, '__mocks__', 'lumino-domutils-mock.js')],
  // Prefer the explicit URI mock before the generic core mock so imports
  // like '@theia/core/lib/common/uri' resolve to a vscode-uri-compatible
  // implementation instead of the general core mock.
  ['@theia/core/lib/common/uri', path.join(pkgRoot, '__mocks__', 'vscode-uri.js')],
  ['vscode-uri', path.join(pkgRoot, '__mocks__', 'vscode-uri.js')],
    ['@theia/debug/lib/browser/debug-configuration-manager', path.join(pkgRoot, '__mocks__', 'debug-configuration-manager-mock.js')],
    ['@theia/debug/lib/browser/debug-session-manager', path.join(pkgRoot, '__mocks__', 'debug-session-manager-mock.js')],
    ['@theia/filesystem', path.join(pkgRoot, '__mocks__', 'theia-filesystem-mock.js')],
    ['@theia/filesystem/lib/browser', path.join(pkgRoot, '__mocks__', 'theia-filesystem-mock.js')],
    ['@theia/filesystem/lib/browser/file-tree', path.join(pkgRoot, '__mocks__', 'theia-filesystem-mock.js')],
    // Monaco wrappers sometimes import from the '@theia/monaco' package path
    // Map those requests to our lightweight monaco mock to avoid decorator
    // and DOM import-time crashes in Node tests.
    ['@theia/monaco', path.join(pkgRoot, '__mocks__', 'theia-monaco-mock.js')],
    ['@theia/monaco/lib/browser/monaco-editor', path.join(pkgRoot, '__mocks__', 'theia-monaco-mock.js')],
    // Explicitly map a few problematic common subpaths to the core mock so
    // their import-time decorators don't crash the test runner.
    ['@theia/core/lib/common/contribution-filter', path.join(pkgRoot, '__mocks__', 'theia-core-mock.js')],
    ['@theia/core/lib/common/contribution-provider', path.join(pkgRoot, '__mocks__', 'theia-core-mock.js')],
    ['@theia/core/lib/common/command', path.join(pkgRoot, '__mocks__', 'theia-core-mock.js')],
    ['@theia/core/lib/common/index', path.join(pkgRoot, '__mocks__', 'theia-core-mock.js')],
    ['@theia/core/lib/browser/opener-service', path.join(pkgRoot, '__mocks__', 'theia-core-mock.js')],
  ['@theia/core/lib/common/content-replacer', path.join(pkgRoot, '__mocks__', 'content-replacer-mock.js')],
  // Core mock (kept after specific core subpath mappings)
  ['@theia/core', path.join(pkgRoot, '__mocks__', 'theia-core-mock.js')],
  ['@theia/core/lib/browser', path.join(pkgRoot, '__mocks__', 'theia-core-mock.js')],
  ['@theia/core/lib/common', path.join(pkgRoot, '__mocks__', 'theia-core-mock.js')],
    ['@theia/core/lib/browser/widgets/react-widget', path.join(pkgRoot, '__mocks__', 'react-widget.js')],
    ['@theia/debug/lib/browser/debug-session-options', path.join(pkgRoot, '__mocks__', 'debug-session-options-mock.js')],
    ['@theia/monaco-editor-core', path.join(pkgRoot, '__mocks__', 'theia-monaco-mock.js')],
    ['@theia/monaco-editor-core/esm', path.join(pkgRoot, '__mocks__', 'theia-monaco-mock.js')]
  ]);

  // Build a safe inversify shim which provides decorator helpers as no-ops.
  // A lightweight shim that provides common decorator helpers as no-ops and a
  // minimal Container stub so modules that instantiate Container don't crash.
  class _ContainerStub {
    constructor() {
      this._bindings = new Map();
      this._singletons = new Map();
    }
    bind(id) {
      const self = this;
      // Return a fluent binding API supporting common methods used in tests
      const bindingEntry = { id, target: undefined, dynamic: false, singleton: false };
      return {
        to(target) {
          bindingEntry.target = target;
          self._bindings.set(id, bindingEntry);
          return this;
        },
        toSelf() {
          // Bind the identifier to itself (common pattern in tests)
          bindingEntry.target = id;
          self._bindings.set(id, bindingEntry);
          return this;
        },
        toConstantValue(v) {
          bindingEntry.target = v;
          // mark as constant by storing the raw value
          self._bindings.set(id, bindingEntry);
          return this;
        },
        toDynamicValue(fn) {
          bindingEntry.target = { __dynamic: true, fn };
          bindingEntry.dynamic = true;
          self._bindings.set(id, bindingEntry);
          return this;
        },
        inSingletonScope() {
          bindingEntry.singleton = true;
          self._bindings.set(id, bindingEntry);
          return this;
        }
      };
    }
    get(id) {
      const entry = this._bindings.get(id);
      if (!entry) {
        throw new Error(`Container.get: no binding for ${String(id)}`);
      }
      // If the entry was registered as a raw constant value
      if (!entry.target || (typeof entry.target !== 'function' && !entry.dynamic && !entry.target.__dynamic)) {
        // If the target is an object (constant), return it directly
        if (entry && entry.target !== undefined && typeof entry.target !== 'function') {
          return entry.target;
        }
      }
      // Handle dynamic value
      if (entry.target && entry.target.__dynamic && typeof entry.target.fn === 'function') {
        return entry.target.fn();
      }
      // Handle constructor instantiation with property injection and singleton caching
      const ctor = (entry.target === id) ? id : entry.target;
      if (typeof ctor === 'function') {
        // singleton caching
        if (entry.singleton && this._singletons.has(id)) {
          return this._singletons.get(id);
        }
        const instance = new ctor();
        // Perform property injections recorded by our decorator shim
        try {
          const injections = ctor.__injections || [];
          for (const inj of injections) {
            try {
              const prop = inj.propertyKey;
              const name = inj.serviceIdentifierName || inj.serviceIdentifier;
              // Try to find a binding that matches the recorded name
              let bindingKey = undefined;
              for (const k of this._bindings.keys()) {
                try {
                  if (k && k.name && k.name === name) { bindingKey = k; break; }
                  if (String(k) === String(name)) { bindingKey = k; break; }
                }
                catch (e) { }
              }
              if (bindingKey) {
                instance[prop] = this.get(bindingKey);
              }
            }
            catch (e) { /* ignore individual injection errors */ }
          }
        }
        catch (e) { }
        if (entry.singleton) {
          this._singletons.set(id, instance);
        }
        return instance;
      }
      // Fallback: return stored target as-is
      return entry.target;
    }
  }

  const invShim = {
    inject: function () { return function () { /* no-op decorator */ }; },
    injectable: function () { return function () { /* no-op decorator */ }; },
    unmanaged: function () { return function () { /* no-op decorator */ }; },
    multiInject: function () { return function () { /* no-op decorator */ }; },
    optional: function () { return function () { /* no-op decorator */ }; },
    named: function () { return function () { /* no-op decorator */ }; },
    tagged: function () { return function () { /* no-op decorator */ }; },
    postConstruct: function () { return function () { /* no-op */ }; },
    Container: _ContainerStub,
    decorate: function () { /* no-op */ },
    metadata: function () { /* no-op */ }
  };

  // Ensure minimal DOM globals are present early so modules that touch DOM at
  // import-time (lumino) don't crash. When jsdom is present it will override
  // these no-op shims, but providing them helps guard import-time requires.
  try {
    if (typeof global.window === 'undefined') {
      global.window = { document: {} };
    }
    if (typeof global.document === 'undefined') {
      global.document = {
        createElement: () => ({ appendChild: () => {} }),
        createElementNS: () => ({}),
        body: { appendChild: () => {} },
        addEventListener: () => {},
      };
      global.window.document = global.document;
    }
    if (typeof global.navigator === 'undefined') {
      global.navigator = { userAgent: 'node' };
    }
    // Minimal localStorage shim used by some Theia modules at import/runtime
    if (typeof global.localStorage === 'undefined') {
      global.localStorage = (function () {
        const store = new Map();
        return {
          getItem(k) { return store.has(k) ? store.get(k) : null; },
          setItem(k, v) { store.set(String(k), String(v)); },
          removeItem(k) { store.delete(k); },
          clear() { store.clear(); }
        };
      })();
    }
    // Ensure window.localStorage points to the same shim (nls.js reads window.localStorage)
    try {
      if (global.window && typeof global.window.localStorage === 'undefined') {
        global.window.localStorage = global.localStorage;
      }
    } catch (e) { /* ignore */ }
    // Minimal DOM classes used by lumino/monaco and other browser libs
    try {
      if (typeof global.Element === 'undefined') {
        global.Element = class {};
      }
      if (typeof global.HTMLElement === 'undefined') {
        global.HTMLElement = class extends global.Element {};
      }
      if (typeof global.Node === 'undefined') {
        global.Node = class {};
      }
      if (typeof global.document !== 'undefined' && typeof global.document.createDocumentFragment === 'undefined') {
        global.document.createDocumentFragment = () => ({ appendChild: () => {} });
      }
      // minimal window.location to avoid href/location reads
      if (typeof global.window !== 'undefined' && typeof global.window.location === 'undefined') {
        global.window.location = { href: '' };
      }
    } catch (e) { /* ignore */ }
  }
  catch (e) {
    // ignore
  }
  Module._load = function (request, parent, isMain) {
    try {
      // DEBUG: log Theia-related requests that may bypass mock mapping
      try {
        if (typeof request === 'string' && (request.indexOf('@theia') !== -1 || request.indexOf('contribution-filter') !== -1)) {
          // eslint-disable-next-line no-console
          console.error('[patch-inversify] request:', request);
        }
      } catch (e) { }
      // Intercept 'inversify' early and return our shim so decorators are safe at import-time.
      if (request === 'inversify' || (typeof request === 'string' && request.endsWith('/shared/inversify'))) {
        // If the request is the internal Theia shared inversify module, prefer
        // to return a lightweight local shim to avoid decorator runtime errors
        // during import-time in Node tests. For the plain 'inversify' request
        // prefer real inversify (wrapped) when available.
        if (request === '@theia/core/shared/inversify') {
          try {
            return origLoad.call(this, path.join(pkgRoot, '__mocks__', 'inversify-shim.js'), parent, isMain);
          }
          catch (e) {
            // fallback to previous behavior
          }
        }
        if (request === 'inversify') {
          if (typeof invHybrid !== 'undefined' && invHybrid) return invHybrid;
          if (inv) return inv;
          return invShim;
        }
        // For any other '/shared/inversify' style request, fall back to the shim
        return invShim;
      }
      // Exact matches or prefix matches for specific Theia modules -> local __mocks__ files
      for (const [key, mockPath] of mockMap.entries()) {
        if (typeof request === 'string') {
          // Normalize slashes so Windows absolute paths match our package keys
          const normalizedReq = request.replace(/\\/g, '/');
          const normalizedKey = key.replace(/\\/g, '/');
          // Don't shadow internal shared modules that should load real implementations
          if (normalizedReq.indexOf('/shared/') !== -1) {
            continue;
          }
          // Direct match or package-style prefix. Avoid broad substring matches
          // (e.g. don't map '@theia/core/lib/common/uri-command-handler' to
          // the '@theia/core/lib/common/uri' mock). Only exact matches or
          // true package-prefixes are remapped here.
          if (normalizedReq === normalizedKey || normalizedReq.startsWith(normalizedKey + '/')) {
            return origLoad.call(this, mockPath, parent, isMain);
          }
          // If the request is relative (e.g. './contribution-filter'), resolve it to an absolute filename
          // Only attempt to resolve *relative* requests here — do not treat scoped
          // package-style requests (which contain '/') as relative, otherwise a
          // key like '@theia/core/lib/common/uri' may accidentally match
          // '@theia/core/lib/common/uri-command-handler' via substring checks.
          if (normalizedReq.startsWith('./') || normalizedReq.startsWith('../')) {
            try {
              const resolved = Module._resolveFilename(request, parent);
              const normalizedResolved = String(resolved).replace(/\\/g, '/');
              if (normalizedResolved.indexOf(normalizedKey) !== -1) {
                return origLoad.call(this, mockPath, parent, isMain);
              }
            }
            catch (e) {
              // ignore resolve errors and continue
            }
          }
        }
      }
    }
    catch (e) {
      // ignore and fall through to original loader
    }
    // Load the requested module via the original loader, then perform any
    // post-load adjustments (for example re-wrapping reflect-metadata if it
    // was just loaded, since some test configs require it after this file).
    const res = origLoad.apply(this, arguments);
    try {
      if (typeof request === 'string' && request.indexOf('reflect-metadata') !== -1) {
        // Re-apply our tolerant Reflect.decorate wrapper to the implementation
        // installed by reflect-metadata so it remains robust against non-function
        // decorator entries.
        try {
          if (typeof Reflect !== 'undefined' && typeof Reflect.decorate === 'function') {
            const _orig = Reflect.decorate;
            Reflect.decorate = function (decorators, target, propertyKey, descriptor) {
              try {
                if (Array.isArray(decorators)) {
                  decorators = decorators.map(d => (typeof d === 'function' ? d : function () { }));
                }
              }
              catch (e) { /* ignore */ }
              return _orig.call(this, decorators, target, propertyKey, descriptor);
            };
          }
        }
        catch (e) { /* ignore */ }
      }
    }
    catch (e) { /* ignore */ }
    return res;
  };
  // Wrap functions on the inversify object to avoid throwing if decorators are applied to undefined
  function safeWrap(fn) {
    if (typeof fn !== 'function') return function () { return function () {}; };
    return function () {
      try { return fn.apply(this, arguments); }
      catch (e) { return function () {}; }
    };
  }
  // If real inversify is present wrap its decorator helpers to make them
  // tolerant during import-time decoration. If inversify isn't present this
  // code is skipped and our invShim will be used by the loader above.
  if (inv) {
    try {
      if (typeof inv.inject === 'function') inv.inject = safeWrap(inv.inject);
      if (typeof inv.injectable === 'function') inv.injectable = safeWrap(inv.injectable);
      if (typeof inv.unmanaged === 'function') inv.unmanaged = safeWrap(inv.unmanaged);
      if (typeof inv.multiInject === 'function') inv.multiInject = safeWrap(inv.multiInject);
      if (typeof inv.postConstruct === 'function') inv.postConstruct = safeWrap(inv.postConstruct);
      if (typeof inv.decorate === 'function') inv.decorate = safeWrap(inv.decorate);
    } catch (e) {
      // Non-fatal: leave inv as-is if wrapping fails
    }
  }
  // Build a hybrid inversify-like object: preserve the Container (if present)
  // but replace decorator helpers with safe no-op decorators that store
  // minimal metadata (ctor.__injections) so our SimpleContainer can resolve
  // by name. This prevents import-time decorator throws while keeping the
  // Container API available.
  let invHybrid = null;
  if (inv) {
    try {
      invHybrid = Object.assign({}, inv);
      // Wrap original inversify decorator helpers so they preserve Inversify
      // metadata (Reflect) while also recording a lightweight name-based
      // __injections array that our SimpleContainer mock can consume.
      const _origInject = typeof inv.inject === 'function' ? inv.inject : null;
      const _origInjectable = typeof inv.injectable === 'function' ? inv.injectable : null;
      const _origUnmanaged = typeof inv.unmanaged === 'function' ? inv.unmanaged : null;
      const _origMultiInject = typeof inv.multiInject === 'function' ? inv.multiInject : null;
      const _origPostConstruct = typeof inv.postConstruct === 'function' ? inv.postConstruct : null;
      invHybrid.inject = function inject(serviceIdentifier) {
        const name = serviceIdentifier && serviceIdentifier.name ? serviceIdentifier.name : String(serviceIdentifier);
        const original = _origInject ? _origInject(serviceIdentifier) : function () { return function () {}; };
        return function (target, propertyKey, descriptor) {
          // call the original inversify decorator to preserve metadata
          try {
            const res = original.apply(this, arguments);
            // Also record a lightweight, name-based injection description
            try {
              const ctor = target.constructor;
              ctor.__injections = ctor.__injections || [];
              ctor.__injections.push({ propertyKey, serviceIdentifierName: name, serviceIdentifier: name });
            }
            catch (e) {
              // ignore recording errors
            }
            return res;
          }
          catch (e) {
            // If the original decorator throws, swallow and still record metadata
            try {
              const ctor = target.constructor;
              ctor.__injections = ctor.__injections || [];
              ctor.__injections.push({ propertyKey, serviceIdentifierName: name, serviceIdentifier: name });
            }
            catch (err) { }
            return function () {};
          }
        };
      };
      invHybrid.injectable = function injectable() {
        const original = _origInjectable ? _origInjectable() : function () { return function () {}; };
        return function (target) {
          try { original.apply(this, arguments); }
          catch (e) { }
          try { target.__injectable = true; }
          catch (e) { }
        };
      };
      invHybrid.unmanaged = function unmanaged() { return _origUnmanaged ? _origUnmanaged() : function () {}; };
      invHybrid.multiInject = function multiInject() { return _origMultiInject ? _origMultiInject() : function () {}; };
      invHybrid.postConstruct = function postConstruct() { return _origPostConstruct ? _origPostConstruct() : function () {}; };
    } catch (e) {
      invHybrid = inv; // fallback
    }
  }
} catch (e) {
  // inversify not installed or patch failed — that's fine for some test runs
}

// Some DOM globals may be used by Theia/lumino libraries; ensure minimal shims exist
try {
  if (typeof global.DragEvent === 'undefined') {
    // Provide a minimal DragEvent implementation for Node environments (jsdom usually provides it)
    class _DragEvent extends Event {}
    global.DragEvent = _DragEvent;
  }
} catch (e) {
  // ignore
}
