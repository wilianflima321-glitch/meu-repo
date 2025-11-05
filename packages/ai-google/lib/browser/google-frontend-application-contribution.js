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
exports.GoogleFrontendApplicationContribution = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const common_1 = require("../common");
const google_preferences_1 = require("../common/google-preferences");
const core_1 = require("@theia/core");
const GOOGLE_PROVIDER_ID = 'google';
let GoogleFrontendApplicationContribution = class GoogleFrontendApplicationContribution {
    constructor() {
        this.prevModels = [];
    }
    onStart() {
        this.preferenceService.ready.then(() => {
            const apiKey = this.preferenceService.get(google_preferences_1.API_KEY_PREF, undefined);
            this.manager.setApiKey(apiKey);
            this.manager.setMaxRetriesOnErrors(this.preferenceService.get(google_preferences_1.MAX_RETRIES, 3));
            this.manager.setRetryDelayOnRateLimitError(this.preferenceService.get(google_preferences_1.RETRY_DELAY_RATE_LIMIT, 60));
            this.manager.setRetryDelayOnOtherErrors(this.preferenceService.get(google_preferences_1.RETRY_DELAY_OTHER_ERRORS, -1));
            const models = this.preferenceService.get(google_preferences_1.MODELS_PREF, []);
            this.manager.createOrUpdateLanguageModels(...models.map(modelId => this.createGeminiModelDescription(modelId)));
            this.prevModels = [...models];
            this.preferenceService.onPreferenceChanged(event => {
                if (event.preferenceName === google_preferences_1.API_KEY_PREF) {
                    this.manager.setApiKey(event.newValue);
                    this.handleKeyChange(event.newValue);
                }
                else if (event.preferenceName === google_preferences_1.MAX_RETRIES) {
                    this.manager.setMaxRetriesOnErrors(event.newValue);
                }
                else if (event.preferenceName === google_preferences_1.RETRY_DELAY_RATE_LIMIT) {
                    this.manager.setRetryDelayOnRateLimitError(event.newValue);
                }
                else if (event.preferenceName === google_preferences_1.RETRY_DELAY_OTHER_ERRORS) {
                    this.manager.setRetryDelayOnOtherErrors(event.newValue);
                }
                else if (event.preferenceName === google_preferences_1.MODELS_PREF) {
                    this.handleModelChanges(event.newValue);
                }
            });
        });
    }
    /**
     * Called when the API key changes. Updates all Google models on the manager to ensure the new key is used.
     */
    handleKeyChange(newApiKey) {
        if (this.prevModels && this.prevModels.length > 0) {
            this.manager.createOrUpdateLanguageModels(...this.prevModels.map(modelId => this.createGeminiModelDescription(modelId)));
        }
    }
    handleModelChanges(newModels) {
        const oldModels = new Set(this.prevModels);
        const updatedModels = new Set(newModels);
        const modelsToRemove = [...oldModels].filter(model => !updatedModels.has(model));
        const modelsToAdd = [...updatedModels].filter(model => !oldModels.has(model));
        this.manager.removeLanguageModels(...modelsToRemove.map(model => `${GOOGLE_PROVIDER_ID}/${model}`));
        this.manager.createOrUpdateLanguageModels(...modelsToAdd.map(modelId => this.createGeminiModelDescription(modelId)));
        this.prevModels = newModels;
    }
    createGeminiModelDescription(modelId) {
        const id = `${GOOGLE_PROVIDER_ID}/${modelId}`;
        const description = {
            id: id,
            model: modelId,
            apiKey: true,
            enableStreaming: true
        };
        return description;
    }
};
exports.GoogleFrontendApplicationContribution = GoogleFrontendApplicationContribution;
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.PreferenceService),
    tslib_1.__metadata("design:type", Object)
], GoogleFrontendApplicationContribution.prototype, "preferenceService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(common_1.GoogleLanguageModelsManager),
    tslib_1.__metadata("design:type", Object)
], GoogleFrontendApplicationContribution.prototype, "manager", void 0);
exports.GoogleFrontendApplicationContribution = GoogleFrontendApplicationContribution = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], GoogleFrontendApplicationContribution);
//# sourceMappingURL=google-frontend-application-contribution.js.map