"use strict";
// *****************************************************************************
// Copyright (C) 2025 Aethel Project.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0
// *****************************************************************************
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAiModelUtils = exports.OpenAiModel = exports.OpenAiModelIdentifier = void 0;
const tslib_1 = require("tslib");
const ai_core_1 = require("@theia/ai-core");
const inversify_1 = require("inversify");
const aethel_api_client_1 = require("@theia/ai-core/lib/node/aethel-api-client");
exports.OpenAiModelIdentifier = Symbol('OpenAiModelIdentifier');
class OpenAiModel {
    constructor(id, model, status, enableStreaming, apiKey, apiVersion, supportsStructuredOutput, url, openAiModelUtils, developerMessageSettings = 'developer', maxRetries = 3, tokenUsageService) {
        this.id = id;
        this.model = model;
        this.status = status;
        this.enableStreaming = enableStreaming;
        this.apiKey = apiKey;
        this.apiVersion = apiVersion;
        this.supportsStructuredOutput = supportsStructuredOutput;
        this.url = url;
        this.openAiModelUtils = openAiModelUtils;
        this.developerMessageSettings = developerMessageSettings;
        this.maxRetries = maxRetries;
        this.tokenUsageService = tokenUsageService;
    }
    getSettings(request) {
        var _a;
        return (_a = request.settings) !== null && _a !== void 0 ? _a : {};
    }
    async request(request, cancellationToken) {
        var _a, _b;
        // TODO: Lidar com cancellationToken
        const settings = this.getSettings(request);
        const aethelRequest = this.buildAethelChatRequest(request, settings);
        // Ignorar streaming por enquanto para simplificar a refatoração.
        // O streaming deve ser reimplementado para consumir o SSE do backend Aethel.
        aethelRequest.stream = false;
        try {
            const response = await aethel_api_client_1.aethelApiClient.chat(aethelRequest);
            const text = (_b = (_a = response.message) === null || _a === void 0 ? void 0 : _a.content) !== null && _b !== void 0 ? _b : '';
            if (this.tokenUsageService && response.usage) {
                await this.tokenUsageService.recordTokenUsage(this.id, {
                    inputTokens: response.usage.prompt_tokens,
                    outputTokens: response.usage.completion_tokens,
                    requestId: request.requestId,
                });
            }
            const result = { text };
            return result;
        }
        catch (error) {
            if (error instanceof aethel_api_client_1.APIError) {
                console.error(`[Aethel] API Error: ${error.message} (Status: ${error.status})`);
                throw new Error(`Failed to communicate with Aethel Backend: ${error.message}`);
            }
            console.error(`[Aethel] Unknown Error: ${error}`);
            throw new Error('An unknown error occurred while contacting the Aethel Backend.');
        }
    }
    buildAethelChatRequest(request, settings) {
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
    pickNumber(settings, key) {
        const value = settings[key];
        return typeof value === 'number' ? value : undefined;
    }
}
exports.OpenAiModel = OpenAiModel;
/**
 * Utility class for processing messages for the OpenAI language model.
 * Esta classe agora converte as mensagens para o formato esperado pelo Aethel Backend.
 */
let OpenAiModelUtils = class OpenAiModelUtils {
    processMessages(messages, developerMessageSettings, model) {
        // A lógica original de processamento de mensagens do Theia pode ser mantida
        // se o formato for compatível com o que o backend Aethel espera.
        // Por simplicidade, faremos uma conversão direta.
        return messages.map(message => {
            let role;
            let content = '';
            if (ai_core_1.LanguageModelMessage.isTextMessage(message)) {
                content = message.text;
            }
            else if (ai_core_1.LanguageModelMessage.isThinkingMessage(message)) {
                // Ignorar mensagens de "thinking"
                return null;
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
            return null;
        }).filter((m) => m !== null);
    }
};
exports.OpenAiModelUtils = OpenAiModelUtils;
exports.OpenAiModelUtils = OpenAiModelUtils = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], OpenAiModelUtils);
//# sourceMappingURL=openai-language-model.js.map