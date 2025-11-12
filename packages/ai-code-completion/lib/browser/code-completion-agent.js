"use strict";
// *****************************************************************************
// Copyright (C) 2024 EclipseSource GmbH.
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
exports.CodeCompletionAgentImpl = exports.CodeCompletionAgent = void 0;
const tslib_1 = require("tslib");
const browser_1 = require("@theia/ai-core/lib/browser");
const common_1 = require("@theia/ai-core/lib/common");
const core_1 = require("@theia/core");
const inversify_1 = require("@theia/core/shared/inversify");
const monaco = require("@theia/monaco-editor-core");
const code_completion_prompt_template_1 = require("./code-completion-prompt-template");
const code_completion_postprocessor_1 = require("./code-completion-postprocessor");
exports.CodeCompletionAgent = Symbol('CodeCompletionAgent');
let CodeCompletionAgentImpl = class CodeCompletionAgentImpl {
    constructor() {
        this.id = 'Code Completion';
        this.name = 'Code Completion';
        this.description = core_1.nls.localize('theia/ai/completion/agent/description', 'This agent provides inline code completion in the code editor in the Theia IDE.');
        this.prompts = code_completion_prompt_template_1.codeCompletionPrompts;
        this.languageModelRequirements = [
            {
                purpose: 'code-completion',
                identifier: 'default/code-completion',
            },
        ];
        this.variables = [];
        this.functions = [];
        this.agentSpecificVariables = [];
    }
    async provideInlineCompletions(model, position, context, token) {
        const progress = await this.progressService.showProgress({ text: core_1.nls.localize('theia/ai/code-completion/progressText', 'Calculating AI code completion...'), options: { location: 'window' } });
        try {
            const languageModel = await this.languageModelRegistry.selectLanguageModel({
                agent: this.id,
                ...this.languageModelRequirements[0],
            });
            if (!languageModel) {
                this.logger.error('No language model found for code-completion-agent');
                return undefined;
            }
            const variableContext = {
                model,
                position,
                context
            };
            if (token.isCancellationRequested) {
                return undefined;
            }
            const prompt = await this.promptService
                .getResolvedPromptFragment('code-completion-system', undefined, variableContext)
                .then(p => p === null || p === void 0 ? void 0 : p.text);
            if (!prompt) {
                this.logger.error('No prompt found for code-completion-agent');
                return undefined;
            }
            // since we do not actually hold complete conversions, the request/response pair is considered a session
            const sessionId = (0, core_1.generateUuid)();
            const requestId = (0, core_1.generateUuid)();
            const request = {
                messages: [{ type: 'text', actor: 'user', text: prompt }],
                settings: {
                    stream: false
                },
                agentId: this.id,
                sessionId,
                requestId,
                cancellationToken: token
            };
            if (token.isCancellationRequested) {
                return undefined;
            }
            const response = await this.languageModelService.sendRequest(languageModel, request);
            if (token.isCancellationRequested) {
                return undefined;
            }
            const completionText = await (0, common_1.getTextOfResponse)(response);
            if (token.isCancellationRequested) {
                return undefined;
            }
            const postProcessedCompletionText = this.postProcessor.postProcess(completionText);
            return {
                items: [{
                        insertText: postProcessedCompletionText,
                        range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column)
                    }],
                enableForwardStability: true
            };
        }
        catch (e) {
            if (!token.isCancellationRequested) {
                console.error(e.message, e);
            }
        }
        finally {
            progress.cancel();
        }
    }
};
exports.CodeCompletionAgentImpl = CodeCompletionAgentImpl;
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_1.LanguageModelService),
    tslib_1.__metadata("design:type", Object)
], CodeCompletionAgentImpl.prototype, "languageModelService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.ILogger),
    (0, inversify_1.named)('code-completion-agent'),
    tslib_1.__metadata("design:type", Object)
], CodeCompletionAgentImpl.prototype, "logger", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(common_1.LanguageModelRegistry),
    tslib_1.__metadata("design:type", Object)
], CodeCompletionAgentImpl.prototype, "languageModelRegistry", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(common_1.PromptService),
    tslib_1.__metadata("design:type", Object)
], CodeCompletionAgentImpl.prototype, "promptService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.ProgressService),
    tslib_1.__metadata("design:type", core_1.ProgressService)
], CodeCompletionAgentImpl.prototype, "progressService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(code_completion_postprocessor_1.CodeCompletionPostProcessor),
    tslib_1.__metadata("design:type", Object)
], CodeCompletionAgentImpl.prototype, "postProcessor", void 0);
exports.CodeCompletionAgentImpl = CodeCompletionAgentImpl = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], CodeCompletionAgentImpl);
//# sourceMappingURL=code-completion-agent.js.map