// Minimal mock for @theia/core to satisfy tests in Jest environment

const React = require('react');
// reuse the vscode-uri mock for URI helpers
let VS_URI;
try {
  VS_URI = require('./vscode-uri.js');
} catch (e) {
  try { VS_URI = require('./vscode-uri'); } catch (e2) { VS_URI = undefined; }
}
// Diagnostic
// eslint-disable-next-line no-console
console.log('[theia-core-mock] loaded');

// Basic Disposable implementation and helper
class Disposable {
  constructor(fn) { this._fn = fn; }
  dispose() { if (this._fn) { try { this._fn(); } catch (e) { /* ignore */ } this._fn = null; } }
  static create(fn) { return new Disposable(fn); }
}

class DisposableCollection {
  constructor() { this._items = []; }
  push(d) { this._items.push(d); return d; }
  dispose() { for (const i of this._items) { try { i && i.dispose && i.dispose(); } catch (e) { /* ignore */ } } this._items = []; }
  get onDispose() { return { connect: () => {}, disconnect: () => {} }; }
}

class CancellationTokenImpl {
  constructor() {
    this.isCancellationRequested = false;
    this._callbacks = [];
  }
  onCancellationRequested(cb) {
    this._callbacks.push(cb);
    return new Disposable(() => { this._callbacks = this._callbacks.filter(f => f !== cb); });
  }
  _fire() { this.isCancellationRequested = true; this._callbacks.forEach(cb => cb()); }
}

class CancellationTokenSource {
  constructor() { this.token = new CancellationTokenImpl(); }
  cancel() { this.token._fire(); }
  dispose() { /* noop */ }
}

function enableJSDOM() {
  // For tests that call enableJSDOM(), return a disable function
  return function disable() { /* noop */ };
}

// Simple browser primitives used by many Theia classes
class Widget {
  constructor() { this.parent = undefined; this.title = {}; }
}

class BaseWidget extends Widget {
  constructor(arg) { super(); this.toDispose = []; this.title = {}; this.parent = undefined; this.node = {}; }
  addClass() { /* noop */ }
  handleVisiblityChanged() { /* noop */ }
  onActivateRequest() { /* noop */ }
  onAfterAttach() { /* noop */ }
  onAfterShow() { /* noop */ }
  onResize() { /* noop */ }
}

class Message {}
class Saveable {}
class SaveableSource {}
class Navigatable {}
class StatefulWidget {}
class ExtractableWidget {}

class TabBar {
  constructor() { this.titles = []; }
}

class DockPanel extends Widget {
  constructor() { super(); this._tabBars = []; }
  tabBars() { return this._tabBars; }
}

function lock(title) { if (title) title.__locked = true; }
function unlock(title) { if (title) title.__locked = false; }

class SelectionService { constructor() { this.selection = undefined; } }

function find(iterable, predicate) {
  if (!iterable) return undefined;
  for (const item of iterable) {
    if (predicate(item)) return item;
  }
  return undefined;
}

// Export a compact initial surface with core primitives
module.exports = {
  CancellationTokenSource,
  CancellationToken: CancellationTokenImpl,
  ReactWidget: function ReactWidget() { return function Mock() { return React.createElement('div'); }; },
  PreferenceService: class {
    constructor() {
      this.ready = Promise.resolve();
      this._listeners = [];
    }
    get(pref, fallback) { return fallback; }
    updateValue(pref, value) { return Promise.resolve(); }
    onPreferenceChanged(cb) { try { this._listeners.push(cb); } catch (e) {} }
  },

  // Minimal preference helpers used by editor and other modules
  createPreferenceProxy: function createPreferenceProxy(preferences, schema) {
    // Very small proxy: delegate get to underlying PreferenceService if present,
    // otherwise return defaults from schema when available. Tests generally only
    // need a get(key) shape or the object itself.
    if (!preferences) {
      return { get: (k, f) => f };
    }
    return preferences;
  },
  PreferenceScope: {
    fromString: function (s) { return s; }
  },
  // PreferenceProxyFactory: exported as a function-constructor so our SimpleContainer
  // can `new` it and receive a callable factory. The returned factory(schema) -> (prefs)->proxy
  PreferenceProxyFactory: function PreferenceProxyFactory() {
    return function (schema) {
      return function (preferences) {
        return module.exports.createPreferenceProxy(preferences, schema);
      };
    };
  },
  Container: class {},
  FrontendApplicationConfigProvider: { set: () => {} },
  // environment.electron.is() is consulted by editor preferences and others
  environment: {
    electron: {
      is: () => false
    }
  },
  enableJSDOM,
  Disposable,
  DisposableCollection,
  Widget,
  BaseWidget,
  Message,
  Saveable,
  SaveableSource,
  Navigatable,
  StatefulWidget,
  ExtractableWidget,
  TabBar,
  DockPanel,
  lock,
  unlock,
  SelectionService,
  find
};

