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
exports.TheiaStatusBar = void 0;
const theia_page_object_1 = require("./theia-page-object");
class TheiaStatusBar extends theia_page_object_1.TheiaPageObject {
    constructor() {
        super(...arguments);
        this.selector = 'div#theia-statusBar';
    }
    async statusBarElementHandle() {
        return this.page.$(this.selector);
    }
    async statusIndicator(statusIndicatorFactory) {
        return new statusIndicatorFactory(this.app);
    }
    async waitForVisible() {
        await this.page.waitForSelector(this.selector, { state: 'visible' });
    }
    async isVisible() {
        const statusBar = await this.statusBarElementHandle();
        return !!statusBar && statusBar.isVisible();
    }
}
exports.TheiaStatusBar = TheiaStatusBar;
//# sourceMappingURL=theia-status-bar.js.map