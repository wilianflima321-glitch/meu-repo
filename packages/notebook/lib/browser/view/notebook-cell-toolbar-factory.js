"use strict";
// *****************************************************************************
// Copyright (C) 2023 TypeFox and others.
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
exports.NotebookCellToolbarFactory = void 0;
const tslib_1 = require("tslib");
const React = require("@theia/core/shared/react");
const core_1 = require("@theia/core");
const inversify_1 = require("@theia/core/shared/inversify");
const context_key_service_1 = require("@theia/core/lib/browser/context-key-service");
const notebook_cell_toolbar_1 = require("./notebook-cell-toolbar");
const browser_1 = require("@theia/core/lib/browser");
const notebook_context_manager_1 = require("../service/notebook-context-manager");
let NotebookCellToolbarFactory = class NotebookCellToolbarFactory {
    constructor() {
        this.onDidChangeContextEmitter = new core_1.Emitter;
        this.onDidChangeContext = this.onDidChangeContextEmitter.event;
        this.toDisposeOnRender = new core_1.DisposableCollection();
    }
    renderCellToolbar(menuPath, cell, itemOptions) {
        return React.createElement(notebook_cell_toolbar_1.NotebookCellToolbar, { getMenuItems: () => this.getMenuItems(menuPath, cell, itemOptions), onContextChanged: this.onDidChangeContext });
    }
    renderSidebar(menuPath, cell, itemOptions) {
        return React.createElement(notebook_cell_toolbar_1.NotebookCellSidebar, { getMenuItems: () => this.getMenuItems(menuPath, cell, itemOptions), onContextChanged: this.onDidChangeContext });
    }
    getMenuItems(menuItemPath, cell, itemOptions) {
        var _a, _b;
        this.toDisposeOnRender.dispose();
        this.toDisposeOnRender = new core_1.DisposableCollection();
        const inlineItems = [];
        const menu = this.menuRegistry.getMenu(menuItemPath);
        if (menu) {
            for (const menuNode of menu.children) {
                const itemPath = [...menuItemPath, menuNode.id];
                if (menuNode.isVisible(itemPath, this.notebookContextManager.getCellContext(cell.handle), this.notebookContextManager.context, (_b = (_a = itemOptions.commandArgs) === null || _a === void 0 ? void 0 : _a.call(itemOptions)) !== null && _b !== void 0 ? _b : [])) {
                    if (core_1.RenderedMenuNode.is(menuNode)) {
                        if (menuNode.onDidChange) {
                            this.toDisposeOnRender.push(menuNode.onDidChange(() => this.onDidChangeContextEmitter.fire()));
                        }
                        inlineItems.push(this.createToolbarItem(itemPath, menuNode, itemOptions));
                    }
                }
            }
        }
        return inlineItems;
    }
    createToolbarItem(menuPath, menuNode, itemOptions) {
        return {
            id: menuNode.id,
            icon: menuNode.icon,
            label: menuNode.label,
            onClick: e => {
                var _a, _b, _c;
                if (core_1.CompoundMenuNode.is(menuNode)) {
                    this.contextMenuRenderer.render({
                        anchor: e.nativeEvent,
                        menuPath: menuPath,
                        menu: menuNode,
                        includeAnchorArg: false,
                        args: (_a = itemOptions.contextMenuArgs) === null || _a === void 0 ? void 0 : _a.call(itemOptions),
                        context: this.notebookContextManager.context || e.currentTarget
                    });
                }
                else if (core_1.CommandMenu.is(menuNode)) {
                    menuNode.run(menuPath, ...((_c = (_b = itemOptions.commandArgs) === null || _b === void 0 ? void 0 : _b.call(itemOptions)) !== null && _c !== void 0 ? _c : []));
                }
                ;
            },
            isVisible: () => true
        };
    }
};
exports.NotebookCellToolbarFactory = NotebookCellToolbarFactory;
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.MenuModelRegistry),
    tslib_1.__metadata("design:type", core_1.MenuModelRegistry)
], NotebookCellToolbarFactory.prototype, "menuRegistry", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(context_key_service_1.ContextKeyService),
    tslib_1.__metadata("design:type", Object)
], NotebookCellToolbarFactory.prototype, "contextKeyService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_1.ContextMenuRenderer),
    tslib_1.__metadata("design:type", browser_1.ContextMenuRenderer)
], NotebookCellToolbarFactory.prototype, "contextMenuRenderer", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.CommandRegistry),
    tslib_1.__metadata("design:type", core_1.CommandRegistry)
], NotebookCellToolbarFactory.prototype, "commandRegistry", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(notebook_context_manager_1.NotebookContextManager),
    tslib_1.__metadata("design:type", notebook_context_manager_1.NotebookContextManager)
], NotebookCellToolbarFactory.prototype, "notebookContextManager", void 0);
exports.NotebookCellToolbarFactory = NotebookCellToolbarFactory = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], NotebookCellToolbarFactory);
//# sourceMappingURL=notebook-cell-toolbar-factory.js.map