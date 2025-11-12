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
exports.WindowsExternalTerminalService = void 0;
const tslib_1 = require("tslib");
const cp = require("child_process");
const path = require("path");
const inversify_1 = require("@theia/core/shared/inversify");
const file_uri_1 = require("@theia/core/lib/common/file-uri");
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// some code copied and modified from https://github.com/microsoft/vscode/blob/1.52.1/src/vs/workbench/contrib/externalTerminal/node/externalTerminalService.ts
let WindowsExternalTerminalService = class WindowsExternalTerminalService {
    constructor() {
        this.CMD = 'cmd.exe';
    }
    async openTerminal(configuration, cwd) {
        await this.spawnTerminal(configuration, file_uri_1.FileUri.fsPath(cwd));
    }
    async getDefaultExec() {
        return this.getDefaultTerminalWindows();
    }
    /**
     * Spawn the external terminal for the given options.
     * - The method spawns the terminal application based on the preferences, else uses the default value.
     * @param configuration the preference configuration.
     * @param cwd the optional current working directory to spawn from.
     */
    async spawnTerminal(configuration, cwd) {
        // Use the executable value from the preferences if available, else fallback to the default.
        const terminalConfig = configuration['terminal.external.windowsExec'];
        const exec = terminalConfig || this.getDefaultTerminalWindows();
        // Make the drive letter uppercase on Windows (https://github.com/microsoft/vscode/issues/9448).
        if (cwd && cwd[1] === ':') {
            cwd = cwd[0].toUpperCase() + cwd.substring(1);
        }
        // cmder ignores the environment cwd and instead opts to always open in %USERPROFILE%
        // unless otherwise specified.
        const basename = path.basename(exec).toLowerCase();
        if (basename === 'cmder' || basename === 'cmder.exe') {
            cp.spawn(exec, cwd ? [cwd] : undefined);
            return;
        }
        const cmdArgs = ['/c', 'start', '/wait'];
        // The "" argument is the window title. Without this, exec doesn't work when the path contains spaces.
        if (exec.indexOf(' ') >= 0) {
            cmdArgs.push('""');
        }
        cmdArgs.push(exec);
        // Add starting directory parameter for Windows Terminal app.
        if (basename === 'wt' || basename === 'wt.exe') {
            cmdArgs.push('-d .');
        }
        return new Promise(async (resolve, reject) => {
            const env = cwd ? { cwd } : undefined;
            const command = this.getWindowsShell();
            const child = cp.spawn(command, cmdArgs, env);
            child.on('error', reject);
            child.on('exit', resolve);
        });
    }
    /**
     * Get the default terminal application on Windows.
     * - The following method uses environment variables to identify the best default possible value.
     *
     * @returns the default application on Windows.
     */
    getDefaultTerminalWindows() {
        if (!this.DEFAULT_TERMINAL_WINDOWS) {
            const isWoW64 = !!process.env.hasOwnProperty('PROCESSOR_ARCHITEW6432');
            this.DEFAULT_TERMINAL_WINDOWS = `${process.env.windir ? process.env.windir : 'C:\\Windows'}\\${isWoW64 ? 'Sysnative' : 'System32'}\\cmd.exe`;
        }
        return this.DEFAULT_TERMINAL_WINDOWS;
    }
    /**
     * Find the Windows Shell process to start up (defaults to cmd.exe).
     */
    getWindowsShell() {
        // Find the path to cmd.exe if possible (%compsec% environment variable).
        return process.env.compsec || this.CMD;
    }
};
exports.WindowsExternalTerminalService = WindowsExternalTerminalService;
exports.WindowsExternalTerminalService = WindowsExternalTerminalService = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], WindowsExternalTerminalService);
//# sourceMappingURL=windows-external-terminal-service.js.map