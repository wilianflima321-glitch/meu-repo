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

import { LanguageModelRegistry, LanguageModelStatus, TokenUsageService } from '@theia/ai-core';
import { inject, injectable } from '@theia/core/shared/inversify';
import { OpenAiModel, OpenAiModelUtils } from './openai-language-model';
import { OpenAiLanguageModelsManager, OpenAiModelDescription } from '../common';

@injectable()
export class OpenAiLanguageModelsManagerImpl implements OpenAiLanguageModelsManager {

    @inject(OpenAiModelUtils)
    protected readonly openAiModelUtils: OpenAiModelUtils;

    protected _apiKey: string | undefined;
    protected _apiVersion: string | undefined;

    @inject(LanguageModelRegistry)
    protected readonly languageModelRegistry: LanguageModelRegistry;

    @inject(TokenUsageService)
    protected readonly tokenUsageService: TokenUsageService;

    get apiKey(): string | undefined {
        return this._apiKey;
    }

    get apiVersion(): string | undefined {
        return this._apiVersion;
    }

    protected calculateStatus(_modelDescription: OpenAiModelDescription, _effectiveApiKey: string | undefined): LanguageModelStatus {
        // The backend service handles credentials and routing, so from the IDE perspective
        // the model is always ready as long as the runtime is reachable.
        return { status: 'ready' };
    }

    // Triggered from frontend. In case you want to use the models on the backend
    // without a frontend then call this yourself
    async createOrUpdateLanguageModels(...modelDescriptions: OpenAiModelDescription[]): Promise<void> {
        for (const modelDescription of modelDescriptions) {
            const model = await this.languageModelRegistry.getLanguageModel(modelDescription.id);
            const apiKeyProvider = () => this.apiKey;
            const apiVersionProvider = () => this.apiVersion;

            const status = this.calculateStatus(modelDescription, undefined);

            if (model) {
                if (!(model instanceof OpenAiModel)) {
                    console.warn(`OpenAI: model ${modelDescription.id} is not an OpenAI model`);
                    continue;
                }
                await this.languageModelRegistry.patchLanguageModel<OpenAiModel>(modelDescription.id, {
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
            } else {
                this.languageModelRegistry.addLanguageModels([
                    new OpenAiModel(
                        modelDescription.id,
                        modelDescription.model,
                        status,
                        modelDescription.enableStreaming,
                        apiKeyProvider,
                        apiVersionProvider,
                        modelDescription.supportsStructuredOutput,
                        modelDescription.url,
                        this.openAiModelUtils,
                        modelDescription.developerMessageSettings,
                        modelDescription.maxRetries,
                        this.tokenUsageService
                    )
                ]);
            }
        }
    }

    removeLanguageModels(...modelIds: string[]): void {
        this.languageModelRegistry.removeLanguageModels(modelIds);
    }

    setApiKey(apiKey: string | undefined): void {
        this._apiKey = apiKey;
    }

    setApiVersion(apiVersion: string | undefined): void {
        this._apiVersion = apiVersion;
    }
}
