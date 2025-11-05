// Minimal mock class for DebugConfigurationManager used by launch provider tests
class DebugConfigurationManager {
  constructor() {
    // default empty configs
    this._configs = [];
    // diagnostic
    try { console.log('[debug-configuration-manager-mock] constructed'); } catch (e) { }
  }
  async load() { return Promise.resolve(); }
  get all() {
    const self = this;
    function* configIterator() {
      for (const config of (self._configs || [])) {
        yield config;
      }
    }
    return configIterator();
  }
}

// Export both named and default to match ES module named imports used in the codebase
module.exports = DebugConfigurationManager;
module.exports.DebugConfigurationManager = DebugConfigurationManager;
module.exports.default = DebugConfigurationManager;
