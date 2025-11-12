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
exports.TheiaMenu = void 0;
const theia_menu_item_1 = require("./theia-menu-item");
const theia_page_object_1 = require("./theia-page-object");
const util_1 = require("./util");
class TheiaMenu extends theia_page_object_1.TheiaPageObject {
    constructor() {
        super(...arguments);
        this.selector = '.lm-Menu';
    }
    async menuElementHandle() {
        return this.page.$(this.selector);
    }
    async waitForVisible() {
        await this.page.waitForSelector(this.selector, { state: 'visible' });
    }
    async isOpen() {
        const menu = await this.menuElementHandle();
        return !!menu && menu.isVisible();
    }
    async close() {
        if (!await this.isOpen()) {
            return;
        }
        await this.page.mouse.click(0, 0);
        await this.page.waitForSelector(this.selector, { state: 'detached' });
    }
    async menuItems() {
        const menuHandle = await this.menuElementHandle();
        if (!menuHandle) {
            return [];
        }
        const items = await menuHandle.$$('.lm-Menu-content .lm-Menu-item');
        return items.map(element => new theia_menu_item_1.TheiaMenuItem(element));
    }
    async clickMenuItem(name) {
        return (await this.page.waitForSelector(this.menuItemSelector(name))).click();
    }
    async menuItemByName(name) {
        const menuItems = await this.menuItems();
        for (const item of menuItems) {
            const label = await item.label();
            if (label === name) {
                return item;
            }
        }
        return undefined;
    }
    async menuItemByNamePath(...names) {
        let item;
        for (let index = 0; index < names.length; index++) {
            item = await this.page.waitForSelector(this.menuItemSelector(names[index]), { state: 'visible' });
            await item.hover();
        }
        const menuItemHandle = await (item === null || item === void 0 ? void 0 : item.$('xpath=..'));
        if (menuItemHandle) {
            return new theia_menu_item_1.TheiaMenuItem(menuItemHandle);
        }
        return undefined;
    }
    menuItemSelector(label = '') {
        return `.lm-Menu-content .lm-Menu-itemLabel >> text=${label}`;
    }
    async visibleMenuItems() {
        const menuItems = await this.menuItems();
        const labels = await Promise.all(menuItems.map(item => item.label()));
        return labels.filter(util_1.isDefined);
    }
}
exports.TheiaMenu = TheiaMenu;
//# sourceMappingURL=theia-menu.js.map