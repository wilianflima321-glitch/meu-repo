"use strict";
/********************************************************************************
 * Copyright (C) 2021 Ericsson and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
 ********************************************************************************/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToggleDiffSelectWidgetVisibilityCommand = exports.RegisterSetVariableCommand = exports.CreateNewRegisterViewCommand = exports.FollowPointerDebugCommand = exports.FollowPointerTableCommand = exports.CreateNewMemoryViewCommand = exports.ResetModifiedCellCommand = exports.ViewVariableInRegisterViewCommand = exports.ViewVariableInMemoryCommand = exports.MemoryCategory = exports.MemoryCommand = void 0;
const nls_1 = require("@theia/core/lib/common/nls");
exports.MemoryCommand = { id: 'memory-inspector-command' };
exports.MemoryCategory = nls_1.nls.localize('theia/memory-inspector/memoryCategory', 'Memory Inspector');
exports.ViewVariableInMemoryCommand = {
    id: 'view-variable-in-memory',
    category: exports.MemoryCategory,
    label: nls_1.nls.localize('theia/memory-inspector/command/viewVariable', 'Show Variable in Memory Inspector'),
};
exports.ViewVariableInRegisterViewCommand = {
    id: 'view-variable-in-register-view',
    category: exports.MemoryCategory,
    label: nls_1.nls.localize('theia/memory-inspector/command/showRegister', 'Show Register in Memory Inspector'),
};
exports.ResetModifiedCellCommand = {
    id: 'reset-modified-cell',
    category: exports.MemoryCategory,
    label: nls_1.nls.localize('theia/memory-inspector/command/resetValue', 'Reset Value'),
};
exports.CreateNewMemoryViewCommand = {
    id: 'create-new-memory-view',
    category: exports.MemoryCategory,
    label: nls_1.nls.localize('theia/memory-inspector/command/createNewMemory', 'Create New Memory Inspector'),
    iconClass: 'memory-view-icon toolbar',
};
exports.FollowPointerTableCommand = {
    id: 'follow-pointer-table',
    category: exports.MemoryCategory,
    label: nls_1.nls.localize('theia/memory-inspector/command/followPointer', 'Follow Pointer'),
};
exports.FollowPointerDebugCommand = {
    id: 'follow-pointer-debug',
    category: exports.MemoryCategory,
    label: nls_1.nls.localize('theia/memory-inspector/command/followPointerMemory', 'Follow Pointer in Memory Inspector'),
};
exports.CreateNewRegisterViewCommand = {
    id: 'create-new-register-view',
    category: exports.MemoryCategory,
    label: nls_1.nls.localize('theia/memory-inspector/command/createNewRegisterView', 'Create New Register View'),
    iconClass: 'register-view-icon toolbar',
};
exports.RegisterSetVariableCommand = {
    id: 'register-set-variable-value',
    category: exports.MemoryCategory,
    label: nls_1.nls.localizeByDefault('Set Value')
};
exports.ToggleDiffSelectWidgetVisibilityCommand = {
    id: 'toggle-diff-select-visibility',
    iconClass: 'codicon codicon-git-compare',
};
//# sourceMappingURL=memory-commands.js.map