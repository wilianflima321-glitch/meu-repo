// *****************************************************************************
// Copyright (C) 2024 EclipseSource GmbH.
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
    LanguageModelMessage,
    LanguageModelRequest,
    LanguageModelResponse,
    LanguageModelStatus,
    LanguageModelStreamResponse,
    LanguageModelStreamResponsePart,
    LanguageModelTextResponse,
    TokenUsageService,
    UserRequest
} from '@theia/ai-core';
import { CancellationToken, Disposable } from '@theia/core';
import { aethelApiClient, APIError } from '../../../ai-core/src/node/aethel-api-client';

// Tipos simplificados para a requisição ao Aethel Backend
type AethelChatRequest = {
    model: string;
    messages: { role: 'user' | 'assistant' | 'system', content: string }[];
    stream?: boolean;
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
};

export const HuggingFaceModelIdentifier = Symbol('HuggingFaceModelIdentifier');
export const DEFAULT_MAX_TOKENS = 4096;

export class HuggingFaceModel implements LanguageModel {

    /**
     * @param id the unique id for this language model. It will be used to identify the model in the UI.
     * @param model the model id as it is used by the Hugging Face API
     * @param apiKey function to retrieve the API key for Hugging Face (no longer used for direct calls)
     */
    constructor(
        public readonly id: string,
        public model: string,
        public status: LanguageModelStatus,
        public apiKey: () => string | undefined, // Mantido para compatibilidade, mas não mais usado diretamente
        public readonly name?: string,
        public readonly vendor?: string,
        public readonly version?: string,
        public readonly family?: string,
        public readonly maxInputTokens?: number,
        public readonly maxOutputTokens?: number,
        public enableStreaming: boolean = true,
        protected readonly tokenUsageService?: TokenUsageService
    ) { }

    async request(request: UserRequest, cancellationToken?: CancellationToken): Promise<LanguageModelResponse> {
        if (!request.messages?.length) {
            throw new Error('Request must contain at least one message');
        }

        const settings = this.getSettings(request);
        const aethelRequest = this.buildAethelChatRequest(request, settings);

        if (this.shouldStream(settings)) {
            aethelRequest.stream = true;
            return this.handleStreamingRequest(aethelRequest, request, cancellationToken);
        }

        return this.handleNonStreamingRequest(aethelRequest, request);
    }

    protected async handleStreamingRequest(aethelRequest: AethelChatRequest, userRequest: UserRequest, cancellationToken?: CancellationToken): Promise<LanguageModelStreamResponse> {
        const cancellationDisposable: Disposable | undefined = cancellationToken?.onCancellationRequested(() => {
            // A API de stream do Aethel backend (baseada em FastAPI) não suporta cancelamento no meio do stream de forma direta.
            // A melhor abordagem é parar de consumir o iterador, o que o navegador/cliente fará.
        });

        const cleanup = () => {
            cancellationDisposable?.dispose();
        };

        const asyncIterator = {
            async *[Symbol.asyncIterator](): AsyncIterator<LanguageModelStreamResponsePart> {
                try {
                    const stream = aethelApiClient.chatStream(aethelRequest);
                    for await (const chunk of stream) {
                        if (cancellationToken?.isCancellationRequested) {
                            break;
                        }
                        yield { content: chunk };
                    }
                } catch (error) {
                    console.error(`[Aethel] HuggingFace streaming error: ${error}`);
                    if (error instanceof APIError) {
                        throw new Error(`Failed to stream from Aethel Backend for HuggingFace model: ${error.message}`);
                    }
                    throw new Error('An unknown error occurred during HuggingFace streaming.');
                } finally {
                    cleanup();
                }
            }
        };

        return { stream: asyncIterator };
    }

    protected async handleNonStreamingRequest(aethelRequest: AethelChatRequest, userRequest: UserRequest): Promise<LanguageModelResponse> {
        aethelRequest.stream = false;
        try {
            const response = await aethelApiClient.chat(aethelRequest);
            const text = response.message?.content ?? '';

            const usage = (response as any).usage;
            if (this.tokenUsageService && usage) {
                await this.tokenUsageService.recordTokenUsage(this.id, {
                    inputTokens: usage.prompt_tokens,
                    outputTokens: usage.completion_tokens,
                    requestId: userRequest.requestId,
                });
            }

            const result: LanguageModelTextResponse = { text };
            return result;
        } catch (error) {
            if (error instanceof APIError) {
                console.error(`[Aethel] API Error (HuggingFace): ${error.message} (Status: ${error.status})`);
                throw new Error(`Failed to communicate with Aethel Backend for HuggingFace model: ${error.message}`);
            }
            console.error(`[Aethel] Unknown Error (HuggingFace): ${error}`);
            throw new Error('An unknown error occurred while contacting the Aethel Backend for a HuggingFace model.');
        }
    }

    protected getSettings(request: LanguageModelRequest | UserRequest): Record<string, unknown> {
        return request.settings ?? {};
    }

    protected buildAethelChatRequest(request: UserRequest, settings: Record<string, unknown>): AethelChatRequest {
        const maxTokensSetting = this.pickNumber(settings, 'max_tokens');

        return {
            model: `huggingface:${this.model}`,
            messages: this.toChatMessages(request.messages),
            temperature: this.pickNumber(settings, 'temperature'),
            top_p: this.pickNumber(settings, 'top_p'),
            max_tokens: maxTokensSetting ?? this.maxOutputTokens,
        };
    }

    protected pickNumber(settings: Record<string, unknown>, key: string): number | undefined {
        const value = settings[key];
        return typeof value === 'number' ? value : undefined;
    }

    protected shouldStream(settings: Record<string, unknown>): boolean {
        if (!this.enableStreaming) {
            return false;
        }
        if (typeof settings.stream === 'boolean') {
            return settings.stream;
        }
        return true;
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
            case 'system':
                return 'system';
            case 'ai':
                return 'assistant';
            default:
                return 'user';
        }
    }

    protected toStringContent(message: LanguageModelMessage): string | null {
        if (LanguageModelMessage.isTextMessage(message)) {
            return message.text;
        }
        if (LanguageModelMessage.isThinkingMessage(message)) {
            return null;
        }
        // Simplificado para a refatoração inicial
        return JSON.stringify(message);
    }
}
