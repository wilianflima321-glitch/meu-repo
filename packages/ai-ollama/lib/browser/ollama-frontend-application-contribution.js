"use strict";
// *****************************************************************************
// Copyright (C) 2024 TypeFox GmbH.
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
exports.OllamaFrontendApplicationContribution = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const common_1 = require("../common");
const ollama_preferences_1 = require("../common/ollama-preferences");
const core_1 = require("@theia/core");
const OLLAMA_PROVIDER_ID = 'ollama';
let OllamaFrontendApplicationContribution = class OllamaFrontendApplicationContribution {
    constructor() {
        this.prevModels = [];
    }
    onStart() {
        this.preferenceService.ready.then(() => {
            const host = this.preferenceService.get(ollama_preferences_1.HOST_PREF, 'http://localhost:11434');
            this.manager.setHost(host);
            const models = this.preferenceService.get(ollama_preferences_1.MODELS_PREF, []);
            this.manager.createOrUpdateLanguageModels(...models.map(modelId => this.createOllamaModelDescription(modelId)));
            this.prevModels = [...models];
            this.preferenceService.onPreferenceChanged(event => {
                if (event.preferenceName === ollama_preferences_1.HOST_PREF) {
                    this.manager.setHost(event.newValue);
                }
                else if (event.preferenceName === ollama_preferences_1.MODELS_PREF) {
                    this.handleModelChanges(event.newValue);
                }
            });
        });
    }
    handleModelChanges(newModels) {
        const oldModels = new Set(this.prevModels);
        const updatedModels = new Set(newModels);
        const modelsToRemove = [...oldModels].filter(model => !updatedModels.has(model));
        const modelsToAdd = [...updatedModels].filter(model => !oldModels.has(model));
        this.manager.removeLanguageModels(...modelsToRemove);
        this.manager.createOrUpdateLanguageModels(...modelsToAdd.map(modelId => this.createOllamaModelDescription(modelId)));
        this.prevModels = newModels;
    }
    createOllamaModelDescription(modelId) {
        const id = `${OLLAMA_PROVIDER_ID}/${modelId}`;
        return {
            id: id,
            model: modelId
        };
    }
};
exports.OllamaFrontendApplicationContribution = OllamaFrontendApplicationContribution;
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.PreferenceService),
    tslib_1.__metadata("design:type", Object)
], OllamaFrontendApplicationContribution.prototype, "preferenceService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(common_1.OllamaLanguageModelsManager),
    tslib_1.__metadata("design:type", Object)
], OllamaFrontendApplicationContribution.prototype, "manager", void 0);
exports.OllamaFrontendApplicationContribution = OllamaFrontendApplicationContribution = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], OllamaFrontendApplicationContribution);
//# sourceMappingURL=ollama-frontend-application-contribution.js.map