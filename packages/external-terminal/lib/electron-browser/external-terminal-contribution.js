"use strict";
// *****************************************************************************
// Copyright (C) 2021 Ericsson and others.
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
exports.ExternalTerminalFrontendContribution = exports.ExternalTerminalCommands = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const common_1 = require("@theia/core/lib/common");
const env_variables_1 = require("@theia/core/lib/common/env-variables");
const browser_1 = require("@theia/core/lib/browser");
const editor_manager_1 = require("@theia/editor/lib/browser/editor-manager");
const browser_2 = require("@theia/workspace/lib/browser");
const external_terminal_1 = require("../common/external-terminal");
const external_terminal_preference_1 = require("./external-terminal-preference");
const quick_pick_service_1 = require("@theia/core/lib/common/quick-pick-service");
const nls_1 = require("@theia/core/lib/common/nls");
var ExternalTerminalCommands;
(function (ExternalTerminalCommands) {
    ExternalTerminalCommands.OPEN_NATIVE_CONSOLE = common_1.Command.toDefaultLocalizedCommand({
        id: 'workbench.action.terminal.openNativeConsole',
        label: 'Open New External Terminal'
    });
})(ExternalTerminalCommands || (exports.ExternalTerminalCommands = ExternalTerminalCommands = {}));
let ExternalTerminalFrontendContribution = class ExternalTerminalFrontendContribution {
    registerCommands(commands) {
        commands.registerCommand(ExternalTerminalCommands.OPEN_NATIVE_CONSOLE, {
            execute: () => this.openExternalTerminal()
        });
    }
    registerKeybindings(keybindings) {
        keybindings.registerKeybinding({
            command: ExternalTerminalCommands.OPEN_NATIVE_CONSOLE.id,
            keybinding: 'ctrlcmd+shift+c',
            when: '!terminalFocus'
        });
    }
    /**
     * Open a native console on the host machine.
     *
     * - If multi-root workspace is open, displays a quick pick to let users choose which workspace to spawn the terminal.
     * - If only one workspace is open, the terminal spawns at the root of the current workspace.
     * - If no workspace is open and there is an active editor, the terminal spawns at the parent folder of that file.
     * - If no workspace is open and there are no active editors, the terminal spawns at user home directory.
     */
    async openExternalTerminal() {
        var _a, _b;
        const configuration = this.externalTerminalPreferences.getExternalTerminalConfiguration();
        if (this.workspaceService.isMultiRootWorkspaceOpened) {
            const chosenWorkspaceRoot = await this.selectCwd();
            if (chosenWorkspaceRoot) {
                await this.externalTerminalService.openTerminal(configuration, chosenWorkspaceRoot);
            }
            return;
        }
        if (this.workspaceService.opened) {
            const workspaceRootUri = this.workspaceService.tryGetRoots()[0].resource;
            await this.externalTerminalService.openTerminal(configuration, workspaceRootUri.toString());
            return;
        }
        const fallbackUri = (_b = (_a = this.editorManager.activeEditor) === null || _a === void 0 ? void 0 : _a.editor.uri.parent) !== null && _b !== void 0 ? _b : await this.envVariablesServer.getHomeDirUri();
        await this.externalTerminalService.openTerminal(configuration, fallbackUri.toString());
    }
    /**
     * Display a quick pick for user to choose a target workspace in opened workspaces.
     */
    async selectCwd() {
        const roots = this.workspaceService.tryGetRoots();
        const selectedItem = await this.quickPickService.show(roots.map(({ resource }) => ({
            label: this.labelProvider.getName(resource),
            description: this.labelProvider.getLongName(resource),
            value: resource.toString()
        })), { placeholder: nls_1.nls.localize('theia/external-terminal/cwd', 'Select current working directory for new external terminal') });
        return selectedItem === null || selectedItem === void 0 ? void 0 : selectedItem.value;
    }
};
exports.ExternalTerminalFrontendContribution = ExternalTerminalFrontendContribution;
tslib_1.__decorate([
    (0, inversify_1.inject)(editor_manager_1.EditorManager),
    tslib_1.__metadata("design:type", editor_manager_1.EditorManager)
], ExternalTerminalFrontendContribution.prototype, "editorManager", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(env_variables_1.EnvVariablesServer),
    tslib_1.__metadata("design:type", Object)
], ExternalTerminalFrontendContribution.prototype, "envVariablesServer", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_1.LabelProvider),
    tslib_1.__metadata("design:type", browser_1.LabelProvider)
], ExternalTerminalFrontendContribution.prototype, "labelProvider", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(quick_pick_service_1.QuickPickService),
    tslib_1.__metadata("design:type", Object)
], ExternalTerminalFrontendContribution.prototype, "quickPickService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(external_terminal_1.ExternalTerminalService),
    tslib_1.__metadata("design:type", Object)
], ExternalTerminalFrontendContribution.prototype, "externalTerminalService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(external_terminal_preference_1.ExternalTerminalPreferenceService),
    tslib_1.__metadata("design:type", external_terminal_preference_1.ExternalTerminalPreferenceService)
], ExternalTerminalFrontendContribution.prototype, "externalTerminalPreferences", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_2.WorkspaceService),
    tslib_1.__metadata("design:type", browser_2.WorkspaceService)
], ExternalTerminalFrontendContribution.prototype, "workspaceService", void 0);
exports.ExternalTerminalFrontendContribution = ExternalTerminalFrontendContribution = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], ExternalTerminalFrontendContribution);
//# sourceMappingURL=external-terminal-contribution.js.map