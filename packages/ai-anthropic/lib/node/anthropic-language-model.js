"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnthropicModel = exports.AnthropicModelIdentifier = exports.DEFAULT_MAX_TOKENS = void 0;
const ai_core_1 = require("@theia/ai-core");
const node_1 = require("@theia/ai-core/lib/node");
exports.DEFAULT_MAX_TOKENS = 4096;
exports.AnthropicModelIdentifier = Symbol('AnthropicModelIdentifier');
class AnthropicModel {
    constructor(id, model, status, enableStreaming, useCaching, maxTokens = exports.DEFAULT_MAX_TOKENS, maxRetries = 3, tokenUsageService) {
        this.id = id;
        this.model = model;
        this.status = status;
        this.enableStreaming = enableStreaming;
        this.useCaching = useCaching;
        this.maxTokens = maxTokens;
        this.maxRetries = maxRetries;
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
        // Ignorar streaming por enquanto para simplificar a refatoração.
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
                console.error(`[Aethel] API Error (Anthropic): ${error.message} (Status: ${error.status})`);
                throw new Error(`Failed to communicate with Aethel Backend for Anthropic model: ${error.message}`);
            }
            console.error(`[Aethel] Unknown Error (Anthropic): ${error}`);
            throw new Error('An unknown error occurred while contacting the Aethel Backend for an Anthropic model.');
        }
    }
    buildAethelChatRequest(request, settings) {
        const maxTokensSetting = this.pickNumber(settings, 'max_tokens');
        return {
            model: `anthropic:${this.model}`,
            messages: this.toChatMessages(request.messages),
            temperature: this.pickNumber(settings, 'temperature'),
            top_p: this.pickNumber(settings, 'top_p'),
            max_tokens: maxTokensSetting !== null && maxTokensSetting !== void 0 ? maxTokensSetting : this.maxTokens,
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
        if (message.actor === 'system') {
            return 'system';
        }
        if (message.actor === 'ai') {
            return 'assistant';
        }
        return 'user';
    }
    toStringContent(message) {
        if (ai_core_1.LanguageModelMessage.isTextMessage(message)) {
            return message.text;
        }
        if (ai_core_1.LanguageModelMessage.isThinkingMessage(message)) {
            // Ignorar mensagens de "thinking"
            return null;
        }
        // Simplificado para não suportar tools e images nesta refatoração inicial
        return JSON.stringify(message);
    }
}
exports.AnthropicModel = AnthropicModel;
//# sourceMappingURL=anthropic-language-model.js.map