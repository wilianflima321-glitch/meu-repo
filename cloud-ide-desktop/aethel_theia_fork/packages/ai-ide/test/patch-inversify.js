// Ensure older tests that call container.resolve(...) work with installed inversify
// Respect THEIA_TEST_SHIMS=0 to avoid modifying inversify in environments that
// prefer the unmodified library behavior.
if (process.env.THEIA_TEST_SHIMS === '0') {
  module.exports = {};
} else try {
  const inversify = require('inversify');
  const debugEnabled = process.env.DEBUG_THEIA_RESOLVER === '1';
  if (inversify && inversify.Container && inversify.Container.prototype) {
    const proto = inversify.Container.prototype;
    if (typeof proto.resolve !== 'function') {
      // Implement a resolve shim that binds the constructor temporarily to
      // the container and uses the container to instantiate it so inversify
      // can perform injection based on design-time metadata. This mirrors
      // older Container.resolve behavior used by some tests.
      // Diagnostic wrapper: if bindings are created with an undefined service id
      // it causes inversify planning errors later. Log details to help triage.
      const origBind = proto.bind;
      proto.bind = function (serviceIdentifier) {
        if (serviceIdentifier === undefined || serviceIdentifier === null) {
          try {
            if (debugEnabled) console.error('[patch-inversify] bind called with undefined serviceIdentifier');
            // print a lightweight stack trace to help find the origin
            const err = new Error();
            const stack = err.stack ? err.stack.split('\n').slice(2, 8).join('\n') : '<no-stack>';
            if (debugEnabled) console.error(stack);
          }
          catch (e) {
            // ignore
          }
        } else {
          try {
            // Print a short description of the identifier (useful when it's a Symbol or function)
            const desc = typeof serviceIdentifier === 'symbol' ? serviceIdentifier.toString() : (serviceIdentifier && serviceIdentifier.name) ? serviceIdentifier.name : String(serviceIdentifier);
            if (debugEnabled) console.debug('[patch-inversify] bind serviceIdentifier=', desc, ' typeof=', typeof serviceIdentifier);
          }
          catch (e) { }
        }
        return origBind.apply(this, arguments);
      };

      // Also wrap get to catch undefined identifiers being requested
      const origGet = proto.get;
      proto.get = function (serviceIdentifier) {
        if ((serviceIdentifier === undefined || serviceIdentifier === null) && debugEnabled) {
          try {
            console.error('[patch-inversify] get called with undefined serviceIdentifier');
            const err = new Error();
            const stack = err.stack ? err.stack.split('\n').slice(2, 8).join('\n') : '<no-stack>';
            console.error(stack);
          }
          catch (e) { }
        }
        return origGet.apply(this, arguments);
      };

      proto.resolve = function (constructorFn) {
        try {
          if (this.isBound(constructorFn)) {
            return this.get(constructorFn);
          }
          // Bind to self transiently so dependencies are injected, then unbind
          this.bind(constructorFn).toSelf().inTransientScope();
          return this.get(constructorFn);
        }
        finally {
          try {
            if (this.isBound(constructorFn)) {
              this.unbind(constructorFn);
            }
          }
          catch (e) {
            // ignore unbind errors
          }
        }
      };
    }
  }
  // Sanity-check some commonly used Theia symbols that can be missing when
  // resolution maps to an unexpected file. Log their exports to help debug.
  try {
    const tryRequire = (id) => {
      try {
        const mod = require(id);
        try {
          if (debugEnabled) console.debug('[patch-inversify] require(', id, ') keys=', Object.keys(mod || {}));
        } catch (e) { if (debugEnabled) console.debug('[patch-inversify] require(', id, ') =>', typeof mod); }
        return mod;
      } catch (e) {
        if (debugEnabled) console.error('[patch-inversify] require failed for', id, e && e.message);
      }
    };
    if (debugEnabled) {
      tryRequire('@theia/monaco/lib/browser/monaco-workspace');
      tryRequire('@theia/monaco/lib/browser/monaco-text-model-service');
      tryRequire('@theia/markers/lib/browser');
      tryRequire('@theia/monaco-editor-core/esm/vs/platform/instantiation/common/instantiation');
    }
  } catch (e) {
    // ignore
  }
} catch (e) {
  // ignore; tests will surface DI issues if the shim is inappropriate
}