// Minimal FrontendApplication stub used in some modules
module.exports.FrontendApplication = class FrontendApplication {
  constructor() {
    this.started = false;
  }
  get startedPromise() { return Promise.resolve(this.started); }
};

// Minimal UriAwareCommandHandler implementation used by workspace commands
class UriAwareCommandHandler {
  constructor(selectionService, handler) {
    this.selectionService = selectionService;
    this.handler = handler || {};
  }
  isEnabled(...args) { return this.handler.isEnabled ? this.handler.isEnabled(...args) : true; }
  isVisible(...args) { return this.handler.isVisible ? this.handler.isVisible(...args) : true; }
  getUri(...args) { return this.handler.getUri ? this.handler.getUri(...args) : undefined; }
  static MonoSelect(selectionService, handler) {
    return new UriAwareCommandHandler(selectionService, handler);
  }
  static MultiSelect(selectionService, handler) {
    return new UriAwareCommandHandler(selectionService, handler);
  }
}

module.exports.UriAwareCommandHandler = UriAwareCommandHandler;

// Navigatable helper: provide a static `is` helper used by some widgets
Navigatable.is = function (w) {
  return !!(w && typeof w.getResourceUri === 'function');
};

// Small helpers for tree widgets
const TREE_NODE_INFO_CLASS = 'theia-tree-node-info';
function codicon(name) { return `codicon ${String(name)}`; }

const ExpandableTreeNode = {
  is(node) { return !!node && Array.isArray(node.children); }
};
const SelectableTreeNode = {
  is(node) { return !!node && ('selected' in node || typeof node.id !== 'undefined'); }
};

// Minimal TreeWidget and related placeholders so marker widgets can extend/run in Node tests
class TreeWidget extends BaseWidget {
  constructor(treeProps, model, contextMenuRenderer) {
    super();
    this.model = model;
    this.title = this.title || {};
    this.toDispose = this.toDispose || [];
    this.node = this.node || {};
  }
  init() { /* no-op */ }
  storeState() { return {}; }
  restoreState(state) { /* no-op */ }
  tapNode(node) { /* no-op */ }
  handleDown(event) { /* no-op */ }
  handleUp(event) { /* no-op */ }
  renderTree(model) { return null; }
  addClipboardListener(node, type, cb) { /* no-op */ }
  toNodeIcon(node) { return ''; }
  toNodeName(node) { return ''; }
  toNodeDescription(node) { return ''; }
}

class ContextMenuRenderer {
  render() { return null; }
}

// Minimal ApplicationShell used by widgets
class ApplicationShell {
  constructor() { this.currentWidget = undefined; }
  onDidChangeCurrentWidget(cb) { return new Disposable(() => { /* no-op */ }); }
}

module.exports.codicon = codicon;
module.exports.TREE_NODE_INFO_CLASS = TREE_NODE_INFO_CLASS;
module.exports.ExpandableTreeNode = ExpandableTreeNode;
module.exports.SelectableTreeNode = SelectableTreeNode;
module.exports.TreeWidget = TreeWidget;
module.exports.TreeProps = function () { /* marker */ };
module.exports.ContextMenuRenderer = ContextMenuRenderer;
module.exports.ApplicationShell = ApplicationShell;

// Minimal ApplicationError helper used in several common modules
const ApplicationError = {
  declare(code, mapFn) {
    // return a factory function that when called with a code returns mapped object
    return function (arg) {
      try { return mapFn(arg); } catch (e) { return { message: String(arg), data: { code } }; }
    };
  }
};
module.exports.ApplicationError = ApplicationError;

