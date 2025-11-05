"use strict";
// *****************************************************************************
// Copyright (C) 2024 TypeFox GmbH and others.
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
exports.TheiaNotebookEditor = exports.NotebookCommands = void 0;
const theia_editor_1 = require("./theia-editor");
const theia_notebook_cell_1 = require("./theia-notebook-cell");
const theia_notebook_toolbar_1 = require("./theia-notebook-toolbar");
const theia_quick_command_palette_1 = require("./theia-quick-command-palette");
const util_1 = require("./util");
var NotebookCommands;
(function (NotebookCommands) {
    NotebookCommands.SELECT_KERNEL_COMMAND = 'notebook.selectKernel';
    NotebookCommands.ADD_NEW_CELL_COMMAND = 'notebook.add-new-code-cell';
    NotebookCommands.ADD_NEW_MARKDOWN_CELL_COMMAND = 'notebook.add-new-markdown-cell';
    NotebookCommands.EXECUTE_NOTEBOOK_COMMAND = 'notebook.execute';
    NotebookCommands.CLEAR_ALL_OUTPUTS_COMMAND = 'notebook.clear-all-outputs';
    NotebookCommands.EXPORT_COMMAND = 'jupyter.notebookeditor.export';
})(NotebookCommands || (exports.NotebookCommands = NotebookCommands = {}));
class TheiaNotebookEditor extends theia_editor_1.TheiaEditor {
    constructor(filePath, app) {
        // shell-tab-notebook::file://<path>
        // notebook:file://<path>
        super({
            tabSelector: (0, util_1.normalizeId)(`#shell-tab-notebook:${app.workspace.pathAsUrl(filePath)}`),
            viewSelector: (0, util_1.normalizeId)(`#notebook:${app.workspace.pathAsUrl(filePath)}`)
        }, app);
    }
    viewLocator() {
        return this.page.locator(this.data.viewSelector);
    }
    tabLocator() {
        return this.page.locator(this.data.tabSelector);
    }
    async waitForVisible() {
        await super.waitForVisible();
        // wait for toolbar being rendered as it takes some time to load the kernel data.
        await this.notebookToolbar().waitForVisible();
    }
    /**
     * @returns The main toolbar of the notebook editor.
     */
    notebookToolbar() {
        return new theia_notebook_toolbar_1.TheiaNotebookToolbar(this.viewLocator(), this.app);
    }
    /**
     * @returns The name of the selected kernel.
     */
    async selectedKernel() {
        const kernelItem = await this.toolbarItem(NotebookCommands.SELECT_KERNEL_COMMAND);
        if (!kernelItem) {
            throw new Error('Select kernel toolbar item not found.');
        }
        return this.notebookToolbar().locator.locator('#kernel-text').innerText();
    }
    /**
     *  Allows to select a kernel using toolbar item.
     * @param kernelName  The name of the kernel to select.
     */
    async selectKernel(kernelName) {
        await this.triggerToolbarItem(NotebookCommands.SELECT_KERNEL_COMMAND);
        const qInput = new theia_quick_command_palette_1.TheiaQuickCommandPalette(this.app);
        const widget = await this.page.waitForSelector(qInput.selector, { timeout: 5000 });
        if (widget && !await qInput.isOpen()) {
            throw new Error('Failed to trigger kernel selection');
        }
        await qInput.type(kernelName, true);
        await qInput.hide();
    }
    async availableKernels() {
        await this.triggerToolbarItem(NotebookCommands.SELECT_KERNEL_COMMAND);
        const qInput = new theia_quick_command_palette_1.TheiaQuickCommandPalette(this.app);
        const widget = await this.page.waitForSelector(qInput.selector, { timeout: 5000 });
        if (widget && !await qInput.isOpen()) {
            throw new Error('Failed to trigger kernel selection');
        }
        await qInput.type('Python', false);
        try {
            const listItems = await Promise.all((await qInput.visibleItems()).map(async (item) => item.textContent()));
            await this.page.keyboard.press('Enter');
            await qInput.hide();
            return listItems.filter(item => item !== null);
        }
        finally {
            await qInput.hide();
        }
    }
    /**
     * Adds a new code cell to the notebook.
     */
    async addCodeCell() {
        const currentCellsCount = (await this.cells()).length;
        // FIXME Command sometimes produces bogus Editor cell without the monaco editor.
        await this.triggerToolbarItem(NotebookCommands.ADD_NEW_CELL_COMMAND);
        await this.waitForCellCountChanged(currentCellsCount);
    }
    /**
     * Adds a new markdown cell to the notebook.
     */
    async addMarkdownCell() {
        const currentCellsCount = (await this.cells()).length;
        await this.triggerToolbarItem(NotebookCommands.ADD_NEW_MARKDOWN_CELL_COMMAND);
        await this.waitForCellCountChanged(currentCellsCount);
    }
    async waitForCellCountChanged(prevCount) {
        await this.viewLocator().locator('li.theia-notebook-cell').evaluateAll((elements, currentCount) => elements.length !== currentCount, prevCount);
    }
    async executeAllCells() {
        await this.triggerToolbarItem(NotebookCommands.EXECUTE_NOTEBOOK_COMMAND);
    }
    async clearAllOutputs() {
        await this.triggerToolbarItem(NotebookCommands.CLEAR_ALL_OUTPUTS_COMMAND);
    }
    async exportAs() {
        await this.triggerToolbarItem(NotebookCommands.EXPORT_COMMAND);
    }
    async cells() {
        const cellsLocator = this.viewLocator().locator('li.theia-notebook-cell');
        const cells = [];
        for (const cellLocator of await cellsLocator.all()) {
            await cellLocator.waitFor({ state: 'visible' });
            cells.push(new theia_notebook_cell_1.TheiaNotebookCell(cellLocator, this.viewLocator(), this.app));
        }
        return cells;
    }
    async triggerToolbarItem(id) {
        const item = await this.toolbarItem(id);
        if (!item) {
            throw new Error(`Toolbar item with id ${id} not found`);
        }
        await item.trigger();
    }
    async toolbarItem(id) {
        const toolBar = this.notebookToolbar();
        await toolBar.waitForVisible();
        return toolBar.toolBarItem(id);
    }
}
exports.TheiaNotebookEditor = TheiaNotebookEditor;
//# sourceMappingURL=theia-notebook-editor.js.map