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
exports.CodeCompletionVariableContribution = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@theia/core");
const inversify_1 = require("@theia/core/shared/inversify");
const ai_code_completion_preference_1 = require("../common/ai-code-completion-preference");
const code_completion_variable_context_1 = require("./code-completion-variable-context");
const code_completion_variables_1 = require("./code-completion-variables");
let CodeCompletionVariableContribution = class CodeCompletionVariableContribution {
    registerVariables(service) {
        [
            code_completion_variables_1.FILE,
            code_completion_variables_1.PREFIX,
            code_completion_variables_1.SUFFIX,
            code_completion_variables_1.LANGUAGE
        ].forEach(variable => {
            service.registerResolver(variable, this);
        });
    }
    canResolve(_request, context) {
        return code_completion_variable_context_1.CodeCompletionVariableContext.is(context) ? 1 : 0;
    }
    async resolve(request, context) {
        if (!code_completion_variable_context_1.CodeCompletionVariableContext.is(context)) {
            return Promise.resolve(undefined);
        }
        switch (request.variable.id) {
            case code_completion_variables_1.FILE.id:
                return this.resolveFile(context);
            case code_completion_variables_1.LANGUAGE.id:
                return this.resolveLanguage(context);
            case code_completion_variables_1.PREFIX.id:
                return this.resolvePrefix(context);
            case code_completion_variables_1.SUFFIX.id:
                return this.resolveSuffix(context);
            default:
                return undefined;
        }
    }
    resolvePrefix(context) {
        const position = context.position;
        const model = context.model;
        const maxContextLines = this.preferences.get(ai_code_completion_preference_1.PREF_AI_INLINE_COMPLETION_MAX_CONTEXT_LINES, -1);
        let prefixStartLine = 1;
        if (maxContextLines === 0) {
            // Only the cursor line
            prefixStartLine = position.lineNumber;
        }
        else if (maxContextLines > 0) {
            const linesBeforeCursor = position.lineNumber - 1;
            // Allocate one more line to the prefix in case of an odd maxContextLines
            const prefixLines = Math.min(Math.ceil(maxContextLines / 2), linesBeforeCursor);
            prefixStartLine = Math.max(1, position.lineNumber - prefixLines);
        }
        const prefix = model.getValueInRange({
            startLineNumber: prefixStartLine,
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
        });
        return {
            variable: code_completion_variables_1.PREFIX,
            value: prefix
        };
    }
    resolveSuffix(context) {
        const position = context.position;
        const model = context.model;
        const maxContextLines = this.preferences.get(ai_code_completion_preference_1.PREF_AI_INLINE_COMPLETION_MAX_CONTEXT_LINES, -1);
        let suffixEndLine = model.getLineCount();
        if (maxContextLines === 0) {
            suffixEndLine = position.lineNumber;
        }
        else if (maxContextLines > 0) {
            const linesAfterCursor = model.getLineCount() - position.lineNumber;
            const suffixLines = Math.min(Math.floor(maxContextLines / 2), linesAfterCursor);
            suffixEndLine = Math.min(model.getLineCount(), position.lineNumber + suffixLines);
        }
        const suffix = model.getValueInRange({
            startLineNumber: position.lineNumber,
            startColumn: position.column,
            endLineNumber: suffixEndLine,
            endColumn: model.getLineMaxColumn(suffixEndLine),
        });
        return {
            variable: code_completion_variables_1.SUFFIX,
            value: suffix
        };
    }
    resolveLanguage(context) {
        return {
            variable: code_completion_variables_1.LANGUAGE,
            value: context.model.getLanguageId()
        };
    }
    resolveFile(context) {
        return {
            variable: code_completion_variables_1.FILE,
            value: context.model.uri.toString(false)
        };
    }
};
exports.CodeCompletionVariableContribution = CodeCompletionVariableContribution;
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.PreferenceService),
    tslib_1.__metadata("design:type", Object)
], CodeCompletionVariableContribution.prototype, "preferences", void 0);
exports.CodeCompletionVariableContribution = CodeCompletionVariableContribution = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], CodeCompletionVariableContribution);
//# sourceMappingURL=code-completion-variable-contribution.js.map