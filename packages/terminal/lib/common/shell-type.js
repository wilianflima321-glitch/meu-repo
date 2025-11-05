"use strict";
// *****************************************************************************
// Copyright (C) 2025 STMicroelectronics and others.
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
exports.shellTypesToRegex = exports.windowShellTypesToRegex = void 0;
exports.guessShellTypeFromExecutable = guessShellTypeFromExecutable;
const core_1 = require("@theia/core");
const path = require("path");
exports.windowShellTypesToRegex = new Map([
    ["cmd" /* WindowsShellType.CommandPrompt */, /^cmd$/],
    ["gitbash" /* WindowsShellType.GitBash */, /^bash$/],
    ["wsl" /* WindowsShellType.Wsl */, /^wsl$/]
]);
exports.shellTypesToRegex = new Map([
    ["bash" /* GeneralShellType.Bash */, /^bash$/],
    ["csh" /* GeneralShellType.Csh */, /^csh$/],
    ["fish" /* GeneralShellType.Fish */, /^fish$/],
    ["julia" /* GeneralShellType.Julia */, /^julia$/],
    ["ksh" /* GeneralShellType.Ksh */, /^ksh$/],
    ["node" /* GeneralShellType.Node */, /^node$/],
    ["nu" /* GeneralShellType.NuShell */, /^nu$/],
    ["pwsh" /* GeneralShellType.PowerShell */, /^pwsh(-preview)?|powershell$/],
    ["python" /* GeneralShellType.Python */, /^py(?:thon)?(?:\d+)?$/],
    ["sh" /* GeneralShellType.Sh */, /^sh$/],
    ["zsh" /* GeneralShellType.Zsh */, /^zsh$/]
]);
function guessShellTypeFromExecutable(executable) {
    if (!executable) {
        return undefined;
    }
    if (core_1.OS.backend.isWindows) {
        const windowsExecutableName = path.basename(executable, '.exe');
        for (const [shellType, pattern] of exports.windowShellTypesToRegex) {
            if (windowsExecutableName.match(pattern)) {
                return shellType;
            }
        }
        // check also for generic ones as python
        for (const [shellType, pattern] of exports.shellTypesToRegex) {
            if (windowsExecutableName.match(pattern)) {
                return shellType;
            }
        }
    }
    const executableName = path.basename(executable);
    for (const [shellType, pattern] of exports.shellTypesToRegex) {
        if (executableName.match(pattern)) {
            return shellType;
        }
    }
    return undefined;
}
//# sourceMappingURL=shell-type.js.map