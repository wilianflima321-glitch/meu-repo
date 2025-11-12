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
exports.TheiaView = void 0;
const theia_context_menu_1 = require("./theia-context-menu");
const theia_page_object_1 = require("./theia-page-object");
const util_1 = require("./util");
class TheiaView extends theia_page_object_1.TheiaPageObject {
    constructor(data, app) {
        super(app);
        this.data = data;
    }
    get tabSelector() {
        return this.data.tabSelector;
    }
    get viewSelector() {
        return this.data.viewSelector;
    }
    get name() {
        return this.data.viewName;
    }
    async open() {
        if (!this.data.viewName) {
            throw new Error('View name must be specified to open via command palette');
        }
        await this.app.quickCommandPalette.type('View: Open View');
        await this.app.quickCommandPalette.trigger('View: Open View...', this.data.viewName);
        await this.waitForVisible();
        return this;
    }
    async focus() {
        await this.activate();
        const view = await this.viewElement();
        await (view === null || view === void 0 ? void 0 : view.click());
    }
    async activate() {
        await this.page.waitForSelector(this.tabSelector, { state: 'visible' });
        if (!await this.isActive()) {
            const tab = await this.tabElement();
            await (tab === null || tab === void 0 ? void 0 : tab.click());
        }
        return this.waitForVisible();
    }
    async waitForVisible() {
        await this.page.waitForSelector(this.viewSelector, { state: 'visible' });
    }
    async isTabVisible() {
        return (0, util_1.isElementVisible)(this.tabElement());
    }
    async isDisplayed() {
        return (0, util_1.isElementVisible)(this.viewElement());
    }
    async isActive() {
        return await this.isTabVisible() && (0, util_1.containsClass)(this.tabElement(), 'lm-mod-current');
    }
    async isClosable() {
        return await this.isTabVisible() && (0, util_1.containsClass)(this.tabElement(), 'lm-mod-closable');
    }
    async close(waitForClosed = true) {
        if (!(await this.isTabVisible())) {
            return;
        }
        if (!(await this.isClosable())) {
            throw Error(`View ${this.tabSelector} is not closable`);
        }
        const tab = await this.tabElement();
        const side = await this.side();
        if (side === 'main' || side === 'bottom') {
            const closeIcon = await (tab === null || tab === void 0 ? void 0 : tab.waitForSelector('div.lm-TabBar-tabCloseIcon'));
            await (closeIcon === null || closeIcon === void 0 ? void 0 : closeIcon.click());
        }
        else {
            const menu = await this.openContextMenuOnTab();
            const closeItem = await menu.menuItemByName('Close');
            await (closeItem === null || closeItem === void 0 ? void 0 : closeItem.click());
        }
        if (waitForClosed) {
            await this.waitUntilClosed();
        }
    }
    async waitUntilClosed() {
        await this.page.waitForSelector(this.tabSelector, { state: 'detached' });
    }
    async title() {
        if ((await this.isInSidePanel()) && !(await this.isActive())) {
            // we can only determine the label of a side-panel view, if it is active
            await this.activate();
        }
        switch (await this.side()) {
            case 'left':
                return (0, util_1.textContent)(this.page.waitForSelector('div.theia-left-side-panel > div.theia-sidepanel-title'));
            case 'right':
                return (0, util_1.textContent)(this.page.waitForSelector('div.theia-right-side-panel > div.theia-sidepanel-title'));
        }
        const tab = await this.tabElement();
        if (tab) {
            return (0, util_1.textContent)(tab.waitForSelector('div.theia-tab-icon-label > div.lm-TabBar-tabLabel'));
        }
        return undefined;
    }
    async isInSidePanel() {
        return (await this.side() === 'left') || (await this.side() === 'right');
    }
    async side() {
        if (!await this.isTabVisible()) {
            throw Error(`Unable to determine side of invisible view tab '${this.tabSelector}'`);
        }
        const tab = await this.tabElement();
        const appAreaElement = tab === null || tab === void 0 ? void 0 : tab.$('xpath=../../../..');
        if (await (0, util_1.containsClass)(appAreaElement, 'theia-app-left')) {
            return 'left';
        }
        if (await (0, util_1.containsClass)(appAreaElement, 'theia-app-right')) {
            return 'right';
        }
        if (await (0, util_1.containsClass)(appAreaElement, 'theia-app-bottom')) {
            return 'bottom';
        }
        if (await (0, util_1.containsClass)(appAreaElement, 'theia-app-main')) {
            return 'main';
        }
        throw Error(`Unable to determine side of view tab '${this.tabSelector}'`);
    }
    async openContextMenuOnTab() {
        await this.activate();
        return theia_context_menu_1.TheiaContextMenu.open(this.app, () => this.page.waitForSelector(this.tabSelector));
    }
    viewElement() {
        return this.page.$(this.viewSelector);
    }
    tabElement() {
        return this.page.$(this.tabSelector);
    }
}
exports.TheiaView = TheiaView;
//# sourceMappingURL=theia-view.js.map