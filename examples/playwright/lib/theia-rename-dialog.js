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
exports.TheiaRenameDialog = void 0;
const theia_dialog_1 = require("./theia-dialog");
const util_1 = require("./util");
class TheiaRenameDialog extends theia_dialog_1.TheiaDialog {
    async enterNewName(newName) {
        const inputField = this.page.locator(`${this.blockSelector} .theia-input`);
        await inputField.selectText();
        await inputField.pressSequentially(newName, { delay: util_1.USER_KEY_TYPING_DELAY });
    }
    async confirm() {
        if (!await this.validationResult()) {
            throw new Error(`Unexpected validation error in TheiaRenameDialog: '${await this.getValidationText()}`);
        }
        await this.clickMainButton();
    }
}
exports.TheiaRenameDialog = TheiaRenameDialog;
//# sourceMappingURL=theia-rename-dialog.js.map