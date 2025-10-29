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

import {
    LanguageModel,
    LanguageModelRequest,
    LanguageModelMessage,
    LanguageModelResponse,
    LanguageModelTextResponse,
    TokenUsageService,
    UserRequest,
    LanguageModelStatus
} from '@theia/ai-core';
import { CancellationToken } from '@theia/core';
import { aethelApiClient, APIError } from '@theia/ai-core/lib/node';
import { GoogleLanguageModelRetrySettings } from './google-language-models-manager-impl';

// Tipos simplificados para a requisição ao Aethel Backend
type AethelChatRequest = {
    model: string;
    messages: { role: 'user' | 'assistant' | 'system', content: string }[];
    stream?: boolean;
    temperature?: number;
    max_tokens?: number;
};

export const GoogleModelIdentifier = Symbol('GoogleModelIdentifier');

/**
 * Implements the Google language model integration for Theia by calling the central Aethel backend.
 */
export class GoogleModel implements LanguageModel {

    constructor(
        public readonly id: string,
        public model: string,
        public status: LanguageModelStatus,
        public enableStreaming: boolean,
        public apiKey: () => string | undefined, // Mantido para compatibilidade, mas não mais usado para chamadas diretas
        public retrySettings: () => GoogleLanguageModelRetrySettings,
        protected readonly tokenUsageService?: TokenUsageService
    ) { }

    protected getSettings(request: LanguageModelRequest): Readonly<Record<string, unknown>> {
        return request.settings ?? {};
    }

    async request(request: UserRequest, cancellationToken?: CancellationToken): Promise<LanguageModelResponse> {
        if (!request.messages?.length) {
            throw new Error('Request must contain at least one message');
        }

        const settings = this.getSettings(request);
        const aethelRequest = this.buildAethelChatRequest(request, settings);

        // A lógica de streaming e retry agora é responsabilidade do Aethel Backend.
        // A chamada aqui é simplificada.
        aethelRequest.stream = false;

        try {
            const response = await aethelApiClient.chat(aethelRequest);

            const text = response.message?.content ?? '';

            const maybeUsage = (response as any).usage;
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
                console.error(`[Aethel] API Error (Google): ${error.message} (Status: ${error.status})`);
                throw new Error(`Failed to communicate with Aethel Backend for Google model: ${error.message}`);
            }
            console.error(`[Aethel] Unknown Error (Google): ${error}`);
            throw new Error('An unknown error occurred while contacting the Aethel Backend for a Google model.');
        }
    }

    protected buildAethelChatRequest(request: UserRequest, settings: Readonly<Record<string, unknown>>): AethelChatRequest {
        return {
            model: `google:${this.model}`,
            messages: this.toChatMessages(request.messages),
            temperature: this.pickNumber(settings, 'temperature'),
            max_tokens: this.pickNumber(settings, 'max_tokens'),
        };
    }

    protected pickNumber(settings: Readonly<Record<string, unknown>>, key: string): number | undefined {
        const value = settings[key];
        return typeof value === 'number' ? value : undefined;
    }

    protected toChatMessages(messages: readonly LanguageModelMessage[]): { role: 'user' | 'assistant' | 'system', content: string }[] {
        return messages
            .map(message => {
                const role = this.toRole(message);
                const content = this.toStringContent(message);
                if (content) {
                    return { role, content };
                }
                return null;
            })
            .filter((m): m is { role: 'user' | 'assistant' | 'system', content: string } => m !== null);
    }

    protected toRole(message: LanguageModelMessage): 'system' | 'user' | 'assistant' {
        switch (message.actor) {
            case 'ai':
                return 'assistant';
            case 'system':
                return 'system';
            default:
                return 'user';
        }
    }

    protected toStringContent(message: LanguageModelMessage): string | null {
        if (LanguageModelMessage.isTextMessage(message)) {
            return message.text;
        }
        if (LanguageModelMessage.isThinkingMessage(message)) {
            return null; // Ignorar mensagens de "thinking"
        }
        // Simplificado para não suportar tools e images nesta refatoração inicial
        // A lógica complexa de transformação de mensagens foi removida pois agora é responsabilidade do backend.
        return JSON.stringify(message);
    }
}
