"use strict";
// *****************************************************************************
// Copyright (C) 2021 Ericsson and others.
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
exports.MacExternalTerminalService = void 0;
const tslib_1 = require("tslib");
const cp = require("child_process");
const inversify_1 = require("@theia/core/shared/inversify");
const file_uri_1 = require("@theia/core/lib/common/file-uri");
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// some code copied and modified from https://github.com/microsoft/vscode/blob/1.52.1/src/vs/workbench/contrib/externalTerminal/node/externalTerminalService.ts
let MacExternalTerminalService = class MacExternalTerminalService {
    constructor() {
        this.osxOpener = '/usr/bin/open';
        this.defaultTerminalApp = 'Terminal.app';
    }
    async openTerminal(configuration, cwd) {
        await this.spawnTerminal(configuration, file_uri_1.FileUri.fsPath(cwd));
    }
    async getDefaultExec() {
        return this.getDefaultTerminalOSX();
    }
    /**
     * Spawn the external terminal for the given options.
     * - The method spawns the terminal application based on the preferences, else uses the default value.
     * @param configuration the preference configuration.
     * @param cwd the optional current working directory to spawn from.
     */
    async spawnTerminal(configuration, cwd) {
        // Use the executable value from the preferences if available, else fallback to the default.
        const terminalConfig = configuration['terminal.external.osxExec'];
        const terminalApp = terminalConfig || this.getDefaultTerminalOSX();
        return new Promise((resolve, reject) => {
            const args = ['-a', terminalApp];
            if (cwd) {
                args.push(cwd);
            }
            const child = cp.spawn(this.osxOpener, args);
            child.on('error', reject);
            child.on('exit', () => resolve());
        });
    }
    /**
     * Get the default terminal app on OSX.
     */
    getDefaultTerminalOSX() {
        return this.defaultTerminalApp;
    }
};
exports.MacExternalTerminalService = MacExternalTerminalService;
exports.MacExternalTerminalService = MacExternalTerminalService = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], MacExternalTerminalService);
//# sourceMappingURL=mac-external-terminal-service.js.map