"use strict";
// *****************************************************************************
// Copyright (C) 2024 TypeFox GmbH and others.
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
exports.TheiaNotebookToolbar = void 0;
const theia_toolbar_1 = require("./theia-toolbar");
class TheiaNotebookToolbar extends theia_toolbar_1.TheiaToolbar {
    constructor(parentLocator, app) {
        super(app);
        this.selector = 'div#notebook-main-toolbar';
        this.locator = parentLocator.locator(this.selector);
    }
    toolBarItemSelector(toolbarItemId = '') {
        return `div.theia-notebook-main-toolbar-item${toolbarItemId ? `[id="${toolbarItemId}"]` : ''}`;
    }
    async toolbarElementHandle() {
        // Use locator instead of page to find the toolbar element.
        return this.locator.elementHandle();
    }
    async waitForVisible() {
        // Use locator instead of page to find the toolbar element.
        await this.locator.waitFor({ state: 'visible' });
    }
    async waitUntilHidden() {
        // Use locator instead of page to find the toolbar element.
        await this.locator.waitFor({ state: 'hidden' });
    }
    async waitUntilShown() {
        // Use locator instead of page to find the toolbar element.
        await this.locator.waitFor({ state: 'visible' });
    }
}
exports.TheiaNotebookToolbar = TheiaNotebookToolbar;
//# sourceMappingURL=theia-notebook-toolbar.js.map