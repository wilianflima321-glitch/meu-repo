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
exports.TheiaToolbar = void 0;
const theia_page_object_1 = require("./theia-page-object");
const theia_toolbar_item_1 = require("./theia-toolbar-item");
class TheiaToolbar extends theia_page_object_1.TheiaPageObject {
    constructor() {
        super(...arguments);
        this.selector = 'div#main-toolbar.lm-TabBar-toolbar';
    }
    async toolbarElementHandle() {
        return this.page.$(this.selector);
    }
    async waitForVisible() {
        await this.page.waitForSelector(this.selector, { state: 'visible' });
    }
    async isShown() {
        const statusBar = await this.toolbarElementHandle();
        return !!statusBar && statusBar.isVisible();
    }
    async show() {
        if (!await this.isShown()) {
            await this.toggle();
        }
    }
    async hide() {
        if (await this.isShown()) {
            await this.toggle();
        }
    }
    async toggle() {
        const isShown = await this.isShown();
        const viewMenu = await this.app.menuBar.openMenu('View');
        await viewMenu.clickMenuItem('Toggle Toolbar');
        isShown ? await this.waitUntilHidden() : await this.waitUntilShown();
    }
    async waitUntilHidden() {
        await this.page.waitForSelector(this.selector, { state: 'hidden' });
    }
    async waitUntilShown() {
        await this.page.waitForSelector(this.selector, { state: 'visible' });
    }
    async toolbarItems() {
        const toolbarHandle = await this.toolbarElementHandle();
        if (!toolbarHandle) {
            return [];
        }
        const items = await toolbarHandle.$$(this.toolBarItemSelector());
        return items.map(element => new theia_toolbar_item_1.TheiaToolbarItem(this.app, element));
    }
    async toolbarItemIds() {
        const items = await this.toolbarItems();
        return this.toCommandIdArray(items);
    }
    async toolBarItem(commandId) {
        const toolbarHandle = await this.toolbarElementHandle();
        if (!toolbarHandle) {
            return undefined;
        }
        const item = await toolbarHandle.$(this.toolBarItemSelector(commandId));
        if (item) {
            return new theia_toolbar_item_1.TheiaToolbarItem(this.app, item);
        }
        return undefined;
    }
    toolBarItemSelector(toolbarItemId = '') {
        return `div.toolbar-item${toolbarItemId ? `[id="${toolbarItemId}"]` : ''}`;
    }
    async toCommandIdArray(items) {
        const contents = items.map(item => item.commandId());
        const resolvedContents = await Promise.all(contents);
        return resolvedContents.filter(id => id !== undefined);
    }
}
exports.TheiaToolbar = TheiaToolbar;
//# sourceMappingURL=theia-toolbar.js.map