"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleModel = exports.GoogleModelIdentifier = void 0;
const ai_core_1 = require("@theia/ai-core");
const node_1 = require("@theia/ai-core/lib/node");
exports.GoogleModelIdentifier = Symbol('GoogleModelIdentifier');
/**
 * Implements the Google language model integration for Theia by calling the central Aethel backend.
 */
class GoogleModel {
    constructor(id, model, status, enableStreaming, apiKey, // Mantido para compatibilidade, mas não mais usado para chamadas diretas
    retrySettings, tokenUsageService) {
        this.id = id;
        this.model = model;
        this.status = status;
        this.enableStreaming = enableStreaming;
        this.apiKey = apiKey;
        this.retrySettings = retrySettings;
        this.tokenUsageService = tokenUsageService;
    }
    getSettings(request) {
        var _a;
        return (_a = request.settings) !== null && _a !== void 0 ? _a : {};
    }
    async request(request, cancellationToken) {
        var _a, _b, _c;
        if (!((_a = request.messages) === null || _a === void 0 ? void 0 : _a.length)) {
            throw new Error('Request must contain at least one message');
        }
        const settings = this.getSettings(request);
        const aethelRequest = this.buildAethelChatRequest(request, settings);
        // A lógica de streaming e retry agora é responsabilidade do Aethel Backend.
        // A chamada aqui é simplificada.
        aethelRequest.stream = false;
        try {
            const response = await node_1.aethelApiClient.chat(aethelRequest);
            const text = (_c = (_b = response.message) === null || _b === void 0 ? void 0 : _b.content) !== null && _c !== void 0 ? _c : '';
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
            if (error instanceof node_1.APIError) {
                console.error(`[Aethel] API Error (Google): ${error.message} (Status: ${error.status})`);
                throw new Error(`Failed to communicate with Aethel Backend for Google model: ${error.message}`);
            }
            console.error(`[Aethel] Unknown Error (Google): ${error}`);
            throw new Error('An unknown error occurred while contacting the Aethel Backend for a Google model.');
        }
    }
    buildAethelChatRequest(request, settings) {
        return {
            model: `google:${this.model}`,
            messages: this.toChatMessages(request.messages),
            temperature: this.pickNumber(settings, 'temperature'),
            max_tokens: this.pickNumber(settings, 'max_tokens'),
        };
    }
    pickNumber(settings, key) {
        const value = settings[key];
        return typeof value === 'number' ? value : undefined;
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
        // Simplificado para não suportar tools e images nesta refatoração inicial
        // A lógica complexa de transformação de mensagens foi removida pois agora é responsabilidade do backend.
        return JSON.stringify(message);
    }
}
exports.GoogleModel = GoogleModel;
//# sourceMappingURL=google-language-model.js.map