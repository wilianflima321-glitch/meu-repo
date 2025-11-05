"use strict";
// *****************************************************************************
// Copyright (C) 2025 and others.
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
exports.bindToolbarContentHoverWidgetPatcher = exports.ToolbarContentHoverWidgetPatcher = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const default_content_hover_widget_patcher_1 = require("@theia/monaco/lib/browser/default-content-hover-widget-patcher");
const application_shell_with_toolbar_override_1 = require("./application-shell-with-toolbar-override");
let ToolbarContentHoverWidgetPatcher = class ToolbarContentHoverWidgetPatcher extends default_content_hover_widget_patcher_1.DefaultContentHoverWidgetPatcher {
    onStart(app) {
        super.onStart(app);
        const shell = app.shell;
        if (shell instanceof application_shell_with_toolbar_override_1.ApplicationShellWithToolbarOverride) {
            shell['toolbar'].onDidChangeVisibility(() => {
                this.updateContentHoverWidgetHeight({
                    topHeight: this.getTopPanelHeight(shell)
                });
            });
        }
    }
    getTopPanelHeight(shell) {
        const defaultHeight = shell.topPanel.node.getBoundingClientRect().height;
        if (shell instanceof application_shell_with_toolbar_override_1.ApplicationShellWithToolbarOverride) {
            const toolbarHeight = shell['toolbar'].node.getBoundingClientRect().height;
            return defaultHeight + toolbarHeight;
        }
        return defaultHeight;
    }
};
exports.ToolbarContentHoverWidgetPatcher = ToolbarContentHoverWidgetPatcher;
exports.ToolbarContentHoverWidgetPatcher = ToolbarContentHoverWidgetPatcher = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], ToolbarContentHoverWidgetPatcher);
const bindToolbarContentHoverWidgetPatcher = (bind, rebind, unbind) => {
    bind(ToolbarContentHoverWidgetPatcher).toSelf().inSingletonScope();
    rebind(default_content_hover_widget_patcher_1.DefaultContentHoverWidgetPatcher).toService(ToolbarContentHoverWidgetPatcher);
};
exports.bindToolbarContentHoverWidgetPatcher = bindToolbarContentHoverWidgetPatcher;
//# sourceMappingURL=toolbar-content-hover-widget-patcher.js.map