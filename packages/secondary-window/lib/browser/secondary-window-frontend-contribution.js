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
exports.SecondaryWindowContribution = exports.EXTRACT_WIDGET = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const command_1 = require("@theia/core/lib/common/command");
const widgets_1 = require("@theia/core/lib/browser/widgets");
const secondary_window_handler_1 = require("@theia/core/lib/browser/secondary-window-handler");
exports.EXTRACT_WIDGET = command_1.Command.toLocalizedCommand({
    id: 'extract-widget',
    label: 'Move View to Secondary Window'
}, 'theia/secondary-window/extract-widget');
/** Contributes the widget extraction command and registers it in the toolbar of extractable widgets. */
let SecondaryWindowContribution = class SecondaryWindowContribution {
    registerCommands(commands) {
        commands.registerCommand(exports.EXTRACT_WIDGET, {
            execute: async (widget) => this.secondaryWindowHandler.moveWidgetToSecondaryWindow(widget),
            isVisible: widget => widgets_1.ExtractableWidget.is(widget) && widget.secondaryWindow === undefined,
            isEnabled: widget => widgets_1.ExtractableWidget.is(widget) && widget.secondaryWindow === undefined,
        });
    }
    registerToolbarItems(registry) {
        registry.registerItem({
            id: exports.EXTRACT_WIDGET.id,
            command: exports.EXTRACT_WIDGET.id,
            icon: (0, widgets_1.codicon)('window'),
        });
    }
};
exports.SecondaryWindowContribution = SecondaryWindowContribution;
tslib_1.__decorate([
    (0, inversify_1.inject)(secondary_window_handler_1.SecondaryWindowHandler),
    tslib_1.__metadata("design:type", secondary_window_handler_1.SecondaryWindowHandler)
], SecondaryWindowContribution.prototype, "secondaryWindowHandler", void 0);
exports.SecondaryWindowContribution = SecondaryWindowContribution = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], SecondaryWindowContribution);
//# sourceMappingURL=secondary-window-frontend-contribution.js.map