// Minimal SelectionCommandHandler to match the real Theia API surface.
// Some modules import '@theia/core/lib/common/selection-command-handler' and
// expect a class named SelectionCommandHandler to be present. Provide a
// lightweight implementation so test-time subclassing and usage doesn't fail.
class SelectionCommandHandler {
  constructor(selectionService, toSelection, options) {
    this.selectionService = selectionService;
    this.toSelection = toSelection;
    this.options = options;
  }
  execute(...args) {
    const selection = this.getSelection(...args);
    return selection ? this.options.execute(selection, ...args) : undefined;
  }
  isVisible(...args) {
    const selection = this.getSelection(...args);
    return !!selection && (!this.options.isVisible || this.options.isVisible(selection, ...args));
  }
  isEnabled(...args) {
    const selection = this.getSelection(...args);
    return !!selection && (!this.options.isEnabled || this.options.isEnabled(selection, ...args));
  }
  isMulti() {
    return this.options && !!this.options.multi;
  }
  getSelection(...args) {
    const givenSelection = args.length && this.toSelection(args[0]);
    if (givenSelection) {
      return this.isMulti() ? [givenSelection] : givenSelection;
    }
    const globalSelection = this.getSingleSelection(this.selectionService && this.selectionService.selection);
    if (this.isMulti()) {
      return this.getMultiSelection(globalSelection);
    }
    return this.getSingleSelection(globalSelection);
  }
  getSingleSelection(arg) {
    let selection = this.toSelection(arg);
    if (selection) {
      return selection;
    }
    if (Array.isArray(arg)) {
      for (const element of arg) {
        selection = this.toSelection(element);
        if (selection) {
          return selection;
        }
      }
    }
    return undefined;
  }
  getMultiSelection(arg) {
    let selection = this.toSelection(arg);
    if (selection) {
      return [selection];
    }
    const result = [];
    if (Array.isArray(arg)) {
      for (const element of arg) {
        selection = this.toSelection(element);
        if (selection) {
          result.push(selection);
        }
      }
    }
    return result.length ? result : undefined;
  }
}

module.exports.SelectionCommandHandler = SelectionCommandHandler;

// Expose URI helpers (some modules import from '@theia/core' and access .uri.fromString)
if (VS_URI) {
  const UriImpl = VS_URI.URI || VS_URI;
  module.exports.URI = UriImpl;
  // wrap URI instances to provide a `.path.fsPath()` used in some Theia code
  function wrapUri(u) {
    if (!u) return u;
    // if path already has fsPath, return as-is
    if (u.path && typeof u.path.fsPath === 'function') return u;
    const out = Object.assign({}, u);
    // ensure path.fsPath exists
    try {
      const pathStr = typeof u.path === 'string' ? u.path : (u && u.toString ? String(u.toString()) : String(u));
      out.path = {
        fsPath: () => pathStr,
        // provide lightweight helpers used by Theia code
        join: (...parts) => parts.filter(p => typeof p !== 'undefined' && p !== null).join('/'),
        basename: (p) => String(p || '').split('/').pop(),
        ext: (p) => { const b = String(p || '').split('/').pop(); const idx = b.lastIndexOf('.'); return idx >= 0 ? b.substring(idx) : ''; }
      };
    } catch (e) {
      out.path = { fsPath: () => '', join: () => '', basename: () => '', ext: () => '' };
    }
    return out;
  }
  module.exports.uri = {
    fromString: (s) => wrapUri(UriImpl.fromString ? UriImpl.fromString(s) : new UriImpl(s)),
    parse: (s) => wrapUri(UriImpl.parse ? UriImpl.parse(s) : new UriImpl(s)),
    file: (s) => wrapUri(UriImpl.file ? UriImpl.file(s) : new UriImpl(s))
  };
}

// Command utilities used by editor
const Command = {
  toDefaultLocalizedCommand(obj) { return obj; },
  toLocalizedCommand(obj, key, categoryKey) { return { ...obj, __localized: key, __categoryKey: categoryKey }; },
  toDefaultCommand(obj) { return obj; }
};

class CommandRegistry {
  constructor() { this._commands = new Map(); }
  registerCommand(cmd, impl) { this._commands.set(cmd.id || cmd, impl || true); }
}

