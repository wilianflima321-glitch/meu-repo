"use strict";
/********************************************************************************
 * Copyright (C) 2019 Ericsson and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
 ********************************************************************************/
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebugFrontendContribution = void 0;
const tslib_1 = require("tslib");
const browser_1 = require("@theia/core/lib/browser");
const frontend_application_state_1 = require("@theia/core/lib/browser/frontend-application-state");
const color_1 = require("@theia/core/lib/common/color");
const inversify_1 = require("@theia/core/shared/inversify");
const debug_console_items_1 = require("@theia/debug/lib/browser/console/debug-console-items");
const debug_frontend_application_contribution_1 = require("@theia/debug/lib/browser/debug-frontend-application-contribution");
const debug_variables_widget_1 = require("@theia/debug/lib/browser/view/debug-variables-widget");
const memory_editable_table_widget_1 = require("./editable-widget/memory-editable-table-widget");
const memory_provider_service_1 = require("./memory-provider/memory-provider-service");
const memory_table_widget_1 = require("./memory-widget/memory-table-widget");
const register_table_widget_1 = require("./register-widget/register-table-widget");
const memory_commands_1 = require("./utils/memory-commands");
const memory_widget_manager_1 = require("./utils/memory-widget-manager");
const memory_dock_panel_1 = require("./wrapper-widgets/memory-dock-panel");
const memory_layout_widget_1 = require("./wrapper-widgets/memory-layout-widget");
const nls_1 = require("@theia/core/lib/common/nls");
const long_1 = tslib_1.__importDefault(require("long"));
const ONE_HALF_OPACITY = 0.5;
let DebugFrontendContribution = class DebugFrontendContribution extends browser_1.AbstractViewContribution {
    constructor() {
        super({
            widgetId: memory_layout_widget_1.MemoryLayoutWidget.ID,
            widgetName: memory_layout_widget_1.MemoryLayoutWidget.LABEL,
            defaultWidgetOptions: {
                area: 'right',
            },
            toggleCommandId: memory_commands_1.MemoryCommand.id,
        });
    }
    init() {
        this.stateService.reachedState('initialized_layout').then(() => {
            // Close leftover widgets from previous sessions.
            this.memoryWidgetManager.availableWidgets.forEach(widget => {
                if (!(widget.parent instanceof memory_dock_panel_1.MemoryDockPanel)) {
                    widget.close();
                }
            });
        });
    }
    async initializeLayout() {
        await this.openView({ activate: false });
    }
    registerCommands(registry) {
        super.registerCommands(registry);
        registry.registerCommand(memory_commands_1.ViewVariableInMemoryCommand, {
            execute: async () => {
                const { selectedVariable } = this.debugContribution;
                const referenceText = this.memoryProvider.formatVariableReference(selectedVariable);
                if (referenceText) {
                    await this.openMemoryWidgetAt(referenceText);
                }
            },
            isVisible: () => {
                const { selectedVariable } = this.debugContribution;
                return Boolean(this.memoryProvider.supportsVariableReferenceSyntax(selectedVariable) && this.memoryProvider.formatVariableReference(selectedVariable));
            },
        });
        registry.registerCommand(memory_commands_1.ViewVariableInRegisterViewCommand, {
            execute: async () => {
                var _a;
                const name = (_a = this.debugContribution.selectedVariable) === null || _a === void 0 ? void 0 : _a.name;
                if (name) {
                    await this.openRegisterWidgetWithReg(name);
                }
            },
            isVisible: () => {
                var _a, _b;
                let { selectedVariable: currentLevel } = this.debugContribution;
                if (!currentLevel) {
                    return false;
                }
                // Make sure it looks like it has a numerical value.
                try {
                    BigInt(currentLevel.value);
                }
                catch {
                    return false;
                }
                while (currentLevel.parent instanceof debug_console_items_1.DebugVariable) {
                    currentLevel = currentLevel.parent;
                }
                return currentLevel.parent instanceof debug_console_items_1.DebugScope && ((_b = (_a = currentLevel.parent) === null || _a === void 0 ? void 0 : _a['raw']) === null || _b === void 0 ? void 0 : _b.name) === 'Registers';
            },
        });
        registry.registerCommand(memory_commands_1.FollowPointerDebugCommand, {
            isVisible: () => { var _a; return !!this.isPointer((_a = this.debugContribution.selectedVariable) === null || _a === void 0 ? void 0 : _a.type); },
            isEnabled: () => { var _a; return !!this.isPointer((_a = this.debugContribution.selectedVariable) === null || _a === void 0 ? void 0 : _a.type); },
            execute: async () => {
                var _a;
                const name = (_a = this.debugContribution.selectedVariable) === null || _a === void 0 ? void 0 : _a.name;
                if (name) {
                    await this.openMemoryWidgetAt(name);
                }
            },
        });
        registry.registerCommand(memory_commands_1.ResetModifiedCellCommand, {
            isEnabled: (widgetToActOn, address) => long_1.default.isLong(address) && widgetToActOn instanceof memory_editable_table_widget_1.MemoryEditableTableWidget,
            isVisible: (widgetToActOn, address) => long_1.default.isLong(address) && widgetToActOn instanceof memory_editable_table_widget_1.MemoryEditableTableWidget,
            execute: (widgetToActOn, address) => widgetToActOn.resetModifiedValue(address),
        });
        registry.registerCommand(memory_commands_1.FollowPointerTableCommand, {
            isEnabled: (widgetToActOn, address, variable) => widgetToActOn instanceof memory_table_widget_1.MemoryTableWidget &&
                this.isPointer(variable === null || variable === void 0 ? void 0 : variable.type),
            isVisible: (widgetToActOn, address, variable) => widgetToActOn instanceof memory_table_widget_1.MemoryTableWidget &&
                this.isPointer(variable === null || variable === void 0 ? void 0 : variable.type),
            execute: (widgetToActOn, address, variable) => {
                if (variable === null || variable === void 0 ? void 0 : variable.name) {
                    widgetToActOn.optionsWidget.setAddressAndGo(variable.name);
                }
            },
        });
        registry.registerCommand(memory_commands_1.CreateNewMemoryViewCommand, {
            isEnabled: w => this.withWidget(() => true, w),
            isVisible: w => this.withWidget(() => true, w),
            execute: () => this.memoryWidgetManager.createNewMemoryWidget(),
        });
        registry.registerCommand(memory_commands_1.CreateNewRegisterViewCommand, {
            isEnabled: w => this.withWidget(() => true, w),
            isVisible: w => this.withWidget(() => true, w),
            execute: () => this.memoryWidgetManager.createNewMemoryWidget('register'),
        });
        registry.registerCommand(memory_commands_1.RegisterSetVariableCommand, {
            isEnabled: (widgetToActOn, dVar) => widgetToActOn instanceof register_table_widget_1.RegisterTableWidget &&
                dVar && dVar.supportSetVariable,
            isVisible: (widgetToActOn, dVar) => widgetToActOn instanceof register_table_widget_1.RegisterTableWidget &&
                dVar && dVar.supportSetVariable,
            execute: (widgetToActOn, dVar) => dVar && widgetToActOn.handleSetValue(dVar),
        });
        registry.registerCommand(memory_commands_1.ToggleDiffSelectWidgetVisibilityCommand, {
            isVisible: widget => this.withWidget(() => this.memoryWidgetManager.canCompare, widget),
            execute: (widget) => {
                widget.toggleComparisonVisibility();
            },
        });
    }
    isPointer(type) {
        return !!(type === null || type === void 0 ? void 0 : type.includes('*'));
    }
    /**
     * @param {string} addressReference Should be the exact string to be used in the address bar. I.e. it must resolve to an address value.
     */
    async openMemoryWidgetAt(addressReference) {
        await this.openView({ activate: false });
        const newWidget = await this.memoryWidgetManager.createNewMemoryWidget();
        await this.shell.activateWidget(newWidget.id);
        if (newWidget) {
            newWidget.optionsWidget.setAddressAndGo(addressReference);
        }
        return newWidget;
    }
    async openRegisterWidgetWithReg(name) {
        await this.openView({ activate: false });
        const newWidget = await this.memoryWidgetManager.createNewMemoryWidget('register');
        await this.shell.activateWidget(newWidget.id);
        if (newWidget) {
            newWidget.optionsWidget.setRegAndUpdate(name);
        }
        return newWidget;
    }
    withWidget(fn, widget = this.tryGetWidget()) {
        if (widget instanceof memory_layout_widget_1.MemoryLayoutWidget && widget.id === memory_layout_widget_1.MemoryLayoutWidget.ID) {
            return fn(widget);
        }
        return false;
    }
    registerMenus(registry) {
        super.registerMenus(registry);
        const registerMenuActions = (menuPath, ...commands) => {
            for (const [index, command] of commands.entries()) {
                registry.registerMenuAction(menuPath, {
                    commandId: command.id,
                    label: command.label,
                    icon: command.iconClass,
                    order: String.fromCharCode('a'.charCodeAt(0) + index),
                });
            }
        };
        registry.registerMenuAction(debug_variables_widget_1.DebugVariablesWidget.WATCH_MENU, { commandId: memory_commands_1.ViewVariableInMemoryCommand.id, label: memory_commands_1.ViewVariableInMemoryCommand.label });
        registry.registerMenuAction(debug_variables_widget_1.DebugVariablesWidget.WATCH_MENU, { commandId: memory_commands_1.FollowPointerDebugCommand.id, label: memory_commands_1.FollowPointerDebugCommand.label });
        registry.registerMenuAction(debug_variables_widget_1.DebugVariablesWidget.WATCH_MENU, { commandId: memory_commands_1.ViewVariableInRegisterViewCommand.id, label: memory_commands_1.ViewVariableInRegisterViewCommand.label });
        registry.registerMenuAction(memory_editable_table_widget_1.MemoryEditableTableWidget.CONTEXT_MENU, { commandId: memory_commands_1.ResetModifiedCellCommand.id, label: memory_commands_1.ResetModifiedCellCommand.label });
        registry.registerMenuAction(memory_table_widget_1.MemoryTableWidget.CONTEXT_MENU, { commandId: memory_commands_1.FollowPointerTableCommand.id, label: memory_commands_1.FollowPointerTableCommand.label });
        registerMenuActions(register_table_widget_1.RegisterTableWidget.CONTEXT_MENU, memory_commands_1.RegisterSetVariableCommand);
    }
    registerToolbarItems(toolbarRegistry) {
        toolbarRegistry.registerItem({
            id: memory_commands_1.CreateNewMemoryViewCommand.id,
            command: memory_commands_1.CreateNewMemoryViewCommand.id,
            tooltip: memory_commands_1.CreateNewMemoryViewCommand.label,
            priority: -2,
        });
        toolbarRegistry.registerItem({
            id: memory_commands_1.CreateNewRegisterViewCommand.id,
            command: memory_commands_1.CreateNewRegisterViewCommand.id,
            tooltip: memory_commands_1.CreateNewRegisterViewCommand.label,
            priority: -1,
        });
        toolbarRegistry.registerItem({
            id: memory_commands_1.ToggleDiffSelectWidgetVisibilityCommand.id,
            command: memory_commands_1.ToggleDiffSelectWidgetVisibilityCommand.id,
            tooltip: nls_1.nls.localize('theia/memory-inspector/toggleComparisonWidgetVisibility', 'Toggle Comparison Widget Visibility'),
            priority: -3,
            onDidChange: this.memoryWidgetManager.onChanged,
        });
    }
    registerColors(colorRegistry) {
        colorRegistry.register({
            id: 'memoryDiff.removedTextBackground',
            defaults: {
                dark: color_1.Color.transparent('diffEditor.removedTextBackground', ONE_HALF_OPACITY),
                light: color_1.Color.transparent('diffEditor.removedTextBackground', ONE_HALF_OPACITY),
            },
            description: 'A less opaque diff color for use in the Memory Inspector where various overlays may me in place at once.',
        }, {
            id: 'memoryDiff.insertedTextBackground',
            defaults: {
                dark: color_1.Color.transparent('diffEditor.insertedTextBackground', ONE_HALF_OPACITY),
                light: color_1.Color.transparent('diffEditor.insertedTextBackground', ONE_HALF_OPACITY),
            },
            description: 'A less opaque diff color for use in the Memory Inspector where various overlays may me in place at once.',
        }, {
            id: 'memoryInspector.focusBorder',
            defaults: {
                dark: color_1.Color.transparent('focusBorder', ONE_HALF_OPACITY),
                light: color_1.Color.transparent('focusBorder', ONE_HALF_OPACITY),
            },
            description: 'A less opaque focus border color for use in the Memory Inspector where several overlays may be in place at once.',
        }, {
            id: 'memoryInspector.foreground',
            defaults: {
                dark: color_1.Color.transparent('editor.foreground', ONE_HALF_OPACITY),
                light: color_1.Color.transparent('editor.foreground', ONE_HALF_OPACITY),
            },
            description: 'A less opaque foreground text style for use in the Memory Inspector',
        });
    }
};
exports.DebugFrontendContribution = DebugFrontendContribution;
tslib_1.__decorate([
    (0, inversify_1.inject)(debug_frontend_application_contribution_1.DebugFrontendApplicationContribution),
    tslib_1.__metadata("design:type", debug_frontend_application_contribution_1.DebugFrontendApplicationContribution)
], DebugFrontendContribution.prototype, "debugContribution", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(memory_widget_manager_1.MemoryWidgetManager),
    tslib_1.__metadata("design:type", memory_widget_manager_1.MemoryWidgetManager)
], DebugFrontendContribution.prototype, "memoryWidgetManager", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(frontend_application_state_1.FrontendApplicationStateService),
    tslib_1.__metadata("design:type", frontend_application_state_1.FrontendApplicationStateService)
], DebugFrontendContribution.prototype, "stateService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(memory_provider_service_1.MemoryProviderService),
    tslib_1.__metadata("design:type", memory_provider_service_1.MemoryProviderService)
], DebugFrontendContribution.prototype, "memoryProvider", void 0);
tslib_1.__decorate([
    (0, inversify_1.postConstruct)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], DebugFrontendContribution.prototype, "init", null);
exports.DebugFrontendContribution = DebugFrontendContribution = tslib_1.__decorate([
    (0, inversify_1.injectable)(),
    tslib_1.__metadata("design:paramtypes", [])
], DebugFrontendContribution);
//# sourceMappingURL=memory-inspector-frontend-contribution.js.map