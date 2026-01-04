"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserAutomationImpl = void 0;
const browser_automation_protocol_1 = require("../../common/browser-automation-protocol");
class BrowserAutomationImpl extends browser_automation_protocol_1.BrowserAutomation {
    setClient(client) {
        this.client = client;
    }
    close() {
        this.client = undefined;
    }
}
exports.BrowserAutomationImpl = BrowserAutomationImpl;
