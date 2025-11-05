// *****************************************************************************
// Copyright (C) 2024 TypeFox GmbH.
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
    LanguageModelParsedResponse,
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
import { aethelApiClient, APIError } from '@theia/ai-core/lib/node/aethel-api-client';

// Tipos simplificados para a requisição ao Aethel Backend
interface AethelChatRequest {
    model: string;
    messages: { role: 'user' | 'assistant' | 'system', content: string }[];
    stream?: boolean;
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    // Outros parâmetros podem ser adicionados aqui conforme necessário
}

export const OllamaModelIdentifier = Symbol('OllamaModelIdentifier');

export class OllamaModel implements LanguageModel {

    readonly providerId = 'ollama';
    readonly vendor: string = 'Ollama';

    constructor(
        public readonly id: string,
        protected readonly model: string,
        public status: LanguageModelStatus,
        protected host: () => string | undefined, // Mantido para possível uso futuro em metadados
        protected readonly tokenUsageService?: TokenUsageService
    ) { }

    async request(request: UserRequest, cancellationToken?: CancellationToken): Promise<LanguageModelResponse> {
        const settings = this.getSettings(request);
        const aethelRequest = this.buildAethelChatRequest(request, settings);

        if (this.shouldStream(settings)) {
            aethelRequest.stream = true;
            return this.handleStreamingRequest(aethelRequest, request, cancellationToken);
        }

        return this.handleNonStreamingRequest(aethelRequest, request);
    }

    protected async handleStreamingRequest(
        aethelRequest: AethelChatRequest, userRequest: UserRequest, cancellationToken?: CancellationToken
    ): Promise<LanguageModelStreamResponse> {
        const cancellationDisposable: Disposable | undefined = cancellationToken?.onCancellationRequested(() => {
            // A API de stream do Aethel backend (baseada em FastAPI) não suporta cancelamento
            // no meio do stream de forma direta. A melhor abordagem é parar de consumir o iterador,
            // o que o navegador/cliente fará. O backend eventualmente perceberá a conexão fechada.
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
                        // O chunk do nosso backend é o próprio conteúdo de texto
                        yield { content: chunk };
                    }
                } catch (error) {
                    console.error(`[Aethel] Ollama streaming error: ${error}`);
                    if (error instanceof APIError) {
                        throw new Error(`Failed to stream from Aethel Backend for Ollama model: ${error.message}`);
                    }
                    throw new Error('An unknown error occurred during Ollama streaming.');
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
            const content = response.message?.content ?? '';

            if (userRequest.response_format?.type === 'json_schema') {
                return this.buildParsedResponse(content);
            }

            interface ChatResponseWithUsage {
                usage?: { prompt_tokens?: number; completion_tokens?: number };
            }
            const usage = (response as unknown as ChatResponseWithUsage).usage;
            if (this.tokenUsageService && usage) {
                await this.tokenUsageService.recordTokenUsage(this.id, {
                    inputTokens: usage.prompt_tokens ?? 0,
                    outputTokens: usage.completion_tokens ?? 0,
                    requestId: userRequest.requestId,
                });
            }

            const result: LanguageModelTextResponse = { text: content };
            return result;
        } catch (error) {
            if (error instanceof APIError) {
                console.error(`[Aethel] API Error (Ollama): ${error.message} (Status: ${error.status})`);
                throw new Error(`Failed to communicate with Aethel Backend for Ollama model: ${error.message}`);
            }
            console.error(`[Aethel] Unknown Error (Ollama): ${error}`);
            throw new Error('An unknown error occurred while contacting the Aethel Backend for an Ollama model.');
        }
    }

    protected getSettings(request: LanguageModelRequest | UserRequest): Record<string, unknown> {
        return request.settings ?? {};
    }

    protected buildAethelChatRequest(request: UserRequest, settings: Record<string, unknown>): AethelChatRequest {
        // O host pode ser passado como um metadado, se o backend o suportar.
        // Por enquanto, a seleção do host Ollama é responsabilidade do Aethel Backend.
        return {
            model: `ollama:${this.model}`,
            messages: this.toChatMessages(request.messages),
            temperature: this.pickNumber(settings, 'temperature'),
            top_p: this.pickNumber(settings, 'top_p'),
            frequency_penalty: this.pickNumber(settings, 'frequency_penalty'),
            presence_penalty: this.pickNumber(settings, 'presence_penalty'),
            max_tokens: this.pickNumber(settings, 'max_tokens'),
        };
    }

    protected pickNumber(settings: Record<string, unknown>, key: string): number | undefined {
        const value = settings[key];
        return typeof value === 'number' ? value : undefined;
    }

    protected shouldStream(settings: Record<string, unknown>): boolean {
        if (typeof settings.stream === 'boolean') {
            return settings.stream;
        }
        return true; // Streaming como padrão
    }

    protected toChatMessages(messages: readonly LanguageModelMessage[]): { role: 'user' | 'assistant' | 'system', content: string }[] {
        return messages
            .map(message => {
                const role = this.toRole(message);
                const content = this.toStringContent(message);
                if (content) {
                    return { role, content };
                }
                return undefined;
            })
            .filter((m): m is { role: 'user' | 'assistant' | 'system', content: string } => m !== undefined);
    }

    protected toRole(message: LanguageModelMessage): 'system' | 'user' | 'assistant' {
        // Simplificado: O backend agora lida com a complexidade de 'tool'
        switch (message.actor) {
            case 'ai':
                return 'assistant';
            case 'system':
                return 'system';
            default:
                return 'user';
        }
    }

    protected toStringContent(message: LanguageModelMessage): string | undefined {
        if (LanguageModelMessage.isTextMessage(message)) {
            return message.text;
        }
        if (LanguageModelMessage.isThinkingMessage(message)) {
            return undefined; // Ignorar mensagens de "thinking"
        }
        // A lógica complexa de tools, images, etc., é simplificada ou delegada ao backend.
        // Por enquanto, apenas o conteúdo de texto é suportado nesta refatoração.
        return JSON.stringify(message);
    }

    protected buildParsedResponse(content: string): LanguageModelParsedResponse {
        try {
            return {
                content,
                parsed: JSON.parse(content)
            };
        } catch {
            return {
                content,
                parsed: {}
            };
        }
    }
}
