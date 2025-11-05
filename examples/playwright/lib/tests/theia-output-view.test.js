"use strict";
// *****************************************************************************
// Copyright (C) 2023 EclipseSource and others.
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
const theia_app_loader_1 = require("../theia-app-loader");
const theia_output_view_1 = require("../theia-output-view");
let app;
let outputView;
let testChannel;
test_1.test.describe('Theia Output View', () => {
    test_1.test.beforeAll(async ({ playwright, browser }) => {
        app = await theia_app_loader_1.TheiaAppLoader.load({ playwright, browser });
    });
    test_1.test.afterAll(async () => {
        await app.page.close();
    });
    (0, test_1.test)('should open the output view and check if is visible and active', async () => {
        outputView = await app.openView(theia_output_view_1.TheiaOutputView);
        (0, test_1.expect)(await outputView.isTabVisible()).toBe(true);
        (0, test_1.expect)(await outputView.isDisplayed()).toBe(true);
        (0, test_1.expect)(await outputView.isActive()).toBe(true);
    });
    (0, test_1.test)('should be opened at the bottom and have the title "Output"', async () => {
        (0, test_1.expect)(await outputView.isInSidePanel()).toBe(false);
        (0, test_1.expect)(await outputView.side()).toBe('bottom');
        (0, test_1.expect)(await outputView.title()).toBe('Output');
    });
    (0, test_1.test)('should be closable', async () => {
        (0, test_1.expect)(await outputView.isClosable()).toBe(true);
        await outputView.close();
        (0, test_1.expect)(await outputView.isTabVisible()).toBe(false);
        (0, test_1.expect)(await outputView.isDisplayed()).toBe(false);
        (0, test_1.expect)(await outputView.isActive()).toBe(false);
    });
    (0, test_1.test)('should select a test output channel', async () => {
        outputView = await app.openView(theia_output_view_1.TheiaOutputView);
        (0, test_1.expect)(await outputView.isTabVisible()).toBe(true);
        (0, test_1.expect)(await outputView.isDisplayed()).toBe(true);
        (0, test_1.expect)(await outputView.isActive()).toBe(true);
        const testChannelName = 'API Sample: my test channel';
        (0, test_1.expect)(await outputView.selectOutputChannel(testChannelName)).toBe(true);
    });
    (0, test_1.test)('should check if the output view of the test output channel', async () => {
        const testChannelName = 'API Sample: my test channel';
        (0, test_1.expect)(await outputView.isOutputChannelSelected(testChannelName));
        const channel = await outputView.getOutputChannel(testChannelName);
        (0, test_1.expect)(channel).toBeDefined;
        testChannel = channel;
        (0, test_1.expect)(await testChannel.isDisplayed()).toBe(true);
    });
    (0, test_1.test)('should check if the output view test channel shows the test output', async () => {
        (0, test_1.expect)(await testChannel.numberOfLines()).toBe(5);
        (0, test_1.expect)(await testChannel.textContentOfLineByLineNumber(1)).toMatch('hello info1');
        (0, test_1.expect)(await testChannel.maxSeverityOfLineByLineNumber(1)).toMatch('info');
        (0, test_1.expect)(await testChannel.textContentOfLineByLineNumber(2)).toMatch('hello info2');
        (0, test_1.expect)(await testChannel.maxSeverityOfLineByLineNumber(2)).toMatch('info');
        (0, test_1.expect)(await testChannel.textContentOfLineByLineNumber(3)).toMatch('hello error');
        (0, test_1.expect)(await testChannel.maxSeverityOfLineByLineNumber(3)).toMatch('error');
        (0, test_1.expect)(await testChannel.textContentOfLineByLineNumber(4)).toMatch('hello warning');
        (0, test_1.expect)(await testChannel.maxSeverityOfLineByLineNumber(4)).toMatch('warning');
        (0, test_1.expect)(await testChannel.textContentOfLineByLineNumber(5)).toMatch('inlineInfo1 inlineWarning inlineError inlineInfo2');
        (0, test_1.expect)(await testChannel.maxSeverityOfLineByLineNumber(5)).toMatch('error');
    });
});
//# sourceMappingURL=theia-output-view.test.js.map