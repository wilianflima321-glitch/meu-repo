"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setUpPluginApi = void 0;
const env_main_1 = require("@theia/plugin-ext/lib/main/common/env-main");
const basic_message_registry_main_1 = require("@theia/plugin-ext/lib/main/common/basic-message-registry-main");
const basic_notification_main_1 = require("@theia/plugin-ext/lib/main/common/basic-notification-main");
const headless_plugin_rpc_1 = require("../../common/headless-plugin-rpc");
// This sets up only the minimal plugin API required by the plugin manager to report
// messages and notifications to the main side and to initialize plugins.
function setUpPluginApi(rpc, container) {
    const envMain = new env_main_1.EnvMainImpl(rpc, container);
    rpc.set(headless_plugin_rpc_1.HEADLESSPLUGIN_RPC_CONTEXT.ENV_MAIN, envMain);
    const messageRegistryMain = new basic_message_registry_main_1.BasicMessageRegistryMainImpl(container);
    rpc.set(headless_plugin_rpc_1.HEADLESSPLUGIN_RPC_CONTEXT.MESSAGE_REGISTRY_MAIN, messageRegistryMain);
    const notificationMain = new basic_notification_main_1.BasicNotificationMainImpl(rpc, container, headless_plugin_rpc_1.HEADLESSMAIN_RPC_CONTEXT.NOTIFICATION_EXT);
    rpc.set(headless_plugin_rpc_1.HEADLESSPLUGIN_RPC_CONTEXT.NOTIFICATION_MAIN, notificationMain);
}
exports.setUpPluginApi = setUpPluginApi;
//# sourceMappingURL=main-context.js.map