class ResourceProvider {
  // called as a function
  async provide() { return { guessEncoding: async () => undefined, dispose: () => {} }; }
}

class MessageService {
  info(msg) { /* noop */ }
  warn(msg) { /* noop */ }
  error(msg) { /* noop */ }
}

module.exports.Command = Command;
module.exports.CommandRegistry = CommandRegistry;
module.exports.ResourceProvider = ResourceProvider;
module.exports.MessageService = MessageService;

// Lightweight Event/Emitter used across Theia
class Emitter {
  constructor() { this._listeners = []; }
  fire(arg) { for (const l of this._listeners) { try { l(arg); } catch (e) { /* ignore */ } } }
  get event() { return (listener) => { this._listeners.push(listener); return { dispose: () => { this._listeners = this._listeners.filter(l => l !== listener); } }; }; }
}

// ContributionProvider stub
class ContributionProvider {
  constructor() { this._items = []; }
  getContributions() { return this._items; }
  set(items) { this._items = items; }
}

const Prioritizeable = {
  prioritizeAllSync(items, scoreFn) {
    const arr = (items || []).map(i => ({ value: i, priority: scoreFn ? scoreFn(i) : 0 }));
    arr.sort((a,b) => (b.priority || 0) - (a.priority || 0));
    return arr;
  }
};

class CommandService {
  executeCommand(id, ...args) { return Promise.resolve(); }
}

const DiffUris = {
  isDiffUri(uri) { return false; },
  decode(uri) { return []; }
};

function getDefaultHandler(uri, preferenceService) { return 'default'; }
const defaultHandlerPriority = 0;

// Minimal NavigatableWidgetOpenHandler implementation so editor.Manager can extend it
class NavigatableWidgetOpenHandler extends BaseWidget {
  constructor() { super(); this.shell = {
    onDidChangeActiveWidget: (cb) => { /* no-op */ },
    onDidChangeCurrentWidget: (cb) => { /* no-op */ },
    onDidDoubleClickMainArea: (cb) => { /* no-op */ },
    getInsertionOptions: (opts) => ({ addOptions: { mode: '' } }),
    getTabBarFor: (ref) => undefined,
    activeWidget: undefined,
    currentWidget: undefined,
    getTabBarFor: () => undefined
  }; this.all = []; }
  init() { /* noop */ }
  getWidget() { return Promise.resolve(undefined); }
  getOrCreateWidget() { return Promise.resolve(new BaseWidget()); }
  getOrCreateByUri() { return Promise.resolve(new BaseWidget()); }
  onCreated() { /* noop */ }
}

// Minimal Tree implementation used by some filesystem components
class TreeImpl {
  constructor() {
    // simple node store
    this._nodes = new Map();
  }
  async resolveChildren(parent) {
    return [];
  }
  getNode(id) {
    return this._nodes.get(id);
  }
  toNodes() {
    return [];
  }
}

// Minimal UserWorkingDirectoryProvider base so modules that extend it at
// import-time receive a valid constructor instead of `undefined`.
class UserWorkingDirectoryProvider {
  constructor() {
    // basic shape only
  }
  async getUserWorkingDir() { return undefined; }
}

// Attach the new stubs to module.exports so other modules can import them
module.exports.Emitter = Emitter;
module.exports.Event = function() { /* type-only stub */ };
module.exports.CommandService = CommandService;
module.exports.ContributionProvider = ContributionProvider;
module.exports.Prioritizeable = Prioritizeable;
module.exports.NavigatableWidgetOpenHandler = NavigatableWidgetOpenHandler;
module.exports.WidgetOpenerOptions = function() {};
module.exports.NavigatableWidgetOptions = function() {};
module.exports.CommonCommands = { NEW_UNTITLED_TEXT_FILE: { id: 'new.untitled' } };
module.exports.getDefaultHandler = getDefaultHandler;
module.exports.defaultHandlerPriority = defaultHandlerPriority;
module.exports.DiffUris = DiffUris;

