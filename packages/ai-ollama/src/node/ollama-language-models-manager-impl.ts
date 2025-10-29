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

import { LanguageModelRegistry, LanguageModelStatus, TokenUsageService } from '@theia/ai-core';
import { inject, injectable } from '@theia/core/shared/inversify';
import { OllamaModel } from './ollama-language-model';
import { OllamaLanguageModelsManager, OllamaModelDescription } from '../common';

@injectable()
export class OllamaLanguageModelsManagerImpl implements OllamaLanguageModelsManager {

    protected _host: string | undefined;

    @inject(LanguageModelRegistry)
    protected readonly languageModelRegistry: LanguageModelRegistry;

    @inject(TokenUsageService)
    protected readonly tokenUsageService: TokenUsageService;

    get host(): string | undefined {
        return this._host;
    }

    protected calculateStatus(_host: string | undefined): LanguageModelStatus {
        // Connection and routing are delegated to the backend runtime.
        return { status: 'ready' };
    }

    async createOrUpdateLanguageModels(...models: OllamaModelDescription[]): Promise<void> {
        for (const modelDescription of models) {
            const existingModel = await this.languageModelRegistry.getLanguageModel(modelDescription.id);
            const hostProvider = () => this.host;

            if (existingModel) {
                if (!(existingModel instanceof OllamaModel)) {
                    console.warn(`Ollama: model ${modelDescription.id} is not an Ollama model`);
                    continue;
                }
            } else {
                const status = this.calculateStatus(hostProvider());
                this.languageModelRegistry.addLanguageModels([
                    new OllamaModel(
                        modelDescription.id,
                        modelDescription.model,
                        status,
                        hostProvider,
                        this.tokenUsageService
                    )
                ]);
            }
        }
    }

    removeLanguageModels(...modelIds: string[]): void {
        this.languageModelRegistry.removeLanguageModels(modelIds.map(id => `ollama/${id}`));
    }

    setHost(host: string | undefined): void {
        this._host = host || undefined;
    }
}
