// Minimal mock for DebugSessionManager used by launch provider tests
const debugSessionManager = {
  start: async (options) => {
    if (typeof options === 'string' || (options && options.compound)) {
      return true;
    }
    return {
      id: 'test-session-id',
      configuration: { name: options && options.name ? options.name : (options && options.configuration && options.configuration.name) }
    };
  },
  terminateSession: async () => Promise.resolve(),
  currentSession: undefined,
  sessions: []
};

module.exports = debugSessionManager;
module.exports.DebugSessionManager = debugSessionManager;
module.exports.default = debugSessionManager;
