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
const theia_app_loader_1 = require("../theia-app-loader");
const theia_notification_indicator_1 = require("../theia-notification-indicator");
const theia_problem_indicator_1 = require("../theia-problem-indicator");
const theia_toggle_bottom_indicator_1 = require("../theia-toggle-bottom-indicator");
test_1.test.describe('Theia Status Bar', () => {
    let app;
    let statusBar;
    test_1.test.beforeAll(async ({ playwright, browser }) => {
        app = await theia_app_loader_1.TheiaAppLoader.load({ playwright, browser });
        statusBar = app.statusBar;
    });
    test_1.test.afterAll(async () => {
        await app.page.close();
    });
    (0, test_1.test)('should show status bar', async () => {
        (0, test_1.expect)(await statusBar.isVisible()).toBe(true);
    });
    (0, test_1.test)('should contain status bar elements', async () => {
        const problemIndicator = await statusBar.statusIndicator(theia_problem_indicator_1.TheiaProblemIndicator);
        const notificationIndicator = await statusBar.statusIndicator(theia_notification_indicator_1.TheiaNotificationIndicator);
        const toggleBottomIndicator = await statusBar.statusIndicator(theia_toggle_bottom_indicator_1.TheiaToggleBottomIndicator);
        (0, test_1.expect)(await problemIndicator.isVisible()).toBe(true);
        (0, test_1.expect)(await notificationIndicator.isVisible()).toBe(true);
        (0, test_1.expect)(await toggleBottomIndicator.isVisible()).toBe(true);
    });
});
//# sourceMappingURL=theia-status-bar.test.js.map