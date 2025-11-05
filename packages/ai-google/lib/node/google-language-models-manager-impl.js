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
exports.GoogleLanguageModelsManagerImpl = void 0;
const tslib_1 = require("tslib");
const ai_core_1 = require("@theia/ai-core");
const inversify_1 = require("@theia/core/shared/inversify");
const google_language_model_1 = require("./google-language-model");
let GoogleLanguageModelsManagerImpl = class GoogleLanguageModelsManagerImpl {
    constructor() {
        this.retrySettings = {
            maxRetriesOnErrors: 3,
            retryDelayOnRateLimitError: 60,
            retryDelayOnOtherErrors: -1
        };
    }
    get apiKey() {
        var _a, _b;
        return (_b = (_a = this._apiKey) !== null && _a !== void 0 ? _a : process.env.GOOGLE_API_KEY) !== null && _b !== void 0 ? _b : process.env.GEMINI_API_KEY;
    }
    calculateStatus(effectiveApiKey) {
        return effectiveApiKey
            ? { status: 'ready' }
            : { status: 'unavailable', message: 'No Google API key set' };
    }
    async createOrUpdateLanguageModels(...modelDescriptions) {
        for (const modelDescription of modelDescriptions) {
            const model = await this.languageModelRegistry.getLanguageModel(modelDescription.id);
            const apiKeyProvider = () => {
                if (modelDescription.apiKey === true) {
                    return this.apiKey;
                }
                if (modelDescription.apiKey) {
                    return modelDescription.apiKey;
                }
                return undefined;
            };
            const retrySettingsProvider = () => this.retrySettings;
            // Determine the effective API key for status
            const status = this.calculateStatus(apiKeyProvider());
            if (model) {
                if (!(model instanceof google_language_model_1.GoogleModel)) {
                    console.warn(`Gemini: model ${modelDescription.id} is not a Gemini model`);
                    continue;
                }
                await this.languageModelRegistry.patchLanguageModel(modelDescription.id, {
                    model: modelDescription.model,
                    enableStreaming: modelDescription.enableStreaming,
                    apiKey: apiKeyProvider,
                    retrySettings: retrySettingsProvider,
                    status
                });
            }
            else {
                this.languageModelRegistry.addLanguageModels([
                    new google_language_model_1.GoogleModel(modelDescription.id, modelDescription.model, status, modelDescription.enableStreaming, apiKeyProvider, retrySettingsProvider, this.tokenUsageService)
                ]);
            }
        }
    }
    removeLanguageModels(...modelIds) {
        this.languageModelRegistry.removeLanguageModels(modelIds);
    }
    setApiKey(apiKey) {
        if (apiKey) {
            this._apiKey = apiKey;
        }
        else {
            this._apiKey = undefined;
        }
    }
    setMaxRetriesOnErrors(maxRetries) {
        this.retrySettings.maxRetriesOnErrors = maxRetries;
    }
    setRetryDelayOnRateLimitError(retryDelay) {
        this.retrySettings.retryDelayOnRateLimitError = retryDelay;
    }
    setRetryDelayOnOtherErrors(retryDelay) {
        this.retrySettings.retryDelayOnOtherErrors = retryDelay;
    }
};
exports.GoogleLanguageModelsManagerImpl = GoogleLanguageModelsManagerImpl;
tslib_1.__decorate([
    (0, inversify_1.inject)(ai_core_1.LanguageModelRegistry),
    tslib_1.__metadata("design:type", Object)
], GoogleLanguageModelsManagerImpl.prototype, "languageModelRegistry", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(ai_core_1.TokenUsageService),
    tslib_1.__metadata("design:type", Object)
], GoogleLanguageModelsManagerImpl.prototype, "tokenUsageService", void 0);
exports.GoogleLanguageModelsManagerImpl = GoogleLanguageModelsManagerImpl = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], GoogleLanguageModelsManagerImpl);
//# sourceMappingURL=google-language-models-manager-impl.js.map