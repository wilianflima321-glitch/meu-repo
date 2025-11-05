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
const theia_about_dialog_1 = require("../theia-about-dialog");
const util_1 = require("../util");
const theia_explorer_view_1 = require("../theia-explorer-view");
test_1.test.describe('Theia Main Menu', () => {
    let app;
    let menuBar;
    test_1.test.beforeAll(async ({ playwright, browser }) => {
        app = await theia_app_loader_1.TheiaAppLoader.load({ playwright, browser });
        menuBar = app.menuBar;
    });
    test_1.test.afterAll(async () => {
        await app.page.close();
    });
    (0, test_1.test)('should show the main menu bar', async () => {
        const menuBarItems = await menuBar.visibleMenuBarItems();
        (0, test_1.expect)(menuBarItems).toContain('File');
        (0, test_1.expect)(menuBarItems).toContain('Edit');
        (0, test_1.expect)(menuBarItems).toContain('Help');
    });
    (0, test_1.test)("should open main menu 'File'", async () => {
        const mainMenu = await menuBar.openMenu('File');
        (0, test_1.expect)(await mainMenu.isOpen()).toBe(true);
    });
    (0, test_1.test)("should show the menu items 'New Text File' and 'New Folder'", async () => {
        const mainMenu = await menuBar.openMenu('File');
        const menuItems = await mainMenu.visibleMenuItems();
        (0, test_1.expect)(menuItems).toContain('New Text File');
        (0, test_1.expect)(menuItems).toContain('New Folder...');
    });
    (0, test_1.test)("should return menu item by name 'New Text File'", async () => {
        const mainMenu = await menuBar.openMenu('File');
        const menuItem = await mainMenu.menuItemByName('New Text File');
        (0, test_1.expect)(menuItem).toBeDefined();
        const label = await (menuItem === null || menuItem === void 0 ? void 0 : menuItem.label());
        (0, test_1.expect)(label).toBe('New Text File');
        const shortCut = await (menuItem === null || menuItem === void 0 ? void 0 : menuItem.shortCut());
        (0, test_1.expect)(shortCut).toBe(util_1.OSUtil.isMacOS ? '⌥ N' : app.isElectron ? 'Ctrl+N' : 'Alt+N');
        const hasSubmenu = await (menuItem === null || menuItem === void 0 ? void 0 : menuItem.hasSubmenu());
        (0, test_1.expect)(hasSubmenu).toBe(false);
    });
    (0, test_1.test)('should detect whether menu item has submenu', async () => {
        const mainMenu = await menuBar.openMenu('File');
        const newFileItem = await mainMenu.menuItemByName('New Text File');
        const settingsItem = await mainMenu.menuItemByName('Preferences');
        (0, test_1.expect)(await (newFileItem === null || newFileItem === void 0 ? void 0 : newFileItem.hasSubmenu())).toBe(false);
        (0, test_1.expect)(await (settingsItem === null || settingsItem === void 0 ? void 0 : settingsItem.hasSubmenu())).toBe(true);
    });
    (0, test_1.test)('should be able to show menu item in submenu by path', async () => {
        const mainMenu = await menuBar.openMenu('File');
        const openPreferencesItem = await mainMenu.menuItemByNamePath('Preferences', 'Settings');
        const label = await (openPreferencesItem === null || openPreferencesItem === void 0 ? void 0 : openPreferencesItem.label());
        (0, test_1.expect)(label).toBe('Settings');
    });
    (0, test_1.test)('should close main menu', async () => {
        const mainMenu = await menuBar.openMenu('File');
        await mainMenu.close();
        (0, test_1.expect)(await mainMenu.isOpen()).toBe(false);
    });
    (0, test_1.test)('open about dialog using menu', async () => {
        await (await menuBar.openMenu('Help')).clickMenuItem('About');
        const aboutDialog = new theia_about_dialog_1.TheiaAboutDialog(app);
        (0, test_1.expect)(await aboutDialog.isVisible()).toBe(true);
        await aboutDialog.page.locator('#theia-dialog-shell').getByRole('button', { name: 'OK' }).click();
        (0, test_1.expect)(await aboutDialog.isVisible()).toBe(false);
    });
    (0, test_1.test)('open file via file menu and cancel', async () => {
        const openFileEntry = app.isElectron ? 'Open File...' : 'Open...';
        await (await menuBar.openMenu('File')).clickMenuItem(openFileEntry);
        const fileDialog = await app.page.waitForSelector('div[class="dialogBlock"]');
        (0, test_1.expect)(await fileDialog.isVisible()).toBe(true);
        await app.page.locator('#theia-dialog-shell').getByRole('button', { name: 'Cancel' }).click();
        (0, test_1.expect)(await fileDialog.isVisible()).toBe(false);
    });
    (0, test_1.test)('Create file via New File menu and accept', async () => {
        await (await menuBar.openMenu('File')).clickMenuItem('New File...');
        const quickPick = app.page.getByPlaceholder('Select File Type or Enter');
        // type file name and press enter
        await quickPick.fill('test.txt');
        await quickPick.press('Enter');
        // check file dialog is opened and accept with ENTER
        const fileDialog = await app.page.waitForSelector('div[class="dialogBlock"]');
        (0, test_1.expect)(await fileDialog.isVisible()).toBe(true);
        await app.page.locator('#theia-dialog-shell').press('Enter');
        (0, test_1.expect)(await fileDialog.isVisible()).toBe(false);
        // check file in workspace exists
        const explorer = await app.openView(theia_explorer_view_1.TheiaExplorerView);
        await explorer.refresh();
        await explorer.waitForVisibleFileNodes();
        (0, test_1.expect)(await explorer.existsFileNode('test.txt')).toBe(true);
    });
});
//# sourceMappingURL=theia-main-menu.test.js.map