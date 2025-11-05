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
exports.TheiaEditor = void 0;
const theia_dialog_1 = require("./theia-dialog");
const theia_view_1 = require("./theia-view");
const util_1 = require("./util");
class TheiaEditor extends theia_view_1.TheiaView {
    async isDirty() {
        return await this.isTabVisible() && (0, util_1.containsClass)(this.tabElement(), 'theia-mod-dirty');
    }
    async save() {
        await this.activate();
        if (!await this.isDirty()) {
            return;
        }
        const fileMenu = await this.app.menuBar.openMenu('File');
        const saveItem = await fileMenu.menuItemByName('Save');
        await (saveItem === null || saveItem === void 0 ? void 0 : saveItem.click());
        await this.page.waitForSelector(this.tabSelector + '.theia-mod-dirty', { state: 'detached' });
    }
    async closeWithoutSave() {
        if (!await this.isDirty()) {
            return super.close(true);
        }
        await super.close(false);
        const saveDialog = new theia_dialog_1.TheiaDialog(this.app);
        await saveDialog.clickButton('Don\'t save');
        await super.waitUntilClosed();
    }
    async saveAndClose() {
        await this.save();
        await this.close();
    }
    async undo(times = 1) {
        await this.activate();
        for (let i = 0; i < times; i++) {
            const editMenu = await this.app.menuBar.openMenu('Edit');
            const undoItem = await editMenu.menuItemByName('Undo');
            await (undoItem === null || undoItem === void 0 ? void 0 : undoItem.click());
            await this.app.page.waitForTimeout(200);
        }
    }
    async redo(times = 1) {
        await this.activate();
        for (let i = 0; i < times; i++) {
            const editMenu = await this.app.menuBar.openMenu('Edit');
            const undoItem = await editMenu.menuItemByName('Redo');
            await (undoItem === null || undoItem === void 0 ? void 0 : undoItem.click());
            await this.app.page.waitForTimeout(200);
        }
    }
}
exports.TheiaEditor = TheiaEditor;
//# sourceMappingURL=theia-editor.js.map