// Menu related stubs
const MAIN_MENU_BAR = ['main'];
const CommonMenus = {
  VIEW_TOGGLE: ['view_toggle'],
  FILE_CLOSE: ['file_close'],
  VIEW_EDITOR_SUBMENU_SPLIT: ['view_editor_submenu_split'],
  VIEW_EDITOR_SUBMENU_ORTHO: ['view_editor_submenu_ortho'],
  VIEW_EDITOR_SUBMENU: ['view_editor_submenu']
};
// Ensure common file-related menu constants expected by workspace/menus
CommonMenus.FILE = ['file'];
CommonMenus.FILE_OPEN = ['file_open'];
CommonMenus.FILE_SAVE = ['file_save'];
CommonMenus.FILE_CLOSE = CommonMenus.FILE_CLOSE || ['file_close'];
CommonMenus.FILE_OPEN_RECENT = ['file_open_recent'];
const CommonCommands = {
  UNDO: { id: 'undo' },
  REDO: { id: 'redo' },
  CUT: { id: 'cut' },
  COPY: { id: 'copy' },
  PASTE: { id: 'paste' },
  AUTO_SAVE: { id: 'auto.save' },
  NEXT_TAB_GROUP: { id: 'next.tab.group' },
  PREVIOUS_TAB_GROUP: { id: 'prev.tab.group' },
  FILE_CATEGORY: 'file',
  VIEW_CATEGORY: 'view'
};

class MenuModelRegistry {
  constructor() { this._actions = []; }
  registerMenuAction(path, action) { this._actions.push({ path, action }); }
  registerSubmenu(path, label) { this._actions.push({ path, label }); }
}

module.exports.MAIN_MENU_BAR = MAIN_MENU_BAR;
module.exports.CommonMenus = CommonMenus;
module.exports.CommonCommands = CommonCommands;
module.exports.MenuModelRegistry = MenuModelRegistry;
// Shell/tabbar context used by some contributions
module.exports.SHELL_TABBAR_CONTEXT_COPY = ['shell_tabbar_context_copy'];

// Small UI helpers used by many packages
function codiconArray(name, modifier) {
  if (!name) return ['codicon'];
  const base = ['codicon', `codicon-${String(name)}`];
  if (modifier) base.push('codicon-mod');
  return base;
}

function createIconButton(...classes) {
  if (typeof document !== 'undefined' && document.createElement) {
    const el = document.createElement('button');
    el.classList.add(...classes);
    return el;
  }
  return { classList: { add: () => {} }, style: {}, appendChild: () => {} };
}

const DISABLED_CLASS = 'disabled';
const Key = { Enter: 'Enter', Escape: 'Escape' };

class LabelProvider {
  getLongName(uri) {
    if (!uri) return '';
    if (uri.path && typeof uri.path.fsPath === 'function') return uri.path.fsPath();
    if (typeof uri.path === 'string') return uri.path;
    if (uri && typeof uri.toString === 'function') return String(uri.toString());
    return '';
  }
}

// Minimal Path class to satisfy modules that construct Path at runtime.
// The real Theia Path provides richer helpers; tests here only need a
// simple constructor and a `base` property and `toString()` behavior.
class Path {
  constructor(p) {
    // accept either a string or an object with toString
    try {
      this._path = (p && typeof p === 'object' && typeof p.toString === 'function') ? String(p.toString()) : String(p || '');
    } catch (e) {
      this._path = '';
    }
    const parts = this._path.split('/');
    this.base = parts.length ? parts[parts.length - 1] : this._path;
  }
  toString() { return this._path; }
}

module.exports.Path = Path;
// Also provide a lightweight `path` utility object (Node's path) since some
// Theia modules access `path.join`/`path.basename` via the core common/path
// surface. This prevents "path.join is not a function" errors in tests.
try {
  module.exports.path = require('path');
} catch (e) {
  module.exports.path = { join: (...parts) => parts.join('/'), basename: (p) => String(p).split('/').pop() };
}


// Minimal DefaultUriLabelProviderContribution used by workspace label providers
class DefaultUriLabelProviderContribution extends LabelProvider {
  constructor() { super(); }
  getUri(element) {
    // If element looks like a FileStat-like object with .resource, return it.
    if (element && element.resource) return element.resource;
    if (element && typeof element === 'object' && element.path) return element;
    return undefined;
  }
  getName(element) {
    const uri = this.getUri(element);
    if (!uri) return (typeof element === 'string') ? String(element) : '';
    return super.getLongName(uri).split('/').pop() || super.getLongName(uri);
  }
  getLongName(element) {
    const uri = this.getUri(element);
    if (!uri) return super.getLongName(element);
    return super.getLongName(uri);
  }
  getIcon(element) {
    return 'file';
  }
}

