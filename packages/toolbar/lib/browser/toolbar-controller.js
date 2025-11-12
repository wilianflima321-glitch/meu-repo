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
exports.ToolbarController = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@theia/core");
const browser_1 = require("@theia/core/lib/browser");
const frontend_application_state_1 = require("@theia/core/lib/browser/frontend-application-state");
const promise_util_1 = require("@theia/core/lib/common/promise-util");
const inversify_1 = require("@theia/core/shared/inversify");
const toolbar_interfaces_1 = require("./toolbar-interfaces");
const toolbar_storage_provider_1 = require("./toolbar-storage-provider");
const tab_toolbar_item_1 = require("@theia/core/lib/browser/shell/tab-bar-toolbar/tab-toolbar-item");
const context_key_service_1 = require("@theia/core/lib/browser/context-key-service");
const label_parser_1 = require("@theia/core/lib/browser/label-parser");
const toolbar_constants_1 = require("./toolbar-constants");
let ToolbarController = class ToolbarController {
    constructor() {
        this.toolbarModelDidUpdateEmitter = new core_1.Emitter();
        this.onToolbarModelDidUpdate = this.toolbarModelDidUpdateEmitter.event;
        this.toolbarProviderBusyEmitter = new core_1.Emitter();
        this.onToolbarDidChangeBusyState = this.toolbarProviderBusyEmitter.event;
        this.ready = new promise_util_1.Deferred();
    }
    get toolbarItems() {
        return this._toolbarItems;
    }
    set toolbarItems(newTree) {
        this._toolbarItems = newTree;
        this.toolbarModelDidUpdateEmitter.fire();
    }
    inflateItems(schema) {
        const newTree = {
            items: {
                [toolbar_interfaces_1.ToolbarAlignment.LEFT]: [],
                [toolbar_interfaces_1.ToolbarAlignment.CENTER]: [],
                [toolbar_interfaces_1.ToolbarAlignment.RIGHT]: [],
            },
        };
        if (schema) {
            for (const column of Object.keys(schema.items)) {
                const currentColumn = schema.items[column];
                for (const group of currentColumn) {
                    const newGroup = [];
                    for (const item of group) {
                        if (item.group === 'contributed') {
                            const contribution = this.getContributionByID(item.id);
                            if (contribution) {
                                newGroup.push(new tab_toolbar_item_1.ReactToolbarItemImpl(this.commandRegistry, this.contextKeyService, contribution));
                            }
                        }
                        else {
                            newGroup.push(new tab_toolbar_item_1.RenderedToolbarItemImpl(this.commandRegistry, this.contextKeyService, this.keybindingRegistry, this.labelParser, item));
                        }
                    }
                    if (newGroup.length) {
                        newTree.items[column].push(newGroup);
                    }
                }
            }
        }
        return newTree;
    }
    getContributionByID(id) {
        return this.widgetContributions.getContributions().find(contribution => contribution.id === id);
    }
    init() {
        this.doInit();
    }
    async doInit() {
        await this.appState.reachedState('ready');
        await this.storageProvider.ready;
        this.toolbarItems = await this.resolveToolbarItems();
        this.storageProvider.onToolbarItemsChanged(async () => {
            this.toolbarItems = await this.resolveToolbarItems(true);
        });
        this.ready.resolve();
        this.widgetContributions.getContributions().forEach(contribution => {
            if (contribution.onDidChange) {
                contribution.onDidChange(() => this.toolbarModelDidUpdateEmitter.fire());
            }
        });
    }
    async resolveToolbarItems(promptUserOnInvalidConfig = false) {
        await this.storageProvider.ready;
        if (!this.storageProvider.toolbarItems) {
            let restoreDefaults = true;
            if (promptUserOnInvalidConfig) {
                const resetLabel = toolbar_constants_1.ToolbarCommands.RESET_TOOLBAR.label;
                const answer = await this.messageService.error(core_1.nls.localize('theia/toolbar/jsonError', toolbar_storage_provider_1.TOOLBAR_BAD_JSON_ERROR_MESSAGE), resetLabel);
                restoreDefaults = answer === resetLabel;
            }
            if (restoreDefaults) {
                await this.restoreToolbarDefaults();
            }
        }
        return this.inflateItems(this.storageProvider.toolbarItems);
    }
    async swapValues(oldPosition, newPosition, direction) {
        return this.withBusy(async () => {
            await this.openOrCreateJSONFile(false);
            return this.storageProvider.swapValues(oldPosition, newPosition, direction);
        });
    }
    async restoreToolbarDefaults() {
        return this.withBusy(() => this.storageProvider.restoreToolbarDefaults());
    }
    async openOrCreateJSONFile(doOpen = false) {
        return this.storageProvider.openOrCreateJSONFile(this.toolbarItems, doOpen);
    }
    async addItem(command, area) {
        return this.withBusy(async () => {
            await this.openOrCreateJSONFile(false);
            return this.storageProvider.addItem(command, area);
        });
    }
    async removeItem(position, id) {
        return this.withBusy(async () => {
            await this.openOrCreateJSONFile(false);
            return this.storageProvider.removeItem(position);
        });
    }
    async moveItemToEmptySpace(draggedItemPosition, column, centerPosition) {
        return this.withBusy(async () => {
            await this.openOrCreateJSONFile(false);
            return this.storageProvider.moveItemToEmptySpace(draggedItemPosition, column, centerPosition);
        });
    }
    async insertGroup(position, insertDirection) {
        return this.withBusy(async () => {
            await this.openOrCreateJSONFile(false);
            return this.storageProvider.insertGroup(position, insertDirection);
        });
    }
    async withBusy(action) {
        this.toolbarProviderBusyEmitter.fire(true);
        const toReturn = await action();
        this.toolbarProviderBusyEmitter.fire(false);
        return toReturn;
    }
};
exports.ToolbarController = ToolbarController;
tslib_1.__decorate([
    (0, inversify_1.inject)(toolbar_storage_provider_1.ToolbarStorageProvider),
    tslib_1.__metadata("design:type", toolbar_storage_provider_1.ToolbarStorageProvider)
], ToolbarController.prototype, "storageProvider", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(frontend_application_state_1.FrontendApplicationStateService),
    tslib_1.__metadata("design:type", frontend_application_state_1.FrontendApplicationStateService)
], ToolbarController.prototype, "appState", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.MessageService),
    tslib_1.__metadata("design:type", core_1.MessageService)
], ToolbarController.prototype, "messageService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.CommandRegistry),
    tslib_1.__metadata("design:type", core_1.CommandRegistry)
], ToolbarController.prototype, "commandRegistry", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(context_key_service_1.ContextKeyService),
    tslib_1.__metadata("design:type", Object)
], ToolbarController.prototype, "contextKeyService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_1.KeybindingRegistry),
    tslib_1.__metadata("design:type", browser_1.KeybindingRegistry)
], ToolbarController.prototype, "keybindingRegistry", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(label_parser_1.LabelParser),
    tslib_1.__metadata("design:type", label_parser_1.LabelParser)
], ToolbarController.prototype, "labelParser", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.ContributionProvider),
    (0, inversify_1.named)(toolbar_interfaces_1.ToolbarContribution),
    tslib_1.__metadata("design:type", Object)
], ToolbarController.prototype, "widgetContributions", void 0);
tslib_1.__decorate([
    (0, inversify_1.postConstruct)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], ToolbarController.prototype, "init", null);
exports.ToolbarController = ToolbarController = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], ToolbarController);
//# sourceMappingURL=toolbar-controller.js.map