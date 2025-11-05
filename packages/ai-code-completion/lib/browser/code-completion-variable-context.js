"use strict";
// *****************************************************************************
// Copyright (C) 2025 Lonti.com Pty Ltd.
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
exports.CodeCompletionVariableContext = void 0;
var CodeCompletionVariableContext;
(function (CodeCompletionVariableContext) {
    function is(context) {
        return !!context && 'model' in context && 'position' in context && 'context' in context;
    }
    CodeCompletionVariableContext.is = is;
})(CodeCompletionVariableContext || (exports.CodeCompletionVariableContext = CodeCompletionVariableContext = {}));
//# sourceMappingURL=code-completion-variable-context.js.map