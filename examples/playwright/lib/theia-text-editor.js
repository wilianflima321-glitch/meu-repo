"use strict";
// *****************************************************************************
// Copyright (C) 2021 logi.cals GmbH, EclipseSource and others.
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
exports.TheiaTextEditor = void 0;
const theia_editor_1 = require("./theia-editor");
const util_1 = require("./util");
const theia_monaco_editor_1 = require("./theia-monaco-editor");
class TheiaTextEditor extends theia_editor_1.TheiaEditor {
    constructor(filePath, app) {
        // shell-tab-code-editor-opener:file:///c%3A/Users/user/AppData/Local/Temp/cloud-ws-JBUhb6/sample.txt:1
        // code-editor-opener:file:///c%3A/Users/user/AppData/Local/Temp/cloud-ws-JBUhb6/sample.txt:1
        super({
            tabSelector: (0, util_1.normalizeId)(`#shell-tab-code-editor-opener:${app.workspace.pathAsUrl(filePath)}:1`),
            viewSelector: (0, util_1.normalizeId)(`#code-editor-opener:${app.workspace.pathAsUrl(filePath)}:1`) + '.theia-editor'
        }, app);
        this.monacoEditor = new theia_monaco_editor_1.TheiaMonacoEditor(this.page.locator(this.data.viewSelector), app);
    }
    async numberOfLines() {
        await this.activate();
        return this.monacoEditor.numberOfLines();
    }
    async textContentOfLineByLineNumber(lineNumber) {
        return this.monacoEditor.textContentOfLineByLineNumber(lineNumber);
    }
    async replaceLineWithLineNumber(text, lineNumber) {
        await this.selectLineWithLineNumber(lineNumber);
        await this.typeTextAndHitEnter(text);
    }
    async typeTextAndHitEnter(text) {
        await this.page.keyboard.type(text);
        await this.page.keyboard.press('Enter');
    }
    async selectLineWithLineNumber(lineNumber) {
        var _a;
        await this.activate();
        const lineElement = await this.monacoEditor.line(lineNumber);
        await this.selectLine(lineElement);
        return (_a = await lineElement.elementHandle()) !== null && _a !== void 0 ? _a : undefined;
    }
    async placeCursorInLineWithLineNumber(lineNumber) {
        var _a;
        await this.activate();
        const lineElement = await this.monacoEditor.line(lineNumber);
        await this.placeCursorInLine(lineElement);
        return (_a = await lineElement.elementHandle()) !== null && _a !== void 0 ? _a : undefined;
    }
    async deleteLineByLineNumber(lineNumber) {
        await this.selectLineWithLineNumber(lineNumber);
        await this.page.keyboard.press('Backspace');
    }
    async textContentOfLineContainingText(text) {
        await this.activate();
        return this.monacoEditor.textContentOfLineContainingText(text);
    }
    async replaceLineContainingText(newText, oldText) {
        await this.selectLineContainingText(oldText);
        await this.typeTextAndHitEnter(newText);
    }
    async selectLineContainingText(text) {
        var _a;
        await this.activate();
        const lineElement = await this.monacoEditor.lineWithText(text);
        await this.selectLine(lineElement);
        return (_a = await (lineElement === null || lineElement === void 0 ? void 0 : lineElement.elementHandle())) !== null && _a !== void 0 ? _a : undefined;
    }
    async placeCursorInLineContainingText(text) {
        var _a;
        await this.activate();
        const lineElement = await this.monacoEditor.lineWithText(text);
        await this.placeCursorInLine(lineElement);
        return (_a = await (lineElement === null || lineElement === void 0 ? void 0 : lineElement.elementHandle())) !== null && _a !== void 0 ? _a : undefined;
    }
    async deleteLineContainingText(text) {
        await this.selectLineContainingText(text);
        await this.page.keyboard.press('Backspace');
    }
    async addTextToNewLineAfterLineContainingText(textContainedByExistingLine, newText) {
        const existingLine = await this.monacoEditor.lineWithText(textContainedByExistingLine);
        await this.placeCursorInLine(existingLine);
        await this.page.keyboard.press('End');
        await this.page.keyboard.press('Enter');
        await this.page.keyboard.type(newText);
    }
    async addTextToNewLineAfterLineByLineNumber(lineNumber, newText) {
        const existingLine = await this.monacoEditor.line(lineNumber);
        await this.placeCursorInLine(existingLine);
        await this.page.keyboard.press('End');
        await this.page.keyboard.press('Enter');
        await this.page.keyboard.type(newText);
    }
    async selectLine(lineLocator) {
        await (lineLocator === null || lineLocator === void 0 ? void 0 : lineLocator.click({ clickCount: 3 }));
    }
    async placeCursorInLine(lineLocator) {
        await (lineLocator === null || lineLocator === void 0 ? void 0 : lineLocator.click());
    }
    async selectedSuggestion() {
        return this.page.waitForSelector(this.viewSelector + ' .monaco-list-row.show-file-icons.focused');
    }
    async getSelectedSuggestionText() {
        const suggestion = await this.selectedSuggestion();
        const text = await suggestion.textContent();
        if (text === null) {
            throw new Error('Text content could not be found');
        }
        return text;
    }
}
exports.TheiaTextEditor = TheiaTextEditor;
//# sourceMappingURL=theia-text-editor.js.map