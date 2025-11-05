// Minimal mock for @theia/monaco-editor-core used during Node unit tests
// Provide minimal shapes used by Theia integrations. Avoid executing heavy DOM code.
// Lightweight StandaloneCodeEditor/StandaloneEditor stubs used by Theia wrappers
class StandaloneCodeEditor {
  constructor() {
    this._options = {};
  }
  updateOptions(opts) { this._options = Object.assign({}, this._options, opts); }
  getRawOptions() { return this._options; }
  getOverflowWidgetsDomNode() { return {}; }
  onDidChangeConfiguration(cb) { return { dispose: () => {} }; }
  getDomNode() { return { querySelector: () => ({ focus: () => {}, blur: () => {} }), offsetWidth: 800, offsetHeight: 600, getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }) }; }
  getVisibleRanges() { return []; }
  getPosition() { return { lineNumber: 1, column: 1 }; }
  getSelection() { return null; }
  getAction() { return { isSupported: () => false, run: () => Promise.resolve() }; }
  saveViewState() { return null; }
  restoreViewState() {}
  setModel() {}
  layout() {}
  focus() {}
  // Common APIs used by Theia integrations
  getLayoutInfo() { return { width: this.getDomNode().offsetWidth, height: this.getDomNode().offsetHeight, glyphMarginWidth: 0, lineNumbersWidth: 40, contentWidth: this.getDomNode().offsetWidth, contentHeight: this.getDomNode().offsetHeight }; }
  getModel() { return { getLineCount: () => 1, getValue: () => '', onDidChangeContent: () => ({ dispose: () => {} }) }; }
  getOption(name) { return this._options && typeof this._options[name] !== 'undefined' ? this._options[name] : null; }
  hasTextFocus() { return false; }
  deltaDecorations(oldDecorations, newDecorations) { return []; }
  onDidChangeModelContent(cb) { return { dispose: () => {} }; }
}

class StandaloneEditor extends StandaloneCodeEditor {}

const StandaloneServices = {
  get: function (service) {
    // Return a simple instantiation service capable of creating instances
    return {
      createInstance(ctor, ...args) { return new ctor(...args); },
      createChild() { return this; }
    };
  }
};

class ServiceCollection extends Array {
  constructor(...items) { super(...items); }
}

const objects = {
  mixin(target, source, overwrite) {
    if (!target || !source) return target || source;
    for (const k of Object.keys(source)) {
      if (overwrite || typeof target[k] === 'undefined') target[k] = source[k];
    }
    return target;
  }
};

// monaco namespace placeholders
const monaco = {
  editor: {
    create: function () { return { dispose: () => { } }; },
    ICodeEditor: function () { }
  },
  SelectionDirection: { LTR: 1, RTL: 2 }
};

module.exports = {
  StandaloneCodeEditor,
  StandaloneEditor,
  StandaloneServices,
  ServiceCollection,
  objects,
  monaco,
  // keep some familiar symbols
  Range: function () { },
  Position: function () { },
  Selection: function () { }
};
