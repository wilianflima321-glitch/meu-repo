// Lightweight inversify shim used only for unit tests to avoid running real
// decorator logic during import-time. This provides decorator factories that
// are no-ops but preserve a ctor.__injections array for simple DI resolution.
class ContainerModule {
  constructor(fn) { this._fn = fn; }
  register(container) { if (typeof this._fn === 'function') this._fn(container.bind.bind(container)); }
}

class ContainerStub {
  constructor() { this._bindings = new Map(); }
  bind(id) {
    const self = this;
    // Support chaining and scope for .to()/toSelf()/toConstantValue()/inSingletonScope()
    let lastEntry = null;
    const binder = {
      to(target) {
        lastEntry = { type: 'constructor', ctor: target, scope: 'transient', instance: undefined };
        try { self._bindings.set(id, lastEntry); } catch (e) {}
        return binder;
      },
      toSelf() {
        lastEntry = { type: 'self', value: id, scope: 'transient' };
        try { self._bindings.set(id, lastEntry); } catch (e) {}
        return binder;
      },
      toConstantValue(v) {
        lastEntry = { type: 'constant', value: v };
        try { self._bindings.set(id, lastEntry); } catch (e) {}
        return binder;
      },
      toDynamicValue(fn) {
        lastEntry = { type: 'dynamic', fn };
        try { self._bindings.set(id, lastEntry); } catch (e) {}
        return binder;
      },
      inSingletonScope() {
        if (lastEntry) lastEntry.scope = 'singleton';
        return binder;
      }
    };
    return binder;
  }
  load(module) {
    try {
      if (module instanceof ContainerModule) {
        module.register(this);
        return;
      }
      if (module && typeof module === 'object' && typeof module._fn === 'function') {
        module._fn(this.bind.bind(this));
        return;
      }
      if (typeof module === 'function') {
        // some code calls container.load(() => {}) or similar
        module(this);
      }
    } catch (e) { /* ignore */ }
  }
  get(id) {
    const entry = this._bindings.get(id);
    if (!entry) {
      // if id is a constructor, try to instantiate directly with simple injection
      if (typeof id === 'function') return this._instantiate(id);
      throw new Error(`ContainerStub: no binding for ${String(id)}`);
    }
    // Handle constant bindings
    if (entry && entry.type === 'constant') return entry.value;
    // Handle constructor/self bindings stored as entries
    if (entry && entry.type === 'constructor') {
      if (entry.scope === 'singleton') {
        if (!entry.instance) entry.instance = this._instantiate(entry.ctor);
        return entry.instance;
      }
      return this._instantiate(entry.ctor);
    }
    if (entry && entry.type === 'self') {
      // instantiate the key itself
      if (entry.scope === 'singleton') {
        if (!entry.instance) entry.instance = this._instantiate(id);
        return entry.instance;
      }
      return this._instantiate(id);
    }
    if (entry && entry.type === 'dynamic' && typeof entry.fn === 'function') return entry.fn();
    // Legacy: if a raw function was stored directly, instantiate it
    if (typeof entry === 'function') return new entry();
    return entry;
  }
  resolve(ctor) {
    return this._instantiate(ctor);
  }
  _instantiate(ctor) {
    try {
      // Debugging: log which constructor is being instantiated
      // eslint-disable-next-line no-console
      console.error('[inversify-shim] _instantiate ctor=', ctor && ctor.name);
      try {
        const cr = require('@theia/core/lib/common/content-replacer');
        // eslint-disable-next-line no-console
        console.error('[inversify-shim] content-replacer exports=', Object.keys(cr || {}), 'typeof ContentReplacer=', typeof (cr && cr.ContentReplacer));
      }
      catch (e) { /* ignore if not resolvable here */ }
    }
    catch (e) { }
    const inst = new ctor();
    const injections = ctor.__injections || [];
    for (const inj of injections) {
      try {
        const name = inj.serviceIdentifier || inj.serviceIdentifierName;
        let resolved;
        // try get by name and by constructor
        for (const [k, v] of this._bindings.entries()) {
          const kn = typeof k === 'string' ? k : (k && k.name ? k.name : String(k));
          if (kn === name) {
            resolved = this.get(k);
            break;
          }
        }
        if (resolved === undefined && typeof inj.serviceIdentifier === 'function') resolved = this.get(inj.serviceIdentifier);
        inst[inj.propertyKey] = resolved;
      }
      catch (e) { inst[inj.propertyKey] = undefined; }
    }
    return inst;
  }
}

function _makeDecoratorRecord(name) {
  return function (serviceIdentifier) {
    const sidName = serviceIdentifier && serviceIdentifier.name ? serviceIdentifier.name : String(serviceIdentifier);
    return function (target, propertyKey) {
      try {
        const ctor = target.constructor;
        ctor.__injections = ctor.__injections || [];
        ctor.__injections.push({ propertyKey, serviceIdentifierName: sidName, serviceIdentifier: sidName });
      }
      catch (e) { /* ignore */ }
    };
  };
}

module.exports = {
  inject: _makeDecoratorRecord('inject'),
  injectable: function () { return function (target) { try { target.__injectable = true; } catch (e) {} }; },
  unmanaged: function () { return function () {}; },
  multiInject: _makeDecoratorRecord('multiInject'),
  optional: function () { return function () {}; },
  named: function () { return function () {}; },
  tagged: function () { return function () {}; },
  postConstruct: function () { return function () {}; },
  Container: ContainerStub,
  ContainerModule,
  decorate: function () {},
  metadata: function () {}
};
