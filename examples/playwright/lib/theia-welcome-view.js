"use strict";
// *****************************************************************************
// Copyright (C) 2023 Toro Cloud Pty Ltd and others.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TheiaWelcomeView = void 0;
const theia_view_1 = require("./theia-view");
const util_1 = require("./util");
const TheiaWelcomeViewData = {
    tabSelector: (0, util_1.normalizeId)('#shell-tab-getting.started.widget'),
    viewSelector: (0, util_1.normalizeId)('#getting.started.widget'),
    viewName: 'Welcome'
};
class TheiaWelcomeView extends theia_view_1.TheiaView {
    constructor(app) {
        super(TheiaWelcomeViewData, app);
    }
}
exports.TheiaWelcomeView = TheiaWelcomeView;
//# sourceMappingURL=theia-welcome-view.js.map