// Lightweight URIIconReference helper used by some Theia label code
const URIIconReference = {
  create: function(kind, uri) {
    return { __uriIconRef: true, kind, uri };
  },
  is: function(obj) { return obj && obj.__uriIconRef; }
};

class SingleTextInputDialogProps {}

class SingleTextInputDialog {
  constructor(props) {
    this.props = props || {};
    // try to use DOM when available
    if (typeof document !== 'undefined' && document.createElement) {
      this.contentNode = document.createElement('div');
      this.inputField = document.createElement('input');
    } else {
      this.contentNode = { insertBefore: () => {}, appendChild: () => {} };
      this.inputField = {};
    }
  }
}

module.exports.codiconArray = codiconArray;
module.exports.createIconButton = createIconButton;
module.exports.DISABLED_CLASS = DISABLED_CLASS;
module.exports.Key = Key;
module.exports.LabelProvider = LabelProvider;
module.exports.DefaultUriLabelProviderContribution = DefaultUriLabelProviderContribution;
module.exports.URIIconReference = URIIconReference;
module.exports.SingleTextInputDialog = SingleTextInputDialog;
module.exports.SingleTextInputDialogProps = SingleTextInputDialogProps;
// Minimal WindowTitleUpdater base so workspace subclasses can extend it at import-time
class WindowTitleUpdater {
  constructor() {
    // placeholder
  }
  onStart(app) { /* noop */ }
  updateTitleWidget(widget) { /* noop */ }
}
module.exports.WindowTitleUpdater = WindowTitleUpdater;

// Minimal dialog/AbstractDialog base used by workspace/dialog implementations
class AbstractDialog extends BaseWidget {
  constructor(props) {
    super();
    this.props = props || {};
    // content and control containers
    if (typeof document !== 'undefined' && document.createElement) {
      this.contentNode = document.createElement('div');
      this.controlPanel = document.createElement('div');
    } else {
      this.contentNode = { appendChild: () => {} };
      this.controlPanel = { appendChild: () => {} };
    }
    this._value = undefined;
  }
  appendCloseButton(label) { this.closeButton = { label }; }
  appendAcceptButton(label) { this.acceptButton = { label }; }
  addAction(element, handler) { /* noop */ }
  accept() { /* noop */ }
  onAfterAttach(msg) { /* noop */ }
}

// Dialog helpers and props placeholder
const Dialog = { CANCEL: 'Cancel', ACCEPT: 'Accept' };
function DialogProps() { /* marker */ }

module.exports.AbstractDialog = AbstractDialog;
module.exports.Dialog = Dialog;
module.exports.DialogProps = DialogProps;


// Provide lightweight inversify decorators used in the codebase
module.exports.inject = function inject(serviceIdentifier) {
  const name = serviceIdentifier && serviceIdentifier.name ? serviceIdentifier.name : String(serviceIdentifier);
  return function (target, propertyKey) {
    const ctor = target.constructor;
    ctor.__injections = ctor.__injections || [];
    // Store the service identifier as a name string to avoid cross-module identity issues
    ctor.__injections.push({ propertyKey, serviceIdentifierName: name, serviceIdentifier: name });
  };
};

module.exports.injectable = function injectable() {
  return function (target) {
    // mark as injectable (no-op)
    target.__injectable = true;
  };
};

