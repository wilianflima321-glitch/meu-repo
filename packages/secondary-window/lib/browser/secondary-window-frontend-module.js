"use strict";
// *****************************************************************************
// Copyright (C) 2022 STMicroelectronics, Ericsson, ARM, EclipseSource and others.
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
const inversify_1 = require("@theia/core/shared/inversify");
const secondary_window_frontend_contribution_1 = require("./secondary-window-frontend-contribution");
const command_1 = require("@theia/core/lib/common/command");
const tab_bar_toolbar_1 = require("@theia/core/lib/browser/shell/tab-bar-toolbar");
exports.default = new inversify_1.ContainerModule(bind => {
    bind(secondary_window_frontend_contribution_1.SecondaryWindowContribution).toSelf().inSingletonScope();
    bind(command_1.CommandContribution).toService(secondary_window_frontend_contribution_1.SecondaryWindowContribution);
    bind(tab_bar_toolbar_1.TabBarToolbarContribution).toService(secondary_window_frontend_contribution_1.SecondaryWindowContribution);
});
//# sourceMappingURL=secondary-window-frontend-module.js.map