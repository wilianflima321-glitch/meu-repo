"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromptVariableContribution = exports.PROMPT_VARIABLE = void 0;
const tslib_1 = require("tslib");
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
const core_1 = require("@theia/core");
const inversify_1 = require("@theia/core/shared/inversify");
const monaco = require("@theia/monaco-editor-core");
const prompt_service_1 = require("./prompt-service");
const prompt_text_1 = require("./prompt-text");
exports.PROMPT_VARIABLE = {
    id: 'prompt-provider',
    description: core_1.nls.localize('theia/ai/core/promptVariable/description', 'Resolves prompt templates via the prompt service'),
    name: 'prompt',
    args: [
        { name: 'id', description: core_1.nls.localize('theia/ai/core/promptVariable/argDescription', 'The prompt template id to resolve') }
    ]
};
let PromptVariableContribution = class PromptVariableContribution {
    registerVariables(service) {
        service.registerResolver(exports.PROMPT_VARIABLE, this);
        service.registerArgumentPicker(exports.PROMPT_VARIABLE, this.triggerArgumentPicker.bind(this));
        service.registerArgumentCompletionProvider(exports.PROMPT_VARIABLE, this.provideArgumentCompletionItems.bind(this));
    }
    canResolve(request, context) {
        if (request.variable.name === exports.PROMPT_VARIABLE.name) {
            return 1;
        }
        return -1;
    }
    async resolve(request, context, resolveDependency) {
        var _a;
        if (request.variable.name === exports.PROMPT_VARIABLE.name) {
            const promptId = (_a = request.arg) === null || _a === void 0 ? void 0 : _a.trim();
            if (promptId) {
                const resolvedPrompt = await this.promptService.getResolvedPromptFragmentWithoutFunctions(promptId, undefined, context, resolveDependency);
                if (resolvedPrompt) {
                    return {
                        variable: request.variable,
                        value: resolvedPrompt.text,
                        allResolvedDependencies: resolvedPrompt.variables
                    };
                }
            }
        }
        this.logger.debug(`Could not resolve prompt variable '${request.variable.name}' with arg '${request.arg}'. Returning empty string.`);
        return {
            variable: request.variable,
            value: '',
            allResolvedDependencies: []
        };
    }
    async triggerArgumentPicker() {
        // Trigger the suggestion command to show argument completions
        this.commandService.executeCommand('editor.action.triggerSuggest');
        // Return undefined because we don't actually pick the argument here.
        // The argument is selected and inserted by the monaco editor's completion mechanism.
        return undefined;
    }
    async provideArgumentCompletionItems(model, position) {
        const lineContent = model.getLineContent(position.lineNumber);
        // Only provide completions once the variable argument separator is typed
        const triggerCharIndex = lineContent.lastIndexOf(prompt_text_1.PromptText.VARIABLE_SEPARATOR_CHAR, position.column - 1);
        if (triggerCharIndex === -1) {
            return undefined;
        }
        // Check if the text immediately before the trigger is the prompt variable, i.e #prompt
        const requiredVariable = `${prompt_text_1.PromptText.VARIABLE_CHAR}${exports.PROMPT_VARIABLE.name}`;
        if (triggerCharIndex < requiredVariable.length ||
            lineContent.substring(triggerCharIndex - requiredVariable.length, triggerCharIndex) !== requiredVariable) {
            return undefined;
        }
        const range = new monaco.Range(position.lineNumber, triggerCharIndex + 2, position.lineNumber, position.column);
        const activePrompts = this.promptService.getActivePromptFragments();
        let builtinPromptCompletions = undefined;
        if (activePrompts.length > 0) {
            builtinPromptCompletions = [];
            activePrompts.forEach(prompt => (builtinPromptCompletions.push({
                label: prompt.id,
                kind: (0, prompt_service_1.isCustomizedPromptFragment)(prompt) ? monaco.languages.CompletionItemKind.Enum : monaco.languages.CompletionItemKind.Variable,
                insertText: prompt.id,
                range,
                detail: (0, prompt_service_1.isCustomizedPromptFragment)(prompt) ?
                    core_1.nls.localize('theia/ai/core/promptVariable/completions/detail/custom', 'Customized prompt fragment') :
                    core_1.nls.localize('theia/ai/core/promptVariable/completions/detail/builtin', 'Built-in prompt fragment'),
                sortText: `${prompt.id}`
            })));
        }
        return builtinPromptCompletions;
    }
};
exports.PromptVariableContribution = PromptVariableContribution;
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.CommandService),
    tslib_1.__metadata("design:type", Object)
], PromptVariableContribution.prototype, "commandService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(prompt_service_1.PromptService),
    tslib_1.__metadata("design:type", Object)
], PromptVariableContribution.prototype, "promptService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.ILogger),
    tslib_1.__metadata("design:type", Object)
], PromptVariableContribution.prototype, "logger", void 0);
exports.PromptVariableContribution = PromptVariableContribution = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], PromptVariableContribution);
//# sourceMappingURL=prompt-variable-contribution.js.map