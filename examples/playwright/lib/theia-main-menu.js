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
exports.TheiaMenuBar = exports.TheiaMainMenu = void 0;
const theia_menu_1 = require("./theia-menu");
const theia_page_object_1 = require("./theia-page-object");
const util_1 = require("./util");
class TheiaMainMenu extends theia_menu_1.TheiaMenu {
    constructor() {
        super(...arguments);
        this.selector = '.lm-Menu.lm-MenuBar-menu';
    }
}
exports.TheiaMainMenu = TheiaMainMenu;
class TheiaMenuBar extends theia_page_object_1.TheiaPageObject {
    async openMenu(menuName) {
        const menuBarItem = await this.menuBarItem(menuName);
        const mainMenu = new TheiaMainMenu(this.app);
        if (await mainMenu.isOpen()) {
            await (menuBarItem === null || menuBarItem === void 0 ? void 0 : menuBarItem.hover());
        }
        else {
            await (menuBarItem === null || menuBarItem === void 0 ? void 0 : menuBarItem.click());
        }
        mainMenu.waitForVisible();
        return mainMenu;
    }
    async visibleMenuBarItems() {
        const items = await this.page.$$(this.menuBarItemSelector());
        return (0, util_1.toTextContentArray)(items);
    }
    menuBarItem(label = '') {
        return this.page.waitForSelector(this.menuBarItemSelector(label));
    }
    menuBarItemSelector(label = '') {
        return `${(0, util_1.normalizeId)('#theia:menubar')} .lm-MenuBar-itemLabel >> text=${label}`;
    }
}
exports.TheiaMenuBar = TheiaMenuBar;
//# sourceMappingURL=theia-main-menu.js.map