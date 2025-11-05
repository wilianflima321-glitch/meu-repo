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
const test_1 = require("@playwright/test");
const path = require("path");
const theia_app_loader_1 = require("../theia-app-loader");
const theia_preference_view_1 = require("../theia-preference-view");
const theia_text_editor_1 = require("../theia-text-editor");
const theia_workspace_1 = require("../theia-workspace");
test_1.test.describe('Theia Text Editor', () => {
    let app;
    test_1.test.beforeAll(async ({ playwright, browser }) => {
        const ws = new theia_workspace_1.TheiaWorkspace([path.resolve(__dirname, '../../src/tests/resources/sample-files1')]);
        app = await theia_app_loader_1.TheiaAppLoader.load({ playwright, browser }, ws);
        // set auto-save preference to off
        const preferenceView = await app.openPreferences(theia_preference_view_1.TheiaPreferenceView);
        await preferenceView.setOptionsPreferenceById(theia_preference_view_1.PreferenceIds.Editor.AutoSave, theia_preference_view_1.DefaultPreferences.Editor.AutoSave.Off);
        await preferenceView.close();
    });
    test_1.test.afterAll(async () => {
        await app.page.close();
    });
    (0, test_1.test)('should be visible and active after opening "sample.txt"', async () => {
        const sampleTextEditor = await app.openEditor('sample.txt', theia_text_editor_1.TheiaTextEditor);
        (0, test_1.expect)(await sampleTextEditor.isTabVisible()).toBe(true);
        (0, test_1.expect)(await sampleTextEditor.isDisplayed()).toBe(true);
        (0, test_1.expect)(await sampleTextEditor.isActive()).toBe(true);
    });
    (0, test_1.test)('should be possible to open "sample.txt" when already opened and then close it', async () => {
        const sampleTextEditor = await app.openEditor('sample.txt', theia_text_editor_1.TheiaTextEditor);
        (0, test_1.expect)(await sampleTextEditor.isTabVisible()).toBe(true);
        await sampleTextEditor.close();
        (0, test_1.expect)(await sampleTextEditor.isTabVisible()).toBe(false);
    });
    (0, test_1.test)('should be possible to open four text editors, switch among them, and close them', async () => {
        const textEditor1_1_1 = await app.openEditor('sampleFolder/sampleFolder1/sampleFolder1-1/sampleFile1-1-1.txt', theia_text_editor_1.TheiaTextEditor);
        const textEditor1_1_2 = await app.openEditor('sampleFolder/sampleFolder1/sampleFolder1-1/sampleFile1-1-2.txt', theia_text_editor_1.TheiaTextEditor);
        const textEditor1_2_1 = await app.openEditor('sampleFolder/sampleFolder1/sampleFolder1-2/sampleFile1-2-1.txt', theia_text_editor_1.TheiaTextEditor);
        const textEditor1_2_2 = await app.openEditor('sampleFolder/sampleFolder1/sampleFolder1-2/sampleFile1-2-2.txt', theia_text_editor_1.TheiaTextEditor);
        const allEditors = [textEditor1_1_1, textEditor1_1_2, textEditor1_2_1, textEditor1_2_2];
        // all editor tabs should be visible
        for (const editor of allEditors) {
            (0, test_1.expect)(await editor.isTabVisible()).toBe(true);
        }
        // activate one editor after the other and check that only this editor is active
        for (const editor of allEditors) {
            await editor.activate();
            (0, test_1.expect)(await textEditor1_1_1.isActive()).toBe(textEditor1_1_1 === editor);
            (0, test_1.expect)(await textEditor1_1_2.isActive()).toBe(textEditor1_1_2 === editor);
            (0, test_1.expect)(await textEditor1_2_1.isActive()).toBe(textEditor1_2_1 === editor);
            (0, test_1.expect)(await textEditor1_2_2.isActive()).toBe(textEditor1_2_2 === editor);
        }
        // close all editors
        for (const editor of allEditors) {
            await editor.activate();
            await editor.close();
        }
        // check that all editors are closed
        for (const editor of allEditors) {
            (0, test_1.expect)(await editor.isTabVisible()).toBe(false);
        }
    });
    (0, test_1.test)('should return the contents of lines by line number', async () => {
        const sampleTextEditor = await app.openEditor('sample.txt', theia_text_editor_1.TheiaTextEditor);
        (0, test_1.expect)(await sampleTextEditor.textContentOfLineByLineNumber(2)).toBe('content line 2');
        (0, test_1.expect)(await sampleTextEditor.textContentOfLineByLineNumber(3)).toBe('content line 3');
        (0, test_1.expect)(await sampleTextEditor.textContentOfLineByLineNumber(4)).toBe('content line 4');
        await sampleTextEditor.close();
    });
    (0, test_1.test)('should return the contents of lines containing text', async () => {
        const sampleTextEditor = await app.openEditor('sample.txt', theia_text_editor_1.TheiaTextEditor);
        (0, test_1.expect)(await sampleTextEditor.textContentOfLineContainingText('line 2')).toBe('content line 2');
        (0, test_1.expect)(await sampleTextEditor.textContentOfLineContainingText('line 3')).toBe('content line 3');
        (0, test_1.expect)(await sampleTextEditor.textContentOfLineContainingText('line 4')).toBe('content line 4');
        await sampleTextEditor.close();
    });
    (0, test_1.test)('should be dirty after changing the file contents and clean after save', async () => {
        const sampleTextEditor = await app.openEditor('sample.txt', theia_text_editor_1.TheiaTextEditor);
        await sampleTextEditor.replaceLineWithLineNumber('this is just a sample file', 1);
        (0, test_1.expect)(await sampleTextEditor.isDirty()).toBe(true);
        await sampleTextEditor.save();
        (0, test_1.expect)(await sampleTextEditor.isDirty()).toBe(false);
        await sampleTextEditor.close();
    });
    (0, test_1.test)('should replace the line with line number 2 with new text "new -- content line 2 -- new"', async () => {
        const sampleTextEditor = await app.openEditor('sample.txt', theia_text_editor_1.TheiaTextEditor);
        await sampleTextEditor.replaceLineWithLineNumber('new -- content line 2 -- new', 2);
        (0, test_1.expect)(await sampleTextEditor.textContentOfLineByLineNumber(2)).toBe('new -- content line 2 -- new');
        (0, test_1.expect)(await sampleTextEditor.isDirty()).toBe(true);
        await sampleTextEditor.save();
        (0, test_1.expect)(await sampleTextEditor.isDirty()).toBe(false);
        await sampleTextEditor.close();
    });
    (0, test_1.test)('should replace the line with containing text "content line 2" with "even newer -- content line 2 -- even newer"', async () => {
        const sampleTextEditor = await app.openEditor('sample.txt', theia_text_editor_1.TheiaTextEditor);
        await sampleTextEditor.replaceLineContainingText('even newer -- content line 2 -- even newer', 'content line 2');
        (0, test_1.expect)(await sampleTextEditor.textContentOfLineByLineNumber(2)).toBe('even newer -- content line 2 -- even newer');
        await sampleTextEditor.saveAndClose();
    });
    (0, test_1.test)('should delete the line with containing text "content line 2"', async () => {
        const sampleTextEditor = await app.openEditor('sample.txt', theia_text_editor_1.TheiaTextEditor);
        await sampleTextEditor.deleteLineContainingText('content line 2');
        (0, test_1.expect)(await sampleTextEditor.textContentOfLineByLineNumber(2)).toBe('content line 3');
        await sampleTextEditor.saveAndClose();
    });
    (0, test_1.test)('should delete the line with line number 2', async () => {
        const sampleTextEditor = await app.openEditor('sample.txt', theia_text_editor_1.TheiaTextEditor);
        const lineBelowSecond = await sampleTextEditor.textContentOfLineByLineNumber(3);
        await sampleTextEditor.deleteLineByLineNumber(2);
        (0, test_1.expect)(await sampleTextEditor.textContentOfLineByLineNumber(2)).toBe(lineBelowSecond);
        await sampleTextEditor.saveAndClose();
    });
    (0, test_1.test)('should have more lines after adding text in new line after line containing text "sample file"', async () => {
        const sampleTextEditor = await app.openEditor('sample.txt', theia_text_editor_1.TheiaTextEditor);
        const numberOfLinesBefore = await sampleTextEditor.numberOfLines();
        await sampleTextEditor.addTextToNewLineAfterLineContainingText('sample file', 'new content for line 2');
        const numberOfLinesAfter = await sampleTextEditor.numberOfLines();
        (0, test_1.expect)(numberOfLinesBefore).not.toBeUndefined();
        (0, test_1.expect)(numberOfLinesAfter).not.toBeUndefined();
        (0, test_1.expect)(numberOfLinesAfter).toBeGreaterThan(numberOfLinesBefore);
        await sampleTextEditor.saveAndClose();
    });
    (0, test_1.test)('should undo and redo text changes with correctly updated dirty states', async () => {
        const sampleTextEditor = await app.openEditor('sample.txt', theia_text_editor_1.TheiaTextEditor);
        await sampleTextEditor.replaceLineWithLineNumber('change', 1);
        (0, test_1.expect)(await sampleTextEditor.textContentOfLineByLineNumber(1)).toBe('change');
        (0, test_1.expect)(await sampleTextEditor.isDirty()).toBe(true);
        await sampleTextEditor.undo(2);
        (0, test_1.expect)(await sampleTextEditor.textContentOfLineByLineNumber(1)).toBe('this is just a sample file');
        (0, test_1.expect)(await sampleTextEditor.isDirty()).toBe(false);
        await sampleTextEditor.redo(2);
        (0, test_1.expect)(await sampleTextEditor.textContentOfLineByLineNumber(1)).toBe('change');
        (0, test_1.expect)(await sampleTextEditor.isDirty()).toBe(true);
        await sampleTextEditor.saveAndClose();
    });
    (0, test_1.test)('should close without saving', async () => {
        const sampleTextEditor = await app.openEditor('sample.txt', theia_text_editor_1.TheiaTextEditor);
        await sampleTextEditor.replaceLineWithLineNumber('change again', 1);
        (0, test_1.expect)(await sampleTextEditor.isDirty()).toBe(true);
        (0, test_1.expect)(await sampleTextEditor.isTabVisible()).toBe(true);
        await sampleTextEditor.closeWithoutSave();
        (0, test_1.expect)(await sampleTextEditor.isTabVisible()).toBe(false);
    });
});
//# sourceMappingURL=theia-text-editor.test.js.map