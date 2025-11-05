"use strict";
var LaunchBrowserProvider_1, CloseBrowserProvider_1, IsBrowserRunningProvider_1, QueryDomProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryDomProvider = exports.IsBrowserRunningProvider = exports.CloseBrowserProvider = exports.LaunchBrowserProvider = exports.BrowserAutomationToolProvider = void 0;
const tslib_1 = require("tslib");
const common_1 = require("@theia/ai-mcp/lib/common");
const inversify_1 = require("@theia/core/shared/inversify");
const app_tester_chat_functions_1 = require("../common/app-tester-chat-functions");
const browser_automation_protocol_1 = require("../common/browser-automation-protocol");
let BrowserAutomationToolProvider = class BrowserAutomationToolProvider {
    browser;
};
exports.BrowserAutomationToolProvider = BrowserAutomationToolProvider;
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_automation_protocol_1.BrowserAutomation),
    tslib_1.__metadata("design:type", Object)
], BrowserAutomationToolProvider.prototype, "browser", void 0);
exports.BrowserAutomationToolProvider = BrowserAutomationToolProvider = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], BrowserAutomationToolProvider);
let LaunchBrowserProvider = class LaunchBrowserProvider extends BrowserAutomationToolProvider {
    static { LaunchBrowserProvider_1 = this; }
    static ID = app_tester_chat_functions_1.LAUNCH_BROWSER_FUNCTION_ID;
    mcpServerManager;
    getTool() {
        return {
            id: LaunchBrowserProvider_1.ID,
            name: LaunchBrowserProvider_1.ID,
            description: 'Start the browser.',
            parameters: {
                type: 'object',
                properties: {},
                required: []
            }, handler: async () => {
                try {
                    const mcp = await this.mcpServerManager.getServerDescription('playwright');
                    if (!mcp) {
                        throw new Error('No MCP Playwright instance with name playwright found');
                    }
                    if (!(0, common_1.isLocalMCPServerDescription)(mcp)) {
                        throw new Error('The MCP Playwright instance must run locally.');
                    }
                    const cdpEndpointIndex = mcp.args?.findIndex(p => p === '--cdp-endpoint');
                    if (!cdpEndpointIndex) {
                        throw new Error('No --cdp-endpoint was provided.');
                    }
                    const cdpEndpoint = mcp.args?.[cdpEndpointIndex + 1];
                    if (!cdpEndpoint) {
                        throw new Error('No --cdp-endpoint argument was provided.');
                    }
                    let remoteDebuggingPort = 9222;
                    try {
                        const uri = new URL(cdpEndpoint);
                        if (uri.port) {
                            remoteDebuggingPort = parseInt(uri.port, 10);
                        }
                        else {
                            // Default ports if not specified
                            remoteDebuggingPort = uri.protocol === 'https:' ? 443 : 80;
                        }
                    }
                    catch (error) {
                        throw new Error(`Invalid --cdp-endpoint format, URL expected: ${cdpEndpoint}`);
                    }
                    const result = await this.browser.launch(remoteDebuggingPort);
                    return result;
                }
                catch (ex) {
                    return (`Failed to starting the browser: ${ex.message}`);
                }
            }
        };
    }
};
exports.LaunchBrowserProvider = LaunchBrowserProvider;
tslib_1.__decorate([
    (0, inversify_1.inject)(common_1.MCPServerManager),
    tslib_1.__metadata("design:type", Object)
], LaunchBrowserProvider.prototype, "mcpServerManager", void 0);
exports.LaunchBrowserProvider = LaunchBrowserProvider = LaunchBrowserProvider_1 = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], LaunchBrowserProvider);
let CloseBrowserProvider = class CloseBrowserProvider extends BrowserAutomationToolProvider {
    static { CloseBrowserProvider_1 = this; }
    static ID = app_tester_chat_functions_1.CLOSE_BROWSER_FUNCTION_ID;
    getTool() {
        return {
            id: CloseBrowserProvider_1.ID,
            name: CloseBrowserProvider_1.ID,
            description: 'Close the browser.',
            parameters: {
                type: 'object',
                properties: {},
                required: []
            },
            handler: async () => {
                try {
                    await this.browser.close();
                }
                catch (ex) {
                    return (`Failed to close browser: ${ex.message}`);
                }
            }
        };
    }
};
exports.CloseBrowserProvider = CloseBrowserProvider;
exports.CloseBrowserProvider = CloseBrowserProvider = CloseBrowserProvider_1 = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], CloseBrowserProvider);
let IsBrowserRunningProvider = class IsBrowserRunningProvider extends BrowserAutomationToolProvider {
    static { IsBrowserRunningProvider_1 = this; }
    static ID = app_tester_chat_functions_1.IS_BROWSER_RUNNING_FUNCTION_ID;
    getTool() {
        return {
            id: IsBrowserRunningProvider_1.ID,
            name: IsBrowserRunningProvider_1.ID,
            description: 'Check if the browser is running.',
            parameters: {
                type: 'object',
                properties: {},
                required: []
            },
            handler: async () => {
                try {
                    const isRunning = await this.browser.isRunning();
                    return isRunning ? 'Browser is running.' : 'Browser is not running.';
                }
                catch (ex) {
                    return (`Failed to check if browser is running: ${ex.message}`);
                }
            }
        };
    }
};
exports.IsBrowserRunningProvider = IsBrowserRunningProvider;
exports.IsBrowserRunningProvider = IsBrowserRunningProvider = IsBrowserRunningProvider_1 = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], IsBrowserRunningProvider);
let QueryDomProvider = class QueryDomProvider extends BrowserAutomationToolProvider {
    static { QueryDomProvider_1 = this; }
    static ID = app_tester_chat_functions_1.QUERY_DOM_FUNCTION_ID;
    getTool() {
        return {
            id: QueryDomProvider_1.ID,
            name: QueryDomProvider_1.ID,
            description: 'Query the DOM of the active page.',
            parameters: {
                type: 'object',
                properties: {
                    selector: {
                        type: 'string',
                        description: `The selector of the element to get the DOM of. The selector is a 
                        CSS selector that identifies the element. If not provided, the entire DOM will be returned.`
                    }
                },
                required: []
            },
            handler: async (arg) => {
                try {
                    const { selector } = JSON.parse(arg);
                    return await this.browser.queryDom(selector);
                }
                catch (ex) {
                    return (`Failed to get DOM: ${ex.message}`);
                }
            }
        };
    }
};
exports.QueryDomProvider = QueryDomProvider;
exports.QueryDomProvider = QueryDomProvider = QueryDomProvider_1 = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], QueryDomProvider);
//# sourceMappingURL=app-tester-chat-functions.js.map