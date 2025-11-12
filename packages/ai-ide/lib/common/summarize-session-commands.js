"use strict";
// *****************************************************************************
// Copyright (C) 2025 EclipseSource GmbH.
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
exports.AI_UPDATE_TASK_CONTEXT_COMMAND = exports.AI_SUMMARIZE_SESSION_AS_TASK_FOR_CODER = void 0;
const core_1 = require("@theia/core");
exports.AI_SUMMARIZE_SESSION_AS_TASK_FOR_CODER = core_1.Command.toLocalizedCommand({
    id: 'ai-chat:summarize-session-as-task-for-coder',
    label: 'Summarize Session as Task for Coder'
});
exports.AI_UPDATE_TASK_CONTEXT_COMMAND = core_1.Command.toLocalizedCommand({
    id: 'ai.updateTaskContext',
    label: 'Update Current Task Context'
});
//# sourceMappingURL=summarize-session-commands.js.map