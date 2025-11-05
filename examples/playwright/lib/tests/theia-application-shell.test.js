"use strict";
// *****************************************************************************
// Copyright (C) 2023 Toro Cloud Pty Ltd and others.
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
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const path = require("path");
const theia_app_loader_1 = require("../theia-app-loader");
const theia_explorer_view_1 = require("../theia-explorer-view");
const theia_text_editor_1 = require("../theia-text-editor");
const theia_welcome_view_1 = require("../theia-welcome-view");
const theia_workspace_1 = require("../theia-workspace");
test_1.test.describe('Theia Application Shell', () => {
    test_1.test.describe.configure({
        timeout: 120000
    });
    let app;
    test_1.test.beforeAll(async ({ playwright, browser }) => {
        const ws = new theia_workspace_1.TheiaWorkspace([path.resolve(__dirname, '../../src/tests/resources/sample-files1')]);
        app = await theia_app_loader_1.TheiaAppLoader.load({ playwright, browser }, ws);
        // The welcome view must be closed because the memory leak only occurs when there are
        // no tabs left open.
        const welcomeView = new theia_welcome_view_1.TheiaWelcomeView(app);
        if (await welcomeView.isTabVisible()) {
            await welcomeView.close();
        }
    });
    test_1.test.afterAll(async () => {
        await app.page.close();
    });
    /**
     * The aim of this test is to detect memory leaks when opening and closing editors many times.
     * Remove the skip and run the test, check the logs for any memory leak warnings.
     * It should take less than 2min to run, if it takes longer than that, just increase the timeout.
     */
    test_1.test.skip('should open and close a text editor many times', async () => {
        for (let i = 0; i < 200; i++) {
            const explorer = await app.openView(theia_explorer_view_1.TheiaExplorerView);
            const fileStatNode = await explorer.getFileStatNodeByLabel('sample.txt');
            const contextMenu = await fileStatNode.openContextMenu();
            await contextMenu.clickMenuItem('Open');
            const textEditor = new theia_text_editor_1.TheiaTextEditor('sample.txt', app);
            await textEditor.waitForVisible();
            await textEditor.close();
        }
    });
});
//# sourceMappingURL=theia-application-shell.test.js.map