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
exports.OpenAiFrontendApplicationContribution = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const common_1 = require("../common");
const openai_preferences_1 = require("../common/openai-preferences");
const ai_core_preferences_1 = require("@theia/ai-core/lib/common/ai-core-preferences");
const core_1 = require("@theia/core");
let OpenAiFrontendApplicationContribution = class OpenAiFrontendApplicationContribution {
    constructor() {
        this.prevModels = [];
        this.prevCustomModels = [];
    }
    onStart() {
        this.preferenceService.ready.then(() => {
            const apiKey = this.preferenceService.get(openai_preferences_1.API_KEY_PREF, undefined);
            this.manager.setApiKey(apiKey);
            const models = this.preferenceService.get(openai_preferences_1.MODELS_PREF, []);
            this.manager.createOrUpdateLanguageModels(...models.map(modelId => this.createOpenAIModelDescription(modelId)));
            this.prevModels = [...models];
            const customModels = this.preferenceService.get(openai_preferences_1.CUSTOM_ENDPOINTS_PREF, []);
            this.manager.createOrUpdateLanguageModels(...this.createCustomModelDescriptionsFromPreferences(customModels));
            this.prevCustomModels = [...customModels];
            this.preferenceService.onPreferenceChanged(event => {
                if (event.preferenceName === openai_preferences_1.API_KEY_PREF) {
                    this.manager.setApiKey(event.newValue);
                    this.updateAllModels();
                }
                else if (event.preferenceName === openai_preferences_1.MODELS_PREF) {
                    this.handleModelChanges(event.newValue);
                }
                else if (event.preferenceName === openai_preferences_1.CUSTOM_ENDPOINTS_PREF) {
                    this.handleCustomModelChanges(event.newValue);
                }
            });
            this.aiCorePreferences.onPreferenceChanged(event => {
                if (event.preferenceName === ai_core_preferences_1.PREFERENCE_NAME_MAX_RETRIES) {
                    this.updateAllModels();
                }
            });
        });
    }
    handleModelChanges(newModels) {
        const oldModels = new Set(this.prevModels);
        const updatedModels = new Set(newModels);
        const modelsToRemove = [...oldModels].filter(model => !updatedModels.has(model));
        const modelsToAdd = [...updatedModels].filter(model => !oldModels.has(model));
        this.manager.removeLanguageModels(...modelsToRemove.map(model => `openai/${model}`));
        this.manager.createOrUpdateLanguageModels(...modelsToAdd.map(modelId => this.createOpenAIModelDescription(modelId)));
        this.prevModels = newModels;
    }
    handleCustomModelChanges(newCustomModels) {
        const oldModels = this.createCustomModelDescriptionsFromPreferences(this.prevCustomModels);
        const newModels = this.createCustomModelDescriptionsFromPreferences(newCustomModels);
        const modelsToRemove = oldModels.filter(model => !newModels.some(newModel => newModel.id === model.id));
        const modelsToAddOrUpdate = newModels.filter(newModel => !oldModels.some(model => model.id === newModel.id &&
            model.model === newModel.model &&
            model.url === newModel.url &&
            model.apiKey === newModel.apiKey &&
            model.apiVersion === newModel.apiVersion &&
            model.developerMessageSettings === newModel.developerMessageSettings &&
            model.supportsStructuredOutput === newModel.supportsStructuredOutput &&
            model.enableStreaming === newModel.enableStreaming));
        this.manager.removeLanguageModels(...modelsToRemove.map(model => model.id));
        this.manager.createOrUpdateLanguageModels(...modelsToAddOrUpdate);
        this.prevCustomModels = [...newCustomModels];
    }
    updateAllModels() {
        const models = this.preferenceService.get(openai_preferences_1.MODELS_PREF, []);
        this.manager.createOrUpdateLanguageModels(...models.map(modelId => this.createOpenAIModelDescription(modelId)));
        const customModels = this.preferenceService.get(openai_preferences_1.CUSTOM_ENDPOINTS_PREF, []);
        this.manager.createOrUpdateLanguageModels(...this.createCustomModelDescriptionsFromPreferences(customModels));
    }
    createOpenAIModelDescription(modelId) {
        var _a;
        const id = `${common_1.OPENAI_PROVIDER_ID}/${modelId}`;
        const maxRetries = (_a = this.aiCorePreferences.get(ai_core_preferences_1.PREFERENCE_NAME_MAX_RETRIES)) !== null && _a !== void 0 ? _a : 3;
        return {
            id: id,
            model: modelId,
            apiKey: true,
            apiVersion: true,
            developerMessageSettings: openAIModelsNotSupportingDeveloperMessages.includes(modelId) ? 'user' : 'developer',
            enableStreaming: !openAIModelsWithDisabledStreaming.includes(modelId),
            supportsStructuredOutput: !openAIModelsWithoutStructuredOutput.includes(modelId),
            maxRetries: maxRetries
        };
    }
    createCustomModelDescriptionsFromPreferences(preferences) {
        var _a;
        const maxRetries = (_a = this.aiCorePreferences.get(ai_core_preferences_1.PREFERENCE_NAME_MAX_RETRIES)) !== null && _a !== void 0 ? _a : 3;
        return preferences.reduce((acc, pref) => {
            var _a, _b, _c, _d;
            if (!pref.model || !pref.url || typeof pref.model !== 'string' || typeof pref.url !== 'string') {
                return acc;
            }
            return [
                ...acc,
                {
                    id: pref.id && typeof pref.id === 'string' ? pref.id : pref.model,
                    model: pref.model,
                    url: pref.url,
                    apiKey: typeof pref.apiKey === 'string' || pref.apiKey === true ? pref.apiKey : undefined,
                    apiVersion: typeof pref.apiVersion === 'string' || pref.apiVersion === true ? pref.apiVersion : undefined,
                    developerMessageSettings: (_a = pref.developerMessageSettings) !== null && _a !== void 0 ? _a : 'developer',
                    supportsStructuredOutput: (_b = pref.supportsStructuredOutput) !== null && _b !== void 0 ? _b : true,
                    enableStreaming: (_c = pref.enableStreaming) !== null && _c !== void 0 ? _c : true,
                    maxRetries: (_d = pref.maxRetries) !== null && _d !== void 0 ? _d : maxRetries
                }
            ];
        }, []);
    }
};
exports.OpenAiFrontendApplicationContribution = OpenAiFrontendApplicationContribution;
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.PreferenceService),
    tslib_1.__metadata("design:type", Object)
], OpenAiFrontendApplicationContribution.prototype, "preferenceService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(common_1.OpenAiLanguageModelsManager),
    tslib_1.__metadata("design:type", Object)
], OpenAiFrontendApplicationContribution.prototype, "manager", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(ai_core_preferences_1.AICorePreferences),
    tslib_1.__metadata("design:type", Object)
], OpenAiFrontendApplicationContribution.prototype, "aiCorePreferences", void 0);
exports.OpenAiFrontendApplicationContribution = OpenAiFrontendApplicationContribution = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], OpenAiFrontendApplicationContribution);
const openAIModelsWithDisabledStreaming = [];
const openAIModelsNotSupportingDeveloperMessages = ['o1-preview', 'o1-mini'];
const openAIModelsWithoutStructuredOutput = ['o1-preview', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo', 'o1-mini', 'gpt-4o-2024-05-13'];
//# sourceMappingURL=openai-frontend-application-contribution.js.map