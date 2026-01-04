module.exports = {
  ...require('./common/index.js'),
  CommandContribution: Symbol.for('@theia/core/CommandContribution'),
  PreferenceContribution: Symbol.for('@theia/core/PreferenceContribution'),
  ConnectionHandler: Symbol.for('@theia/core/ConnectionHandler'),
  PreferenceService: Symbol.for('@theia/core/PreferenceService'),
  MessageService: Symbol.for('@theia/core/MessageService'),
  CommandRegistry: Symbol.for('@theia/core/CommandRegistry'),
  RpcConnectionHandler: class RpcConnectionHandler {
    constructor(_path, _factory) {
      this.path = _path;
      this.factory = _factory;
    }
  },
};
