// *****************************************************************************
// Copyright (C) 2025 Aethel Project.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0
// *****************************************************************************

// *****************************************************************************
// Copyright (C) 2017 Ericsson and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0/.
//
// This Source Code may also be made available under the following Secondary
// Licenses when the conditions for such availability set forth in the Eclipse
// Public License v. 2.0 are satisfied: GNU General Public License, version 2
// with the GNU Classpath Exception which is available at
// https://www.gnu.org/software/classpath/license.html.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
    LanguageModel,
    LanguageModelMessage,
    LanguageModelRequest,
    LanguageModelResponse,
    LanguageModelStatus,
    LanguageModelTextResponse,
    TokenUsageService,
    UserRequest
} from '@theia/ai-core';
import { CancellationToken } from '@theia/core';
import { injectable } from '@theia/core/shared/inversify';
import { aethelApiClient, APIError } from '@theia/ai-core/lib/node/aethel-api-client';

// Tipos simplificados para a requisição ao Aethel Backend
interface AethelChatRequest {
    model: string;
    messages: { role: 'user' | 'assistant' | 'system', content: string }[];
    stream?: boolean;
    // Adicionar outros parâmetros que o backend Aethel suporta, se necessário
    temperature?: number;
    max_tokens?: number;
}

export const OpenAiModelIdentifier = Symbol('OpenAiModelIdentifier');
export type DeveloperMessageSettings = 'user' | 'system' | 'developer' | 'mergeWithFollowingUserMessage' | 'skip';

export class OpenAiModel implements LanguageModel {

    constructor(
        public readonly id: string,
        public model: string,
        public status: LanguageModelStatus,
        public enableStreaming: boolean,
        public apiKey: () => string | undefined,
        public apiVersion: () => string | undefined,
        public supportsStructuredOutput: boolean,
        public url: string | undefined,
        public openAiModelUtils: OpenAiModelUtils,
        public developerMessageSettings: DeveloperMessageSettings = 'developer',
        public maxRetries: number = 3,
        protected readonly tokenUsageService?: TokenUsageService
    ) { }

    protected getSettings(request: LanguageModelRequest): Record<string, unknown> {
        return request.settings ?? {};
    }

    async request(request: UserRequest, cancellationToken?: CancellationToken): Promise<LanguageModelResponse> {
        // TODO: Lidar com cancellationToken
        const settings = this.getSettings(request);
        const aethelRequest = this.buildAethelChatRequest(request, settings);

        // Ignorar streaming por enquanto para simplificar a refatoração.
        // O streaming deve ser reimplementado para consumir o SSE do backend Aethel.
        aethelRequest.stream = false;

        try {
            const response = await aethelApiClient.chat(aethelRequest);

            const text = response.message?.content ?? '';

            interface ChatResponseWithUsage {
                usage?: { prompt_tokens?: number; completion_tokens?: number };
            }
            const maybeUsage = (response as unknown as ChatResponseWithUsage).usage;
            if (this.tokenUsageService && maybeUsage) {
                await this.tokenUsageService.recordTokenUsage(this.id, {
                    inputTokens: maybeUsage.prompt_tokens ?? 0,
                    outputTokens: maybeUsage.completion_tokens ?? 0,
                    requestId: request.requestId,
                });
            }

            const result: LanguageModelTextResponse = { text };
            return result;
        } catch (error) {
            if (error instanceof APIError) {
                console.error(`[Aethel] API Error: ${error.message} (Status: ${error.status})`);
                throw new Error(`Failed to communicate with Aethel Backend: ${error.message}`);
            }
            console.error(`[Aethel] Unknown Error: ${error}`);
            throw new Error('An unknown error occurred while contacting the Aethel Backend.');
        }
    }

    protected buildAethelChatRequest(request: UserRequest, settings: Record<string, unknown>): AethelChatRequest {
        const processedMessages = this.openAiModelUtils.processMessages(request.messages, this.developerMessageSettings, this.model);

        return {
            // O modelo agora é um identificador para o backend Aethel, ex: "openai:gpt-4o-mini"
            model: `openai:${this.model}`,
            messages: processedMessages,
            temperature: this.pickNumber(settings, 'temperature'),
            max_tokens: this.pickNumber(settings, 'max_tokens'),
            // Adicionar outros parâmetros conforme o backend Aethel evoluir
        };
    }

    protected pickNumber(settings: Record<string, unknown>, key: string): number | undefined {
        const value = settings[key];
        return typeof value === 'number' ? value : undefined;
    }
}

/**
 * Utility class for processing messages for the OpenAI language model.
 * Esta classe agora converte as mensagens para o formato esperado pelo Aethel Backend.
 */
@injectable()
export class OpenAiModelUtils {

    processMessages(
        messages: LanguageModelMessage[],
        developerMessageSettings: DeveloperMessageSettings,
        model: string
    ): { role: 'user' | 'assistant' | 'system', content: string }[] {
        // A lógica original de processamento de mensagens do Theia pode ser mantida
        // se o formato for compatível com o que o backend Aethel espera.
        // Por simplicidade, faremos uma conversão direta.
        return messages.map(message => {
            let role: 'user' | 'assistant' | 'system';
            let content = '';

            if (LanguageModelMessage.isTextMessage(message)) {
                content = message.text;
            } else if (LanguageModelMessage.isThinkingMessage(message)) {
                // Ignorar mensagens de "thinking"
                return undefined;
            }
            // Adicionar tratamento para outros tipos de mensagem se necessário (Tool, Image, etc.)

            switch (message.actor) {
                case 'ai':
                    role = 'assistant';
                    break;
                case 'system':
                    role = 'system';
                    break;
                case 'user':
                default:
                    role = 'user';
                    break;
            }

            if (content) {
                return { role, content };
            }
            return undefined;
        }).filter((m): m is { role: 'user' | 'assistant' | 'system', content: string } => m !== undefined);
    }
}
