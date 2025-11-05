"use strict";
// *****************************************************************************
// Copyright (C) 2022 Ericsson and others.
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
require("../../src/browser/style/toolbar.css");
const inversify_1 = require("@theia/core/shared/inversify");
const application_shell_with_toolbar_override_1 = require("./application-shell-with-toolbar-override");
const toolbar_command_contribution_1 = require("./toolbar-command-contribution");
const toolbar_content_hover_widget_patcher_1 = require("./toolbar-content-hover-widget-patcher");
exports.default = new inversify_1.ContainerModule((bind, unbind, _isBound, rebind) => {
    (0, application_shell_with_toolbar_override_1.bindToolbarApplicationShell)(bind, rebind, unbind);
    (0, toolbar_command_contribution_1.bindToolbar)(bind);
    (0, toolbar_content_hover_widget_patcher_1.bindToolbarContentHoverWidgetPatcher)(bind, rebind, unbind);
});
//# sourceMappingURL=toolbar-frontend-module.js.map