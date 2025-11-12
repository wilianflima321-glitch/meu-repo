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
exports.OpenAiLanguageModelsManagerImpl = void 0;
const tslib_1 = require("tslib");
const ai_core_1 = require("@theia/ai-core");
const inversify_1 = require("@theia/core/shared/inversify");
const openai_language_model_1 = require("./openai-language-model");
let OpenAiLanguageModelsManagerImpl = class OpenAiLanguageModelsManagerImpl {
    get apiKey() {
        return this._apiKey;
    }
    get apiVersion() {
        return this._apiVersion;
    }
    calculateStatus(_modelDescription, _effectiveApiKey) {
        // The backend service handles credentials and routing, so from the IDE perspective
        // the model is always ready as long as the runtime is reachable.
        return { status: 'ready' };
    }
    // Triggered from frontend. In case you want to use the models on the backend
    // without a frontend then call this yourself
    async createOrUpdateLanguageModels(...modelDescriptions) {
        for (const modelDescription of modelDescriptions) {
            const model = await this.languageModelRegistry.getLanguageModel(modelDescription.id);
            const apiKeyProvider = () => this.apiKey;
            const apiVersionProvider = () => this.apiVersion;
            const status = this.calculateStatus(modelDescription, undefined);
            if (model) {
                if (!(model instanceof openai_language_model_1.OpenAiModel)) {
                    console.warn(`OpenAI: model ${modelDescription.id} is not an OpenAI model`);
                    continue;
                }
                await this.languageModelRegistry.patchLanguageModel(modelDescription.id, {
                    model: modelDescription.model,
                    enableStreaming: modelDescription.enableStreaming,
                    url: modelDescription.url,
                    apiKey: apiKeyProvider,
                    apiVersion: apiVersionProvider,
                    developerMessageSettings: modelDescription.developerMessageSettings || 'developer',
                    supportsStructuredOutput: modelDescription.supportsStructuredOutput,
                    status,
                    maxRetries: modelDescription.maxRetries
                });
            }
            else {
                this.languageModelRegistry.addLanguageModels([
                    new openai_language_model_1.OpenAiModel(modelDescription.id, modelDescription.model, status, modelDescription.enableStreaming, apiKeyProvider, apiVersionProvider, modelDescription.supportsStructuredOutput, modelDescription.url, this.openAiModelUtils, modelDescription.developerMessageSettings, modelDescription.maxRetries, this.tokenUsageService)
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
    setApiVersion(apiVersion) {
        this._apiVersion = apiVersion;
    }
};
exports.OpenAiLanguageModelsManagerImpl = OpenAiLanguageModelsManagerImpl;
tslib_1.__decorate([
    (0, inversify_1.inject)(openai_language_model_1.OpenAiModelUtils),
    tslib_1.__metadata("design:type", openai_language_model_1.OpenAiModelUtils)
], OpenAiLanguageModelsManagerImpl.prototype, "openAiModelUtils", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(ai_core_1.LanguageModelRegistry),
    tslib_1.__metadata("design:type", Object)
], OpenAiLanguageModelsManagerImpl.prototype, "languageModelRegistry", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(ai_core_1.TokenUsageService),
    tslib_1.__metadata("design:type", Object)
], OpenAiLanguageModelsManagerImpl.prototype, "tokenUsageService", void 0);
exports.OpenAiLanguageModelsManagerImpl = OpenAiLanguageModelsManagerImpl = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], OpenAiLanguageModelsManagerImpl);
//# sourceMappingURL=openai-language-models-manager-impl.js.map