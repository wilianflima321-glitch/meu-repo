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
exports.TheiaAboutDialog = void 0;
const theia_dialog_1 = require("./theia-dialog");
class TheiaAboutDialog extends theia_dialog_1.TheiaDialog {
    async isVisible() {
        const dialog = await this.page.$(`${this.blockSelector} .theia-aboutDialog`);
        return !!dialog && dialog.isVisible();
    }
}
exports.TheiaAboutDialog = TheiaAboutDialog;
//# sourceMappingURL=theia-about-dialog.js.map