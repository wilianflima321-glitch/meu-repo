module.exports = {
  codicon: (id) => String(id ?? ''),
  ConfirmDialog: class ConfirmDialog {
    constructor(_options) { this.options = _options; }
    async open() { return true; }
  },
  ReactWidget: class ReactWidget {
    constructor() { this.id = ''; this.title = {}; }
    update() {}
    render() { return null; }
  },
  BaseWidget: class BaseWidget {
    constructor() { this.id = ''; this.title = {}; }
  },
  ApplicationShell: class ApplicationShell {},
  WidgetManager: class WidgetManager {},
  QuickInputService: class QuickInputService {},
  FrontendApplication: class FrontendApplication {},
};
