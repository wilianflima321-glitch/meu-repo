// Minimal mock for @theia/filesystem used in ai-ide tests
// This provides tiny stubs for tree and dialog APIs used by filesystem consumers.
// eslint-disable-next-line no-console
console.log('[theia-filesystem-mock] loaded');

class CompressedTreeModel {
  constructor() { this.root = undefined; this.selectedNodes = []; this.toDispose = []; }
  init() { /* noop */ }
  refresh(node) { /* noop */ }
  navigateTo(node) { this.root = node; }
  getNode(id) { return undefined; }
}

class FileTree {}

class FileTreeModel extends CompressedTreeModel {
  constructor() { super(); }
  init() { super.init(); }
}

class ConfirmDialog {
  constructor(opts) { this.opts = opts; }
  open() { return Promise.resolve(true); }
}

const Dialog = { YES: 0, NO: 1 };

class LabelProvider { getName(s) { return s && s.fileStat && s.fileStat.name ? s.fileStat.name : ''; } }

class FileService {
  async resolve(uri) {
    return { children: [] };
  }
  async copy() { return; }
  async move() { return; }
}

// Minimal base class exported because some Theia modules extend
// FilepathBreadcrumbsContribution at import-time. Exporting a simple
// constructor ensures `class extends` operations succeed during tests.
class FilepathBreadcrumbsContribution {
  constructor() {
    // provide tiny shape expected by consumers
    this.onDidChangeBreadcrumbsEmitter = { event: () => { /* noop */ } };
    this.type = Symbol('FilepathBreadcrumb');
    this.priority = 0;
  }
  get onDidChangeBreadcrumbs() { return this.onDidChangeBreadcrumbsEmitter.event; }
  // default implementations that real code may override
  filterBreadcrumbs() { return true; }
}

module.exports = {
  CompressedTreeModel,
  FileTree,
  FileTreeModel,
  ConfirmDialog,
  Dialog,
  LabelProvider,
  FileService
  , FilepathBreadcrumbsContribution
};
