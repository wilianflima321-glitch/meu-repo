"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaModel = exports.OllamaModelIdentifier = void 0;
const ai_core_1 = require("@theia/ai-core");
const aethel_api_client_1 = require("../../../ai-core/src/node/aethel-api-client");
exports.OllamaModelIdentifier = Symbol('OllamaModelIdentifier');
class OllamaModel {
    constructor(id, model, status, host, // Mantido para possível uso futuro em metadados
    tokenUsageService) {
        this.id = id;
        this.model = model;
        this.status = status;
        this.host = host;
        this.tokenUsageService = tokenUsageService;
        this.providerId = 'ollama';
        this.vendor = 'Ollama';
    }
    async request(request, cancellationToken) {
        const settings = this.getSettings(request);
        const aethelRequest = this.buildAethelChatRequest(request, settings);
        if (this.shouldStream(settings)) {
            aethelRequest.stream = true;
            return this.handleStreamingRequest(aethelRequest, request, cancellationToken);
        }
        return this.handleNonStreamingRequest(aethelRequest, request);
    }
    async handleStreamingRequest(aethelRequest, userRequest, cancellationToken) {
        const cancellationDisposable = cancellationToken === null || cancellationToken === void 0 ? void 0 : cancellationToken.onCancellationRequested(() => {
            // A API de stream do Aethel backend (baseada em FastAPI) não suporta cancelamento no meio do stream de forma direta.
            // A melhor abordagem é parar de consumir o iterador, o que o navegador/cliente fará.
            // O backend eventualmente perceberá a conexão fechada.
        });
        const cleanup = () => {
            cancellationDisposable === null || cancellationDisposable === void 0 ? void 0 : cancellationDisposable.dispose();
        };
        const asyncIterator = {
            async *[Symbol.asyncIterator]() {
                try {
                    const stream = aethel_api_client_1.aethelApiClient.chatStream(aethelRequest);
                    for await (const chunk of stream) {
                        if (cancellationToken === null || cancellationToken === void 0 ? void 0 : cancellationToken.isCancellationRequested) {
                            break;
                        }
                        // O chunk do nosso backend é o próprio conteúdo de texto
                        yield { content: chunk };
                    }
                }
                catch (error) {
                    console.error(`[Aethel] Ollama streaming error: ${error}`);
                    if (error instanceof aethel_api_client_1.APIError) {
                        throw new Error(`Failed to stream from Aethel Backend for Ollama model: ${error.message}`);
                    }
                    throw new Error('An unknown error occurred during Ollama streaming.');
                }
                finally {
                    cleanup();
                }
            }
        };
        return { stream: asyncIterator };
    }
    async handleNonStreamingRequest(aethelRequest, userRequest) {
        var _a, _b, _c;
        aethelRequest.stream = false;
        try {
            const response = await aethel_api_client_1.aethelApiClient.chat(aethelRequest);
            const content = (_b = (_a = response.message) === null || _a === void 0 ? void 0 : _a.content) !== null && _b !== void 0 ? _b : '';
            if (((_c = userRequest.response_format) === null || _c === void 0 ? void 0 : _c.type) === 'json_schema') {
                return this.buildParsedResponse(content);
            }
            const usage = response.usage;
            if (this.tokenUsageService && usage) {
                await this.tokenUsageService.recordTokenUsage(this.id, {
                    inputTokens: usage.prompt_tokens,
                    outputTokens: usage.completion_tokens,
                    requestId: userRequest.requestId,
                });
            }
            const result = { text: content };
            return result;
        }
        catch (error) {
            if (error instanceof aethel_api_client_1.APIError) {
                console.error(`[Aethel] API Error (Ollama): ${error.message} (Status: ${error.status})`);
                throw new Error(`Failed to communicate with Aethel Backend for Ollama model: ${error.message}`);
            }
            console.error(`[Aethel] Unknown Error (Ollama): ${error}`);
            throw new Error('An unknown error occurred while contacting the Aethel Backend for an Ollama model.');
        }
    }
    getSettings(request) {
        var _a;
        return (_a = request.settings) !== null && _a !== void 0 ? _a : {};
    }
    buildAethelChatRequest(request, settings) {
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
    pickNumber(settings, key) {
        const value = settings[key];
        return typeof value === 'number' ? value : undefined;
    }
    shouldStream(settings) {
        if (typeof settings.stream === 'boolean') {
            return settings.stream;
        }
        return true; // Streaming como padrão
    }
    toChatMessages(messages) {
        return messages
            .map(message => {
            const role = this.toRole(message);
            const content = this.toStringContent(message);
            if (content) {
                return { role, content };
            }
            return null;
        })
            .filter((m) => m !== null);
    }
    toRole(message) {
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
    toStringContent(message) {
        if (ai_core_1.LanguageModelMessage.isTextMessage(message)) {
            return message.text;
        }
        if (ai_core_1.LanguageModelMessage.isThinkingMessage(message)) {
            return null; // Ignorar mensagens de "thinking"
        }
        // A lógica complexa de tools, images, etc., é simplificada ou delegada ao backend.
        // Por enquanto, apenas o conteúdo de texto é suportado nesta refatoração.
        return JSON.stringify(message);
    }
    buildParsedResponse(content) {
        try {
            return {
                content,
                parsed: JSON.parse(content)
            };
        }
        catch {
            return {
                content,
                parsed: {}
            };
        }
    }
}
exports.OllamaModel = OllamaModel;
//# sourceMappingURL=ollama-language-model.js.map