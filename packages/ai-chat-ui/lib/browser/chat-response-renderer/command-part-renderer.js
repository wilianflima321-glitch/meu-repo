"use strict";
// *****************************************************************************
// Copyright (C) 2024 EclipseSource GmbH.
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
exports.CommandPartRenderer = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const common_1 = require("@theia/ai-chat/lib/common");
const React = require("@theia/core/shared/react");
const core_1 = require("@theia/core");
let CommandPartRenderer = class CommandPartRenderer {
    canHandle(response) {
        if (common_1.CommandChatResponseContent.is(response)) {
            return 10;
        }
        return -1;
    }
    render(response) {
        var _a, _b, _c, _d, _e, _f;
        const label = (_f = (_d = (_b = (_a = response.customCallback) === null || _a === void 0 ? void 0 : _a.label) !== null && _b !== void 0 ? _b : (_c = response.command) === null || _c === void 0 ? void 0 : _c.label) !== null && _d !== void 0 ? _d : (_e = response.command) === null || _e === void 0 ? void 0 : _e.id.split('-').map(s => s[0].toUpperCase() + s.substring(1)).join(' ')) !== null && _f !== void 0 ? _f : 'Execute';
        if (!response.customCallback && response.command) {
            const isCommandEnabled = this.commandRegistry.isEnabled(response.command.id);
            if (!isCommandEnabled) {
                return React.createElement("div", null,
                    "The command has the id \"",
                    response.command.id,
                    "\" but it is not executable from the Chat window.");
            }
        }
        return React.createElement("button", { className: 'theia-button main', onClick: this.onCommand.bind(this, response) }, label);
    }
    onCommand(arg) {
        var _a;
        if (arg.customCallback) {
            arg.customCallback.callback().catch(e => { console.error(e); });
        }
        else if (arg.command) {
            this.commandService.executeCommand(arg.command.id, ...((_a = arg.arguments) !== null && _a !== void 0 ? _a : [])).catch(e => { console.error(e); });
        }
        else {
            console.warn('No command or custom callback provided in command chat response content');
        }
    }
};
exports.CommandPartRenderer = CommandPartRenderer;
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.CommandService),
    tslib_1.__metadata("design:type", Object)
], CommandPartRenderer.prototype, "commandService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.CommandRegistry),
    tslib_1.__metadata("design:type", core_1.CommandRegistry)
], CommandPartRenderer.prototype, "commandRegistry", void 0);
exports.CommandPartRenderer = CommandPartRenderer = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], CommandPartRenderer);
//# sourceMappingURL=command-part-renderer.js.map