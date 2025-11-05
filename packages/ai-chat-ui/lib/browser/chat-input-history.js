"use strict";
// *****************************************************************************
// Copyright (C) 2025 STMicroelectronics and others.
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
exports.ChatInputHistoryService = exports.ChatInputNavigationState = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const browser_1 = require("@theia/core/lib/browser");
/**
 * Manages navigation state for a single chat input widget.
 * Each widget has its own independent navigation state while sharing the same history.
 */
class ChatInputNavigationState {
    constructor(historyService) {
        this.historyService = historyService;
        this.isNavigating = false;
        this.currentIndex = historyService.getPrompts().length;
    }
    getPreviousPrompt(currentInput) {
        const history = this.historyService.getPrompts();
        if (history.length === 0) {
            return undefined;
        }
        if (!this.isNavigating) {
            this.preservedInput = currentInput;
            this.isNavigating = true;
            this.currentIndex = history.length;
        }
        if (this.currentIndex <= 0) {
            // Already at the oldest prompt
            return undefined;
        }
        this.currentIndex--;
        return history[this.currentIndex];
    }
    getNextPrompt() {
        const history = this.historyService.getPrompts();
        if (!this.isNavigating || this.currentIndex >= history.length) {
            return undefined;
        }
        this.currentIndex++;
        if (this.currentIndex >= history.length) {
            // Reached end of history - return to preserved input
            this.isNavigating = false;
            const preserved = this.preservedInput;
            this.preservedInput = undefined;
            this.currentIndex = history.length;
            return preserved || '';
        }
        return history[this.currentIndex];
    }
    stopNavigation() {
        this.isNavigating = false;
        this.preservedInput = undefined;
        this.currentIndex = this.historyService.getPrompts().length;
    }
}
exports.ChatInputNavigationState = ChatInputNavigationState;
const CHAT_PROMPT_HISTORY_STORAGE_KEY = 'ai-chat-prompt-history';
const MAX_HISTORY_SIZE = 100;
/**
 * Manages shared prompt history across all chat input widgets.
 * Each prompt is stored only once and shared between all chat inputs.
 */
let ChatInputHistoryService = class ChatInputHistoryService {
    constructor() {
        this.history = [];
    }
    async init() {
        const data = await this.storageService.getData(CHAT_PROMPT_HISTORY_STORAGE_KEY, { prompts: [] });
        this.history = data.prompts || [];
    }
    /**
     * Get read-only access to the current prompt history.
     */
    getPrompts() {
        return this.history;
    }
    clearHistory() {
        this.history = [];
        this.persistHistory();
    }
    addToHistory(prompt) {
        const trimmed = prompt.trim();
        if (!trimmed) {
            return;
        }
        // Remove existing instance and add to end (most recent)
        this.history = this.history
            .filter(item => item !== trimmed)
            .concat(trimmed)
            .slice(-MAX_HISTORY_SIZE);
        this.persistHistory();
    }
    async persistHistory() {
        try {
            await this.storageService.setData(CHAT_PROMPT_HISTORY_STORAGE_KEY, { prompts: this.history });
        }
        catch (error) {
            console.warn('Failed to persist chat prompt history:', error);
        }
    }
};
exports.ChatInputHistoryService = ChatInputHistoryService;
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_1.StorageService),
    tslib_1.__metadata("design:type", Object)
], ChatInputHistoryService.prototype, "storageService", void 0);
exports.ChatInputHistoryService = ChatInputHistoryService = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], ChatInputHistoryService);
//# sourceMappingURL=chat-input-history.js.map