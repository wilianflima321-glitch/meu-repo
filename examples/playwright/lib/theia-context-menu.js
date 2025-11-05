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
exports.TheiaContextMenu = void 0;
const theia_menu_1 = require("./theia-menu");
class TheiaContextMenu extends theia_menu_1.TheiaMenu {
    static async openAt(app, x, y) {
        await app.page.mouse.move(x, y);
        await app.page.mouse.click(x, y, { button: 'right' });
        return TheiaContextMenu.returnWhenVisible(app);
    }
    static async open(app, element) {
        const elementHandle = await element();
        await elementHandle.click({ button: 'right' });
        return TheiaContextMenu.returnWhenVisible(app);
    }
    static async returnWhenVisible(app) {
        const menu = new TheiaContextMenu(app);
        await menu.waitForVisible();
        return menu;
    }
}
exports.TheiaContextMenu = TheiaContextMenu;
//# sourceMappingURL=theia-context-menu.js.map