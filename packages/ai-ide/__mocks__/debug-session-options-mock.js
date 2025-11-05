// Minimal DebugSessionOptions mock used by tests
class DebugSessionOptions {
  static isConfiguration(obj) {
    return !!obj && typeof obj.configuration !== 'undefined';
  }
  static isCompound(obj) {
    return !!obj && typeof obj.compound !== 'undefined';
  }
}

module.exports = { DebugSessionOptions };
module.exports.DebugSessionOptions = DebugSessionOptions;
module.exports.default = DebugSessionOptions;
