"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TheiaNotebookCellEditor = exports.TheiaNotebookCell = void 0;
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
const test_1 = require("@playwright/test");
const theia_monaco_editor_1 = require("./theia-monaco-editor");
const theia_page_object_1 = require("./theia-page-object");
/**
 * Page object for a Theia notebook cell.
 */
class TheiaNotebookCell extends theia_page_object_1.TheiaPageObject {
    constructor(locator, notebookEditorLocator, app) {
        super(app);
        this.locator = locator;
        this.notebookEditorLocator = notebookEditorLocator;
        const editorLocator = locator.locator('div.theia-notebook-cell-editor');
        this.cellEditor = new TheiaNotebookCellEditor(editorLocator, app);
    }
    /**
     * @returns The cell editor page object.
     */
    get editor() {
        return this.cellEditor;
    }
    /**
     * @returns Locator for the sidebar (left) of the cell.
     */
    sidebar() {
        return this.locator.locator('div.theia-notebook-cell-sidebar');
    }
    /**
     * @returns Locator for the toolbar (top) of the cell.
     */
    toolbar() {
        return this.locator.locator('div.theia-notebook-cell-toolbar');
    }
    /**
     * @returns Locator for the statusbar (bottom) of the cell.
     */
    statusbar() {
        return this.locator.locator('div.notebook-cell-status');
    }
    /**
     * @returns Locator for the status icon inside the statusbar of the cell.
     */
    statusIcon() {
        return this.statusbar().locator('span.notebook-cell-status-item');
    }
    /**
     * @returns `true` id the cell is a code cell, `false` otherwise.
     */
    async isCodeCell() {
        const classAttribute = await this.mode();
        return classAttribute !== 'markdown';
    }
    /**
     * @returns The mode of the cell, e.g. 'python', 'markdown', etc.
     */
    async mode() {
        await this.locator.waitFor({ state: 'visible' });
        const editorElement = await this.editor.locator.elementHandle();
        if (editorElement === null) {
            throw new Error('Could not find editor element for the notebook cell.');
        }
        const classAttribute = await editorElement.getAttribute('data-mode-id');
        if (classAttribute === null) {
            throw new Error('Could not find mode attribute for the notebook cell.');
        }
        return classAttribute;
    }
    /**
     * @returns The text content of the cell editor.
     */
    async editorText() {
        return this.editor.monacoEditor.editorText();
    }
    /**
     * Adds text to the editor of the cell.
     * @param text  The text to add to the editor.
     * @param lineNumber  The line number where to add the text. Default is 1.
     */
    async addEditorText(text, lineNumber = 1) {
        await this.editor.monacoEditor.addEditorText(text, lineNumber);
    }
    /**
     * @param wait If `true` waits for the cell to finish execution, otherwise returns immediately.
     */
    async execute(wait = true) {
        const execButton = this.sidebar().locator('[id="notebook.cell.execute-cell"]');
        await execButton.waitFor({ state: 'visible' });
        await execButton.click();
        if (wait) {
            // wait for the cell to finish execution
            await this.waitForCellToFinish();
        }
    }
    /**
     * Splits the cell into two cells by dividing the cell text on current cursor position.
     */
    async splitCell() {
        const execButton = this.toolbar().locator('[id="notebook.cell.split"]');
        await execButton.waitFor({ state: 'visible' });
        await execButton.click();
    }
    /**
     * Deletes the cell.
     */
    async deleteCell() {
        const button = this.toolbar().locator('[id="notebook.cell.delete"]');
        await button.waitFor({ state: 'visible' });
        await button.click();
    }
    /**
     *  Waits for the cell to reach success or error status.
     */
    async waitForCellToFinish() {
        await (0, test_1.expect)(this.statusIcon()).toHaveClass(/(.*codicon-check.*|.*codicon-error.*)/);
    }
    /**
     * @returns The status of the cell. Possible values are 'success', 'error', 'waiting'.
     */
    async status() {
        var _a, _b;
        const statusLocator = this.statusIcon();
        const status = this.toCellStatus((_b = await ((_a = (await statusLocator.elementHandle())) === null || _a === void 0 ? void 0 : _a.getAttribute('class'))) !== null && _b !== void 0 ? _b : '');
        return status;
    }
    toCellStatus(classes) {
        return classes.includes('codicon-check') ? 'success'
            : classes.includes('codicon-error') ? 'error'
                : 'waiting';
    }
    /**
     * @param acceptEmpty If `true`, accepts empty execution count. Otherwise waits for the execution count to be set.
     * @returns The execution count of the cell.
     */
    async executionCount(acceptEmpty = false) {
        const countNode = this.sidebar().locator('span.theia-notebook-code-cell-execution-order');
        await countNode.waitFor({ state: 'visible' });
        await this.waitForCellToFinish();
        // Wait for the execution count to be set.
        await countNode.page().waitForFunction(arg => {
            var _a;
            const text = (_a = arg.ele) === null || _a === void 0 ? void 0 : _a.textContent;
            return text && (arg.acceptEmpty || text !== '[ ]');
        }, { ele: await countNode.elementHandle(), acceptEmpty });
        const counterText = await countNode.textContent();
        return counterText === null || counterText === void 0 ? void 0 : counterText.substring(1, counterText.length - 1); // remove square brackets
    }
    /**
     * @returns `true` if the cell is selected (blue vertical line), `false` otherwise.
     */
    async isSelected() {
        var _a;
        const markerClass = await this.locator.locator('div.theia-notebook-cell-marker').getAttribute('class');
        return (_a = markerClass === null || markerClass === void 0 ? void 0 : markerClass.includes('theia-notebook-cell-marker-selected')) !== null && _a !== void 0 ? _a : false;
    }
    /**
     * @returns The output text of the cell.
     */
    async outputText() {
        const outputContainer = await this.outputContainer();
        await outputContainer.waitFor({ state: 'visible' });
        // By default just collect all spans text.
        const spansLocator = outputContainer.locator('span:not(:has(*))'); // ignore nested spans
        const spanTexts = await spansLocator.evaluateAll(spans => spans.map(span => { var _a; return (_a = span.textContent) === null || _a === void 0 ? void 0 : _a.trim(); })
            .filter(text => text !== undefined && text.length > 0));
        return spanTexts.join('');
    }
    /**
     * Selects the cell itself not it's editor. Important for shortcut usage like copy-, cut-, paste-cell.
     */
    async selectCell() {
        await this.sidebar().click();
    }
    async outputContainer() {
        const outFrame = await this.outputFrame();
        // each cell has it's own output div with a unique id = cellHandle<handle>
        const cellOutput = outFrame.locator(`div#cellHandle${await this.cellHandle()}`);
        return cellOutput.locator('div.output-container');
    }
    async cellHandle() {
        const handle = await this.locator.getAttribute('data-cell-handle');
        if (handle === null) {
            throw new Error('Could not find cell handle attribute `data-cell-handle` for the notebook cell.');
        }
        return handle;
    }
    async outputFrame() {
        const containerDiv = this.notebookEditorLocator.locator('div.theia-notebook-cell-output-webview');
        const webViewFrame = containerDiv.frameLocator('iframe.webview');
        await webViewFrame.locator('iframe').waitFor({ state: 'attached' });
        return webViewFrame.frameLocator('iframe');
    }
}
exports.TheiaNotebookCell = TheiaNotebookCell;
/**
 * Wrapper around the monaco editor inside a notebook cell.
 */
class TheiaNotebookCellEditor extends theia_page_object_1.TheiaPageObject {
    constructor(locator, app) {
        super(app);
        this.locator = locator;
        this.monacoEditor = new theia_monaco_editor_1.TheiaMonacoEditor(locator.locator('.monaco-editor'), app);
    }
    async waitForVisible() {
        await this.locator.waitFor({ state: 'visible' });
    }
    async isVisible() {
        return this.locator.isVisible();
    }
}
exports.TheiaNotebookCellEditor = TheiaNotebookCellEditor;
//# sourceMappingURL=theia-notebook-cell.js.map