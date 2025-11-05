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
const test_1 = require("@playwright/test");
const path = require("path");
const theia_app_loader_1 = require("../theia-app-loader");
const theia_notebook_editor_1 = require("../theia-notebook-editor");
const theia_workspace_1 = require("../theia-workspace");
// See .github/workflows/playwright.yml for preferred python version
const preferredKernel = process.env.CI ? 'Python 3.13' : 'Python 3';
async function ensureKernelSelected(editor) {
    const selectedKernel = await editor.selectedKernel();
    if ((selectedKernel === null || selectedKernel === void 0 ? void 0 : selectedKernel.match(new RegExp(`^${preferredKernel}`))) === null) {
        await editor.selectKernel(preferredKernel);
    }
}
async function closeEditorWithoutSave(editor) {
    if (await editor.isDirty()) {
        await editor.closeWithoutSave();
    }
    else {
        await editor.close();
    }
}
test_1.test.describe('Python Kernel Installed', () => {
    let app;
    let editor;
    test_1.test.beforeAll(async ({ playwright, browser }) => {
        app = await loadApp({ playwright, browser });
    });
    test_1.test.beforeEach(async () => {
        editor = await app.openEditor('sample.ipynb', theia_notebook_editor_1.TheiaNotebookEditor);
    });
    test_1.test.afterAll(async () => {
        if (app.page) {
            await app.page.close();
        }
    });
    test_1.test.afterEach(async () => {
        await closeEditorWithoutSave(editor);
    });
    (0, test_1.test)('kernels are installed', async () => {
        const kernels = await editor.availableKernels();
        const msg = `Available kernels:\n ${kernels.join('\n')}`;
        console.log(msg); // Print available kernels, useful when running in CI.
        (0, test_1.expect)(kernels.length, msg).toBeGreaterThan(0);
        const py3kernel = kernels.filter(kernel => kernel.match(new RegExp(`^${preferredKernel}`)));
        (0, test_1.expect)(py3kernel.length, msg).toBeGreaterThan(0);
    });
    (0, test_1.test)('should select a kernel', async () => {
        await editor.selectKernel(preferredKernel);
        const selectedKernel = await editor.selectedKernel();
        (0, test_1.expect)(selectedKernel).toMatch(new RegExp(`^${preferredKernel}`));
    });
});
test_1.test.describe('Theia Notebook Editor interaction', () => {
    let app;
    let editor;
    test_1.test.beforeAll(async ({ playwright, browser }) => {
        app = await loadApp({ playwright, browser });
    });
    test_1.test.beforeEach(async () => {
        editor = await app.openEditor('sample.ipynb', theia_notebook_editor_1.TheiaNotebookEditor);
        await ensureKernelSelected(editor);
    });
    test_1.test.afterAll(async () => {
        if (app.page) {
            await app.page.close();
        }
    });
    test_1.test.afterEach(async () => {
        await closeEditorWithoutSave(editor);
    });
    (0, test_1.test)('should add a new code cell', async () => {
        await editor.addCodeCell();
        const cells = await editor.cells();
        (0, test_1.expect)(cells.length).toBe(2);
        (0, test_1.expect)(await cells[1].mode()).toBe('python');
    });
    (0, test_1.test)('should add a new markdown cell', async () => {
        await editor.addMarkdownCell();
        await (await editor.cells())[1].addEditorText('print("markdown")');
        const cells = await editor.cells();
        (0, test_1.expect)(cells.length).toBe(2);
        (0, test_1.expect)(await cells[1].mode()).toBe('markdown');
        (0, test_1.expect)(await cells[1].editorText()).toBe('print("markdown")');
    });
    (0, test_1.test)('should execute all cells', async () => {
        const cell = await firstCell(editor);
        await cell.addEditorText('print("Hallo Notebook!")');
        await editor.addCodeCell();
        const secondCell = (await editor.cells())[1];
        await secondCell.addEditorText('print("Bye Notebook!")');
        await editor.executeAllCells();
        (0, test_1.expect)(await cell.outputText()).toBe('Hallo Notebook!');
        (0, test_1.expect)(await secondCell.outputText()).toBe('Bye Notebook!');
    });
    (0, test_1.test)('should split cell', async () => {
        const cell = await firstCell(editor);
        /*
        Add cell text:
        print("Line-1")
        print("Line-2")
        */
        await cell.addEditorText('print("Line-1")\nprint("Line-2")');
        /*
        Set cursor:
        print("Line-1")
        <|>print("Line-2")
        */
        const line = await cell.editor.monacoEditor.line(1);
        (0, test_1.expect)(line, { message: 'Line number 1 should exists' }).toBeDefined();
        await line.click();
        await line.press('ArrowRight');
        // split cell
        await cell.splitCell();
        // expect two cells with text "print("Line-1")" and "print("Line-2")"
        (0, test_1.expect)(await editor.cells()).toHaveLength(2);
        (0, test_1.expect)(await (await editor.cells())[0].editorText()).toBe('print("Line-1")');
        (0, test_1.expect)(await (await editor.cells())[1].editorText()).toBe('print("Line-2")');
    });
});
test_1.test.describe('Theia Notebook Cell interaction', () => {
    let app;
    let editor;
    test_1.test.beforeAll(async ({ playwright, browser }) => {
        app = await loadApp({ playwright, browser });
    });
    test_1.test.afterAll(async () => {
        if (app.page) {
            await app.page.close();
        }
    });
    test_1.test.beforeEach(async () => {
        editor = await app.openEditor('sample.ipynb', theia_notebook_editor_1.TheiaNotebookEditor);
        await ensureKernelSelected(editor);
    });
    test_1.test.afterEach(async () => {
        await closeEditorWithoutSave(editor);
    });
    (0, test_1.test)('should write text in a code cell', async () => {
        const cell = await firstCell(editor);
        // assume the first cell is a code cell
        (0, test_1.expect)(await cell.isCodeCell()).toBe(true);
        await cell.addEditorText('print("Hallo")');
        const cellText = await cell.editorText();
        (0, test_1.expect)(cellText).toBe('print("Hallo")');
    });
    (0, test_1.test)('should write multi-line text in a code cell', async () => {
        const cell = await firstCell(editor);
        await cell.addEditorText('print("Hallo")\nprint("Notebook")');
        const cellText = await cell.editorText();
        (0, test_1.expect)(cellText).toBe('print("Hallo")\nprint("Notebook")');
    });
    (0, test_1.test)('Execute code cell and read output', async () => {
        const cell = await firstCell(editor);
        await cell.addEditorText('print("Hallo Notebook!")');
        await cell.execute();
        const cellOutput = await cell.outputText();
        (0, test_1.expect)(cellOutput).toBe('Hallo Notebook!');
    });
    (0, test_1.test)('Check execution count matches', async () => {
        const cell = await firstCell(editor);
        await cell.addEditorText('print("Hallo Notebook!")');
        await cell.execute();
        await cell.execute();
        await cell.execute();
        (0, test_1.expect)(await cell.executionCount()).toBe('3');
    });
    (0, test_1.test)('Check arrow up and down works', async () => {
        const cell = await firstCell(editor);
        await editor.addCodeCell();
        const secondCell = (await editor.cells())[1];
        // second cell is selected after creation
        (0, test_1.expect)(await secondCell.isSelected()).toBe(true);
        // select cell above
        await editor.page.keyboard.type('second cell');
        await secondCell.editor.page.keyboard.press('ArrowUp');
        (0, test_1.expect)(await cell.isSelected()).toBe(true);
        // select cell below
        await cell.app.page.keyboard.press('ArrowDown');
        (0, test_1.expect)(await secondCell.isSelected()).toBe(true);
    });
    (0, test_1.test)('Check k(up)/j(down) selection works', async () => {
        const cell = await firstCell(editor);
        await editor.addCodeCell();
        const secondCell = (await editor.cells())[1];
        // second cell is selected after creation
        (0, test_1.expect)(await secondCell.isSelected()).toBe(true);
        // deselect editor focus and focus the whole cell
        await secondCell.selectCell();
        // select cell above
        await secondCell.editor.page.keyboard.press('k');
        (0, test_1.expect)(await cell.isSelected()).toBe(true);
        // select cell below
        await cell.app.page.keyboard.press('j');
        (0, test_1.expect)(await secondCell.isSelected()).toBe(true);
    });
    (0, test_1.test)('Check x/c/v works', async () => {
        const cell = await firstCell(editor);
        await cell.addEditorText('print("First cell")');
        // add and fill second cell
        await editor.addCodeCell();
        // TODO workaround for create command bug.
        // The first time created cell doesn't contain a monaco-editor child div.
        await ((await editor.cells())[1]).deleteCell();
        await editor.addCodeCell();
        const secondCell = (await editor.cells())[1];
        await secondCell.locator.waitFor({ state: 'visible' });
        await secondCell.addEditorText('print("Second cell")');
        await secondCell.selectCell(); // deselect editor focus
        // cut second cell
        await secondCell.page.keyboard.press('x');
        await editor.waitForCellCountChanged(2);
        (0, test_1.expect)((await editor.cells()).length).toBe(1);
        // paste second cell
        await cell.selectCell();
        await cell.page.keyboard.press('v');
        await editor.waitForCellCountChanged(1);
        (0, test_1.expect)((await editor.cells()).length).toBe(2);
        const pastedCell = (await editor.cells())[1];
        (0, test_1.expect)(await pastedCell.isSelected()).toBe(true);
        // copy first cell
        await cell.selectCell(); // deselect editor focus
        await cell.page.keyboard.press('c');
        // paste copied cell
        await cell.page.keyboard.press('v');
        await editor.waitForCellCountChanged(2);
        (0, test_1.expect)((await editor.cells()).length).toBe(3);
        (0, test_1.expect)(await (await editor.cells())[0].editorText()).toBe('print("First cell")');
        (0, test_1.expect)(await (await editor.cells())[1].editorText()).toBe('print("First cell")');
        (0, test_1.expect)(await (await editor.cells())[2].editorText()).toBe('print("Second cell")');
        (0, test_1.expect)(await editor.isDirty()).toBe(true); // ensure editor is dirty after copy/paste
    });
    (0, test_1.test)('Check LineNumber switch `l` works', async () => {
        const cell = await firstCell(editor);
        await cell.addEditorText('print("First cell")');
        await cell.selectCell();
        await cell.page.keyboard.press('l');
        // NOTE: div.line-numbers is not visible
        await cell.editor.locator.locator('.overflow-guard > div.line-numbers').waitFor({ state: 'attached' });
    });
    (0, test_1.test)('Check Collapse output switch `o` works', async () => {
        const cell = await firstCell(editor);
        await cell.addEditorText('print("Check output collapse")');
        await cell.selectCell();
        await cell.execute(); // produce output
        (0, test_1.expect)(await cell.outputText()).toBe('Check output collapse');
        await cell.page.keyboard.press('o');
        await (await cell.outputContainer()).waitFor({ state: 'hidden' });
        await cell.page.keyboard.press('o');
        await (await cell.outputContainer()).waitFor({ state: 'visible' });
        (0, test_1.expect)(await cell.outputText()).toBe('Check output collapse');
    });
    (0, test_1.test)('Check arrow-up/arrow-down/escape with code completion', async () => {
        await editor.addMarkdownCell();
        const mdCell = (await editor.cells())[1];
        await mdCell.addEditorText('h');
        await editor.page.keyboard.press('Control+Space'); // call CC (suggestWidgetVisible=true)
        await ensureCodeCompletionVisible(mdCell.editor.locator);
        await editor.page.keyboard.press('Escape'); // close CC
        // check the same cell still selected and not lose the edit mode
        (0, test_1.expect)(await mdCell.editor.monacoEditor.isFocused()).toBe(true);
        await editor.page.keyboard.press('Control+Space'); // call CC (suggestWidgetVisible=true)
        await ensureCodeCompletionVisible(mdCell.editor.locator);
        await editor.page.keyboard.press('ArrowUp'); // select next entry in CC list
        await editor.page.keyboard.press('Enter'); // apply completion
        // check the same cell still selected and not the second one due to 'ArrowDown' being pressed
        (0, test_1.expect)(await mdCell.isSelected()).toBe(true);
    });
});
async function ensureCodeCompletionVisible(parent) {
    await parent.locator('div.monaco-editor div.suggest-widget').waitFor({ timeout: 5000 });
}
async function firstCell(editor) {
    return (await editor.cells())[0];
}
async function loadApp(args) {
    const ws = new theia_workspace_1.TheiaWorkspace([path.resolve(__dirname, '../../src/tests/resources/notebook-files')]);
    const app = await theia_app_loader_1.TheiaAppLoader.load(args, ws);
    // auto-save are disabled using settings.json file
    // see examples/playwright/src/tests/resources/notebook-files/.theia/settings.json
    // NOTE: Workspace trust is disabled in examples/browser/package.json using default preferences.
    // If workspace trust check is on, python extension will not be able to explore Python installations.
    return app;
}
//# sourceMappingURL=theia-notebook-editor.test.js.map