// Simple DI container implementation sufficient for tests
class SimpleContainer {
  constructor() {
    this._registry = new Map();
    // map from key name -> original key used at bind time to handle
    // different module instances that share the same constructor name
    this._nameMap = new Map();
    // diagnostic
    try { console.log('[SimpleContainer] created'); } catch (e) { }
  }
  bind(key) {
    const self = this;
    const keyName = (typeof key === 'string') ? key : (key && key.name ? key.name : String(key));
    // remember name -> key mapping for cross-module lookups
    try { this._nameMap.set(keyName, key); } catch (e) { /* ignore */ }
    // Keep a reference to the most-recent entry configured via the binder so
    // callers can chain `.inSingletonScope()` after `to()`/`toSelf()`/`toConstantValue()`.
    let lastEntry = null;
    const binder = {
      toConstantValue(value) {
        lastEntry = { type: 'constant', value };
        self._registry.set(key, lastEntry);
        try {
          // eslint-disable-next-line no-console
          console.log('[SimpleContainer] bind constant', keyName, '->', { type: typeof value, keys: value && typeof value === 'object' ? Object.keys(value) : undefined });
        } catch (e) { /* ignore */ }
        return binder;
      },
      toSelf() {
        lastEntry = { type: 'self', value: key, scope: 'transient' };
        self._registry.set(key, lastEntry);
        return binder;
      },
      to(ctor) {
        lastEntry = { type: 'constructor', ctor, scope: 'transient', instance: undefined };
        self._registry.set(key, lastEntry);
        return binder;
      },
      inSingletonScope() {
        if (lastEntry) lastEntry.scope = 'singleton';
        return binder;
      }
    };
    return binder;
  }
  get(key) {
    const entry = this._registry.get(key);
    // Debugging: log lookups for common DI keys to help tests
    try {
      const probeName = (typeof key === 'string') ? key : (key && key.name ? key.name : String(key));
        if (probeName === 'DebugConfigurationManager' || probeName === 'DebugSessionManager') {
        // eslint-disable-next-line no-console
          console.log('[SimpleContainer] lookup for', probeName, 'registryHasKey:', this._registry.has(key));
          // dump registry entries for diagnostics
          try {
            for (const [rk, rv] of this._registry.entries()) {
              const rn = (typeof rk === 'string') ? rk : (rk && rk.name ? rk.name : String(rk));
              if (rv && rv.type === 'constant') {
                console.log('[SimpleContainer] registry constant', rn, '-> keys:', rv.value && typeof rv.value === 'object' ? Object.keys(rv.value) : typeof rv.value, 'hasLoad:', rv.value && typeof rv.value.load === 'function');
              } else if (rv && rv.type === 'constructor') {
                console.log('[SimpleContainer] registry ctor', rn, '-> ctor.name:', rv.ctor && rv.ctor.name);
              } else if (rv && rv.type === 'self') {
                console.log('[SimpleContainer] registry self', rn);
              } else {
                console.log('[SimpleContainer] registry raw', rn, rv && typeof rv);
              }
            }
          } catch (e) { /* ignore */ }
      }
    } catch (e) { /* ignore logging errors */ }
    if (!entry) {
      const keyName = (typeof key === 'string') ? key : (key && key.name ? key.name : String(key));
      // If a binding was registered under the same name (but different reference), use it
      if (this._nameMap.has(keyName)) {
        const originalKey = this._nameMap.get(keyName);
        const origEntry = this._registry.get(originalKey);
        if (origEntry) {
          // delegate to get with the original key (this will return constant/constructor accordingly)
          return this.get(originalKey);
        }
      }
    // Try to match by name (common when different module instances are used)
      for (const [rk, rv] of this._registry.entries()) {
        const rkName = (typeof rk === 'string') ? rk : (rk && rk.name ? rk.name : String(rk));
        if (rkName === keyName) {
          return this.get(rk);
        }
      }
      // Try to find a constant binding where the stored value has a matching constructor/name
      for (const [rk, rv] of this._registry.entries()) {
        if (rv && rv.type === 'constant' && rv.value) {
          const v = rv.value;
          const vn = (v && v.name) ? v.name : (v && v.constructor && v.constructor.name) ? v.constructor.name : null;
          if (vn === keyName) {
            return rv.value;
          }
        }
      }
      // Special-case heuristics: if asking for DebugConfigurationManager or DebugSessionManager
      // return any constant binding that looks like the expected mock (contains load/start)
      if (keyName === 'DebugConfigurationManager') {
        for (const [rk, rv] of this._registry.entries()) {
          if (rv && rv.type === 'constant' && rv.value && typeof rv.value.load === 'function') {
            return rv.value;
          }
        }
      }
      if (keyName === 'DebugSessionManager') {
        for (const [rk, rv] of this._registry.entries()) {
          if (rv && rv.type === 'constant' && rv.value && (typeof rv.value.start === 'function' || typeof rv.value.terminateSession === 'function')) {
            return rv.value;
          }
        }
      }
      if (typeof key === 'function') {
        return this._instantiate(key);
      }
      throw new Error(`No binding found for ${keyName}`);
    }
    if (entry.type === 'constant') return entry.value;
    if (entry.type === 'self') return this._instantiate(entry.value);
    if (entry.type === 'constructor') {
      if (entry.scope === 'singleton') {
        if (!entry.instance) {
          entry.instance = this._instantiate(entry.ctor);
        }
        return entry.instance;
      }
      return this._instantiate(entry.ctor);
    }
    return undefined;
  }
  _instantiate(ctor) {
    const instance = new ctor();
    const injections = ctor.__injections || [];
    for (const inj of injections) {
      try {
        let resolved;
        // If the injection was stored as a name string, try to locate a matching constant binding first
        if (typeof inj.serviceIdentifier === 'string') {
          const wanted = inj.serviceIdentifier;
          // direct name -> registry key mapping
          if (this._nameMap && this._nameMap.has(wanted)) {
            const originalKey = this._nameMap.get(wanted);
            const origEntry = this._registry.get(originalKey);
            if (origEntry && origEntry.type === 'constant') {
              resolved = origEntry.value;
            }
          }
          // fallback: find any constant whose value looks like the expected service (has load/start)
          if (!resolved) {
            for (const [rk, rv] of this._registry.entries()) {
              if (rv && rv.type === 'constant' && rv.value) {
                const v = rv.value;
                if ((wanted === 'DebugConfigurationManager' && typeof v.load === 'function') ||
                    (wanted === 'DebugSessionManager' && (typeof v.start === 'function' || typeof v.terminateSession === 'function'))) {
                  resolved = v;
                  break;
                }
              }
            }
          }
        }
        if (resolved === undefined) {
          resolved = this.get(inj.serviceIdentifier);
        }
        // Debug detailed info for problematic services
        try {
          const sidName = inj.serviceIdentifier && inj.serviceIdentifier.name ? inj.serviceIdentifier.name : String(inj.serviceIdentifier);
          if (sidName === 'DebugConfigurationManager' || sidName === 'DebugSessionManager') {
            // eslint-disable-next-line no-console
            console.log('[SimpleContainer] resolving injection', sidName, '->', {
              type: typeof resolved,
              keys: resolved ? Object.keys(resolved) : undefined,
              hasLoad: resolved && typeof resolved.load === 'function'
            });
          }
        } catch (e) { /* ignore logging issues */ }
        instance[inj.propertyKey] = resolved;
      } catch (e) {
        // leave undefined if not bound
        instance[inj.propertyKey] = undefined;
      }
    }
    return instance;
  }
  // Convenience resolve method used by some tests
  resolve(ctor) {
    // if ctor is bound, return get
    const ctorName = ctor && ctor.name ? ctor.name : String(ctor);
    for (const [key, entry] of this._registry.entries()) {
      const keyName = key && key.name ? key.name : String(key);
      if (entry.type === 'constructor' && entry.ctor && (entry.ctor === ctor || (entry.ctor.name === ctorName))) {
        return this.get(key);
      }
      if (entry.type === 'self' && (entry.value === ctor || (entry.value && entry.value.name === ctorName))) {
        return this._instantiate(ctor);
      }
    }
    // fallback: instantiate directly
    return this._instantiate(ctor);
  }
}

// no-op postConstruct decorator
module.exports.postConstruct = function postConstruct() {
  return function () { /* noop */ };
};

module.exports.Container = SimpleContainer;

// named decorator no-op
module.exports.named = function named() {
  return function () { /* noop named decorator */ };
};

// optional decorator no-op
module.exports.optional = function optional() {
  return function () { /* noop optional decorator */ };
};

// Minimal nls/localization stub used by workspace preferences
module.exports.nls = {
  localize: (key, fallback) => fallback || key,
  localizeByDefault: (key) => key
};

// nls helper used by editor and command utilities
module.exports.nls.getDefaultKey = function (s) { return s; };

// Export TreeImpl so modules that extend/instantiate it don't crash
module.exports.TreeImpl = TreeImpl;
// Some modules reference TreeModelImpl; alias to TreeImpl to satisfy extends
module.exports.TreeModelImpl = TreeImpl;
module.exports.UserWorkingDirectoryProvider = UserWorkingDirectoryProvider;

