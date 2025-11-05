"use strict";
// *****************************************************************************
// Copyright (C) 2023 EclipseSource and others.
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
exports.TheiaTerminal = void 0;
const theia_context_menu_1 = require("./theia-context-menu");
const theia_view_1 = require("./theia-view");
class TheiaTerminal extends theia_view_1.TheiaView {
    constructor(tabId, app) {
        super({
            tabSelector: `#shell-tab-terminal-${getTerminalId(tabId)}`,
            viewSelector: `#terminal-${getTerminalId(tabId)}`
        }, app);
    }
    async submit(text) {
        await this.write(text);
        const input = await this.waitForInputArea();
        await input.press('Enter');
    }
    async write(text) {
        await this.activate();
        const input = await this.waitForInputArea();
        await input.fill(text);
    }
    async contents() {
        await this.activate();
        await (await this.openContextMenu()).clickMenuItem('Select All');
        await (await this.openContextMenu()).clickMenuItem('Copy');
        return this.page.evaluate('navigator.clipboard.readText()');
    }
    async openContextMenu() {
        await this.activate();
        return theia_context_menu_1.TheiaContextMenu.open(this.app, () => this.waitForVisibleView());
    }
    async waitForInputArea() {
        const view = await this.waitForVisibleView();
        return view.waitForSelector('.xterm-helper-textarea');
    }
    async waitForVisibleView() {
        return this.page.waitForSelector(this.viewSelector, { state: 'visible' });
    }
}
exports.TheiaTerminal = TheiaTerminal;
function getTerminalId(tabId) {
    return tabId.substring(tabId.lastIndexOf('-') + 1);
}
//# sourceMappingURL=theia-terminal.js.map