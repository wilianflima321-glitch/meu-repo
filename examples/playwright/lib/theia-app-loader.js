"use strict";
// *****************************************************************************
// Copyright (C) 2022 STMicroelectronics and others.
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
exports.TheiaAppLoader = void 0;
const test_1 = require("@playwright/test");
const theia_app_1 = require("./theia-app");
const theia_workspace_1 = require("./theia-workspace");
function theiaAppFactory(factory) {
    return (factory !== null && factory !== void 0 ? factory : theia_app_1.TheiaApp);
}
function initializeWorkspace(initialWorkspace) {
    const workspace = initialWorkspace ? initialWorkspace : new theia_workspace_1.TheiaWorkspace();
    workspace.initialize();
    return workspace;
}
var TheiaBrowserAppLoader;
(function (TheiaBrowserAppLoader) {
    async function load(page, initialWorkspace, factory) {
        const workspace = initializeWorkspace(initialWorkspace);
        return createAndLoad(page, workspace, factory);
    }
    TheiaBrowserAppLoader.load = load;
    async function createAndLoad(page, workspace, factory) {
        const appFactory = theiaAppFactory(factory);
        const app = new appFactory(page, workspace, false);
        await loadOrReload(app, '/#' + app.workspace.pathAsPathComponent);
        await app.waitForShellAndInitialized();
        return app;
    }
    async function loadOrReload(app, url) {
        if (app.page.url() === url) {
            await app.page.reload();
        }
        else {
            const wasLoadedAlready = await app.isShellVisible();
            await app.page.goto(url);
            if (wasLoadedAlready) {
                // Theia doesn't refresh on URL change only
                // So we need to reload if the app was already loaded before
                await app.page.reload();
            }
        }
    }
})(TheiaBrowserAppLoader || (TheiaBrowserAppLoader = {}));
var TheiaElectronAppLoader;
(function (TheiaElectronAppLoader) {
    async function load(args, initialWorkspace, factory) {
        var _a, _b;
        const workspace = initializeWorkspace(initialWorkspace);
        const electronConfig = (_a = args.useElectron) !== null && _a !== void 0 ? _a : {
            electronAppPath: '../electron',
            pluginsPath: '../../plugins'
        };
        if (electronConfig === undefined || electronConfig.launchOptions === undefined && electronConfig.electronAppPath === undefined) {
            throw Error('The Theia Playwright configuration must either specify `useElectron.electronAppPath` or `useElectron.launchOptions`');
        }
        const appPath = electronConfig.electronAppPath;
        const pluginsPath = electronConfig.pluginsPath;
        const launchOptions = (_b = electronConfig.launchOptions) !== null && _b !== void 0 ? _b : {
            additionalArgs: ['--no-sandbox', '--no-cluster'],
            electronAppPath: appPath,
            pluginsPath: pluginsPath
        };
        const playwrightOptions = toPlaywrightOptions(launchOptions, workspace);
        console.log(`Launching Electron with options: ${JSON.stringify(playwrightOptions)}`);
        const electronApp = await test_1._electron.launch(playwrightOptions);
        const page = await electronApp.firstWindow();
        const appFactory = theiaAppFactory(factory);
        const app = new appFactory(page, workspace, true);
        await app.waitForShellAndInitialized();
        return app;
    }
    TheiaElectronAppLoader.load = load;
    function toPlaywrightOptions(electronLaunchOptions, workspace) {
        if ('additionalArgs' in electronLaunchOptions && 'electronAppPath' in electronLaunchOptions) {
            const args = [
                electronLaunchOptions.electronAppPath,
                ...electronLaunchOptions.additionalArgs,
                `--app-project-path=${electronLaunchOptions.electronAppPath}`
            ];
            if (electronLaunchOptions.pluginsPath) {
                args.push(`--plugins=local-dir:${electronLaunchOptions.pluginsPath}`);
            }
            if (workspace) {
                args.push(workspace.path);
            }
            return {
                args: args
            };
        }
        return electronLaunchOptions;
    }
    TheiaElectronAppLoader.toPlaywrightOptions = toPlaywrightOptions;
})(TheiaElectronAppLoader || (TheiaElectronAppLoader = {}));
var TheiaAppLoader;
(function (TheiaAppLoader) {
    async function load(args, initialWorkspace, factory) {
        if (process.env.USE_ELECTRON === 'true') {
            // disable native elements and early window to avoid issues with the electron app
            process.env.THEIA_ELECTRON_DISABLE_NATIVE_ELEMENTS = '1';
            process.env.THEIA_ELECTRON_NO_EARLY_WINDOW = '1';
            process.env.THEIA_NO_SPLASH = 'true';
            return TheiaElectronAppLoader.load(args, initialWorkspace, factory);
        }
        const page = await args.browser.newPage();
        return TheiaBrowserAppLoader.load(page, initialWorkspace, factory);
    }
    TheiaAppLoader.load = load;
})(TheiaAppLoader || (exports.TheiaAppLoader = TheiaAppLoader = {}));
//# sourceMappingURL=theia-app-loader.js.map