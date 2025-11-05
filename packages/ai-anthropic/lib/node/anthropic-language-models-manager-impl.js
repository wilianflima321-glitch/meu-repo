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
exports.AnthropicLanguageModelsManagerImpl = void 0;
const tslib_1 = require("tslib");
const ai_core_1 = require("@theia/ai-core");
const inversify_1 = require("@theia/core/shared/inversify");
const anthropic_language_model_1 = require("./anthropic-language-model");
let AnthropicLanguageModelsManagerImpl = class AnthropicLanguageModelsManagerImpl {
    get apiKey() {
        return this._apiKey;
    }
    async createOrUpdateLanguageModels(...modelDescriptions) {
        var _a;
        for (const modelDescription of modelDescriptions) {
            const model = await this.languageModelRegistry.getLanguageModel(modelDescription.id);
            const status = this.calculateStatus(modelDescription);
            if (model) {
                if (!(model instanceof anthropic_language_model_1.AnthropicModel)) {
                    console.warn(`Anthropic: model ${modelDescription.id} is not an Anthropic model`);
                    continue;
                }
                await this.languageModelRegistry.patchLanguageModel(modelDescription.id, {
                    model: modelDescription.model,
                    enableStreaming: modelDescription.enableStreaming,
                    useCaching: modelDescription.useCaching,
                    maxTokens: modelDescription.maxTokens !== undefined ? modelDescription.maxTokens : anthropic_language_model_1.DEFAULT_MAX_TOKENS,
                    maxRetries: modelDescription.maxRetries,
                    status,
                });
            }
            else {
                this.languageModelRegistry.addLanguageModels([
                    new anthropic_language_model_1.AnthropicModel(modelDescription.id, modelDescription.model, status, modelDescription.enableStreaming, modelDescription.useCaching, (_a = modelDescription.maxTokens) !== null && _a !== void 0 ? _a : anthropic_language_model_1.DEFAULT_MAX_TOKENS, modelDescription.maxRetries, this.tokenUsageService)
                ]);
            }
        }
    }
    removeLanguageModels(...modelIds) {
        this.languageModelRegistry.removeLanguageModels(modelIds);
    }
    setApiKey(apiKey) {
        this._apiKey = apiKey;
    }
    calculateStatus(_modelDescription) {
        // Credentials and routing are handled by the backend runtime. If the runtime is reachable,
        // the model is considered ready from the IDE perspective.
        return { status: 'ready' };
    }
};
exports.AnthropicLanguageModelsManagerImpl = AnthropicLanguageModelsManagerImpl;
tslib_1.__decorate([
    (0, inversify_1.inject)(ai_core_1.LanguageModelRegistry),
    tslib_1.__metadata("design:type", Object)
], AnthropicLanguageModelsManagerImpl.prototype, "languageModelRegistry", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(ai_core_1.TokenUsageService),
    tslib_1.__metadata("design:type", Object)
], AnthropicLanguageModelsManagerImpl.prototype, "tokenUsageService", void 0);
exports.AnthropicLanguageModelsManagerImpl = AnthropicLanguageModelsManagerImpl = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], AnthropicLanguageModelsManagerImpl);
//# sourceMappingURL=anthropic-language-models-manager-impl.js.map