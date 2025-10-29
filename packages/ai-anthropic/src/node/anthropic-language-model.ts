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

import {
    LanguageModel,
    LanguageModelMessage,
    LanguageModelRequest,
    LanguageModelResponse,
    LanguageModelTextResponse,
    LanguageModelStatus,
    TokenUsageService,
    UserRequest
} from '@theia/ai-core';
import { CancellationToken } from '@theia/core';
import { aethelApiClient, APIError } from '@theia/ai-core/lib/node';

// Tipos simplificados para a requisição ao Aethel Backend
type AethelChatRequest = {
    model: string;
    messages: { role: 'user' | 'assistant' | 'system', content: string }[];
    stream?: boolean;
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
};

export const DEFAULT_MAX_TOKENS = 4096;
export const AnthropicModelIdentifier = Symbol('AnthropicModelIdentifier');

export class AnthropicModel implements LanguageModel {

    constructor(
        public readonly id: string,
        public model: string,
        public status: LanguageModelStatus,
        public enableStreaming: boolean,
        public useCaching: boolean,
        public maxTokens: number = DEFAULT_MAX_TOKENS,
        public maxRetries: number = 3,
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

        // Ignorar streaming por enquanto para simplificar a refatoração.
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
                console.error(`[Aethel] API Error (Anthropic): ${error.message} (Status: ${error.status})`);
                throw new Error(`Failed to communicate with Aethel Backend for Anthropic model: ${error.message}`);
            }
            console.error(`[Aethel] Unknown Error (Anthropic): ${error}`);
            throw new Error('An unknown error occurred while contacting the Aethel Backend for an Anthropic model.');
        }
    }

    protected buildAethelChatRequest(request: UserRequest, settings: Readonly<Record<string, unknown>>): AethelChatRequest {
        const maxTokensSetting = this.pickNumber(settings, 'max_tokens');

        return {
            model: `anthropic:${this.model}`,
            messages: this.toChatMessages(request.messages),
            temperature: this.pickNumber(settings, 'temperature'),
            top_p: this.pickNumber(settings, 'top_p'),
            max_tokens: maxTokensSetting ?? this.maxTokens,
        };
    }

    protected pickNumber(settings: Readonly<Record<string, unknown>>, key: string): number | undefined {
        const value = settings[key];
        return typeof value === 'number' ? value : undefined;
    }

    protected toChatMessages(messages: LanguageModelMessage[]): { role: 'user' | 'assistant' | 'system', content: string }[] {
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
        if (message.actor === 'system') {
            return 'system';
        }
        if (message.actor === 'ai') {
            return 'assistant';
        }
        return 'user';
    }

    protected toStringContent(message: LanguageModelMessage): string | null {
        if (LanguageModelMessage.isTextMessage(message)) {
            return message.text;
        }
        if (LanguageModelMessage.isThinkingMessage(message)) {
            // Ignorar mensagens de "thinking"
            return null;
        }
        // Simplificado para não suportar tools e images nesta refatoração inicial
        return JSON.stringify(message);
    }
}
