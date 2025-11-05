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
exports.AbstractToolbarContribution = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@theia/core");
const inversify_1 = require("@theia/core/shared/inversify");
const browser_1 = require("@theia/core/lib/browser");
let AbstractToolbarContribution = class AbstractToolbarContribution {
    constructor() {
        this.didChangeEmitter = new core_1.Emitter();
        this.onDidChange = this.didChangeEmitter.event;
    }
    toJSON() {
        return { id: this.id, group: 'contributed' };
    }
    resolveKeybindingForCommand(commandID) {
        if (!commandID) {
            return '';
        }
        const keybindings = this.keybindingRegistry.getKeybindingsForCommand(commandID);
        if (keybindings.length > 0) {
            const binding = keybindings[0];
            const bindingKeySequence = this.keybindingRegistry.resolveKeybinding(binding);
            const keyCode = bindingKeySequence[0];
            return ` (${this.keybindingRegistry.acceleratorForKeyCode(keyCode, '+')})`;
        }
        return '';
    }
};
exports.AbstractToolbarContribution = AbstractToolbarContribution;
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_1.KeybindingRegistry),
    tslib_1.__metadata("design:type", browser_1.KeybindingRegistry)
], AbstractToolbarContribution.prototype, "keybindingRegistry", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_1.ContextMenuRenderer),
    tslib_1.__metadata("design:type", browser_1.ContextMenuRenderer)
], AbstractToolbarContribution.prototype, "contextMenuRenderer", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.CommandService),
    tslib_1.__metadata("design:type", Object)
], AbstractToolbarContribution.prototype, "commandService", void 0);
exports.AbstractToolbarContribution = AbstractToolbarContribution = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], AbstractToolbarContribution);
//# sourceMappingURL=abstract-toolbar-contribution.js.map