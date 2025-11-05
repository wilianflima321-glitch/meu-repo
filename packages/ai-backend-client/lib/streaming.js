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
exports.BackendStreamingIterator = void 0;
/**
 * Wraps the backend streaming payload and exposes it as a Theia language model iterator.
 */
class BackendStreamingIterator {
    constructor(source, cleanup, context) {
        this.source = source;
        this.cleanup = cleanup;
        this.context = context;
        this.queue = [];
        this.finished = false;
    }
    [Symbol.asyncIterator]() {
        return this;
    }
    async next() {
        var _a, _b, _c, _d, _e;
        if (this.queue.length) {
            return { done: false, value: this.queue.shift() };
        }
        if (this.finished) {
            return { done: true, value: undefined };
        }
        const { value, done } = await this.source.next();
        if (done || !value) {
            this.finish();
            return { done: true, value: undefined };
        }
        if (value.done) {
            this.finish();
            return { done: true, value: undefined };
        }
        const parts = [];
        if (typeof value.content === 'string') {
            parts.push({ content: value.content });
        }
        if (value.usage) {
            const usagePart = {
                input_tokens: (_a = value.usage.prompt_tokens) !== null && _a !== void 0 ? _a : 0,
                output_tokens: (_b = value.usage.completion_tokens) !== null && _b !== void 0 ? _b : Math.max(((_c = value.usage.total_tokens) !== null && _c !== void 0 ? _c : 0) - ((_d = value.usage.prompt_tokens) !== null && _d !== void 0 ? _d : 0), (_e = value.usage.completion_tokens) !== null && _e !== void 0 ? _e : 0),
            };
            parts.push(usagePart);
            this.recordUsage(usagePart);
        }
        if (!parts.length) {
            return this.next();
        }
        if (parts.length > 1) {
            this.queue.push(...parts.slice(1));
        }
        return { done: false, value: parts[0] };
    }
    async return() {
        this.finish();
        if (this.source.return) {
            await this.source.return(undefined);
        }
        return { done: true, value: undefined };
    }
    finish() {
        if (!this.finished) {
            this.finished = true;
            this.cleanup();
        }
    }
    recordUsage(part) {
        const { tokenUsageService, modelId, requestId } = this.context;
        if (!tokenUsageService || !requestId) {
            return;
        }
        void tokenUsageService
            .recordTokenUsage(modelId, {
            inputTokens: part.input_tokens,
            outputTokens: part.output_tokens,
            requestId,
        })
            .catch((error) => console.error('Error recording token usage:', error));
    }
}
exports.BackendStreamingIterator = BackendStreamingIterator;
//# sourceMappingURL=streaming.js.map