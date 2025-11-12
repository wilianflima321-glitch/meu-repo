"use strict";
// *****************************************************************************
// Copyright (C) 2022 STMicroelectronics, Ericsson, ARM, EclipseSource and others.
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
exports.ElectronSecondaryWindowService = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("inversify");
const default_secondary_window_service_1 = require("../../browser/window/default-secondary-window-service");
const promise_util_1 = require("../../common/promise-util");
let ElectronSecondaryWindowService = class ElectronSecondaryWindowService extends default_secondary_window_service_1.DefaultSecondaryWindowService {
    focus(win) {
        window.electronTheiaCore.focusWindow(win.name);
    }
    registerShutdownListeners() {
        // Close all open windows when the main window is closed.
        this.windowService.onWillShutDown(() => {
            const promises = [];
            // Iterate backwards because calling window.close might remove the window from the array
            for (let i = this.secondaryWindows.length - 1; i >= 0; i--) {
                const windowClosed = new promise_util_1.Deferred();
                const win = this.secondaryWindows[i];
                win.addEventListener('unload', () => {
                    windowClosed.resolve();
                });
                promises.push(windowClosed.promise);
            }
            for (let i = this.secondaryWindows.length - 1; i >= 0; i--) {
                this.secondaryWindows[i].close();
            }
            return Promise.race([(0, promise_util_1.timeout)(2000), Promise.all(promises).then(() => { })]);
        });
    }
    windowCreated(newWindow, widget, shell) {
        window.electronTheiaCore.setMenuBarVisible(false, newWindow.name);
        window.electronTheiaCore.setSecondaryWindowCloseRequestHandler(newWindow.name, () => this.canClose(widget, shell, newWindow));
        // Below code may be used to debug contents of secondary window
        // window.electronTheiaCore.openDevToolsForWindow(newWindow.name);
    }
    async canClose(extractableWidget, shell, newWindow) {
        return this.restoreWidgets(newWindow, extractableWidget, shell);
    }
};
exports.ElectronSecondaryWindowService = ElectronSecondaryWindowService;
exports.ElectronSecondaryWindowService = ElectronSecondaryWindowService = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], ElectronSecondaryWindowService);
//# sourceMappingURL=electron-secondary-window-service.js.map