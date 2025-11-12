"use strict";
// *****************************************************************************
// Copyright (C) 2025 EclipseSource GmbH.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// This Source Code may also be made available under the following Secondary
// Licenses when the conditions for such availability set forth in the Eclipse
// Public License v. 2.0 are satisfied: GNU General Public License, version 2
// with the GNU Classpath Exception which is available at
// https://www.gnu.org/software/classpath/license.html.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserAutomationImpl = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const puppeteer_core_1 = require("puppeteer-core");
const MAX_DOM_LENGTH = 50000;
let BrowserAutomationImpl = class BrowserAutomationImpl {
    _browser;
    _page;
    client;
    get browser() {
        if (!this._browser) {
            throw new Error('Browser is not launched');
        }
        return this._browser;
    }
    get page() {
        if (!this._page) {
            throw new Error('Page is not created');
        }
        return this._page;
    }
    async isRunning() {
        return this._browser !== undefined && this._browser.connected;
    }
    async launch(remoteDebuggingPort) {
        if (this._browser) {
            await this.close();
        }
        const browser = await (0, puppeteer_core_1.launch)({
            headless: false,
            channel: 'chrome',
            args: [
                `--remote-debugging-port=${remoteDebuggingPort}`
            ],
        });
        this._browser = browser;
        // The initial page will be used per default
        this._page = (await browser.pages())[0];
        return {
            remoteDebuggingPort
        };
    }
    async close() {
        await this._browser?.close();
        this._browser = undefined;
    }
    async queryDom(selector) {
        const page = this.page;
        let content = '';
        if (selector) {
            const element = await page.$(selector);
            if (!element) {
                throw new Error(`Element with selector "${selector}" not found`);
            }
            content = await page.evaluate((el) => el.outerHTML, element);
        }
        else {
            content = await page.content();
        }
        if (content.length > MAX_DOM_LENGTH) {
            return 'The queried DOM is too large. Please provide a more specific query.';
        }
        return content;
    }
    dispose() {
        this._browser?.close();
        this._browser = undefined;
    }
    setClient(client) {
        this.client = client;
    }
    getClient() {
        return this.client;
    }
};
exports.BrowserAutomationImpl = BrowserAutomationImpl;
exports.BrowserAutomationImpl = BrowserAutomationImpl = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], BrowserAutomationImpl);
//# sourceMappingURL=browser-automation-impl.js.map