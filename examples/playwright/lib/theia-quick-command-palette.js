"use strict";
// *****************************************************************************
// Copyright (C) 2021 logi.cals GmbH, EclipseSource and others.
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
exports.TheiaQuickCommandPalette = void 0;
const theia_page_object_1 = require("./theia-page-object");
const util_1 = require("./util");
class TheiaQuickCommandPalette extends theia_page_object_1.TheiaPageObject {
    constructor() {
        super(...arguments);
        this.selector = '.quick-input-widget';
    }
    async open() {
        await this.page.keyboard.press(util_1.OSUtil.isMacOS ? 'Meta+Shift+p' : 'Control+Shift+p');
        await this.page.waitForSelector(this.selector);
    }
    async hide() {
        await this.page.keyboard.press('Escape');
        await this.page.waitForSelector(this.selector, { state: 'hidden' });
    }
    async isOpen() {
        try {
            await this.page.waitForSelector(this.selector, { timeout: 5000 });
        }
        catch (err) {
            return false;
        }
        return true;
    }
    async trigger(...commandName) {
        for (const command of commandName) {
            await this.triggerSingleCommand(command);
        }
    }
    async triggerSingleCommand(commandName) {
        if (!await this.isOpen()) {
            this.open();
        }
        let selected = await this.selectedCommand();
        while (!(await (selected === null || selected === void 0 ? void 0 : selected.innerText()) === commandName)) {
            await this.page.keyboard.press('ArrowDown');
            selected = await this.selectedCommand();
        }
        await this.page.keyboard.press('Enter');
    }
    async type(value, confirm = false) {
        if (!await this.isOpen()) {
            this.open();
        }
        const input = this.page.locator(`${this.selector} .monaco-inputbox .input`);
        await input.focus();
        await input.pressSequentially(value, { delay: util_1.USER_KEY_TYPING_DELAY });
        if (confirm) {
            await this.page.keyboard.press('Enter');
        }
    }
    async selectedCommand() {
        const command = await this.page.waitForSelector(this.selector);
        if (!command) {
            throw new Error('No selected command found!');
        }
        return command.$('.monaco-list-row.focused .monaco-highlighted-label');
    }
    async visibleItems() {
        // FIXME rewrite with locators
        const command = await this.page.waitForSelector(this.selector);
        if (!command) {
            throw new Error('No selected command found!');
        }
        return command.$$('.monaco-highlighted-label');
    }
}
exports.TheiaQuickCommandPalette = TheiaQuickCommandPalette;
//# sourceMappingURL=theia-quick-command-palette.js.map