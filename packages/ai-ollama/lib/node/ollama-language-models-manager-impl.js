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
exports.OllamaLanguageModelsManagerImpl = void 0;
const tslib_1 = require("tslib");
const ai_core_1 = require("@theia/ai-core");
const inversify_1 = require("@theia/core/shared/inversify");
const ollama_language_model_1 = require("./ollama-language-model");
let OllamaLanguageModelsManagerImpl = class OllamaLanguageModelsManagerImpl {
    get host() {
        return this._host;
    }
    calculateStatus(_host) {
        // Connection and routing are delegated to the backend runtime.
        return { status: 'ready' };
    }
    async createOrUpdateLanguageModels(...models) {
        for (const modelDescription of models) {
            const existingModel = await this.languageModelRegistry.getLanguageModel(modelDescription.id);
            const hostProvider = () => this.host;
            if (existingModel) {
                if (!(existingModel instanceof ollama_language_model_1.OllamaModel)) {
                    console.warn(`Ollama: model ${modelDescription.id} is not an Ollama model`);
                    continue;
                }
            }
            else {
                const status = this.calculateStatus(hostProvider());
                this.languageModelRegistry.addLanguageModels([
                    new ollama_language_model_1.OllamaModel(modelDescription.id, modelDescription.model, status, hostProvider, this.tokenUsageService)
                ]);
            }
        }
    }
    removeLanguageModels(...modelIds) {
        this.languageModelRegistry.removeLanguageModels(modelIds.map(id => `ollama/${id}`));
    }
    setHost(host) {
        this._host = host || undefined;
    }
};
exports.OllamaLanguageModelsManagerImpl = OllamaLanguageModelsManagerImpl;
tslib_1.__decorate([
    (0, inversify_1.inject)(ai_core_1.LanguageModelRegistry),
    tslib_1.__metadata("design:type", Object)
], OllamaLanguageModelsManagerImpl.prototype, "languageModelRegistry", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(ai_core_1.TokenUsageService),
    tslib_1.__metadata("design:type", Object)
], OllamaLanguageModelsManagerImpl.prototype, "tokenUsageService", void 0);
exports.OllamaLanguageModelsManagerImpl = OllamaLanguageModelsManagerImpl = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], OllamaLanguageModelsManagerImpl);
//# sourceMappingURL=ollama-language-models-manager-impl.js.map