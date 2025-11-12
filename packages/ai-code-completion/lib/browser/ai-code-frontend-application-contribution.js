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
exports.AIFrontendApplicationContribution = void 0;
const tslib_1 = require("tslib");
const monaco = require("@theia/monaco-editor-core");
const browser_1 = require("@theia/ai-core/lib/browser");
const core_1 = require("@theia/core");
const inversify_1 = require("@theia/core/shared/inversify");
const languages_1 = require("@theia/monaco-editor-core/esm/vs/editor/common/languages");
const ai_code_completion_preference_1 = require("../common/ai-code-completion-preference");
const ai_code_inline_completion_provider_1 = require("./ai-code-inline-completion-provider");
const code_completion_debouncer_1 = require("./code-completion-debouncer");
const code_completion_cache_1 = require("./code-completion-cache");
let AIFrontendApplicationContribution = class AIFrontendApplicationContribution {
    constructor() {
        this.completionCache = new code_completion_cache_1.CodeCompletionCache();
        this.debouncer = new code_completion_debouncer_1.InlineCompletionDebouncer();
        this.toDispose = new Map();
    }
    onDidInitializeLayout() {
        this.preferenceService.ready.then(() => {
            this.handlePreferences();
        });
    }
    handlePreferences() {
        const handler = () => this.handleInlineCompletions();
        this.toDispose.set('inlineCompletions', handler());
        this.debounceDelay = this.preferenceService.get(ai_code_completion_preference_1.PREF_AI_INLINE_COMPLETION_DEBOUNCE_DELAY, 300);
        const cacheCapacity = this.preferenceService.get(ai_code_completion_preference_1.PREF_AI_INLINE_COMPLETION_CACHE_CAPACITY, 100);
        this.completionCache.setMaxSize(cacheCapacity);
        this.preferenceService.onPreferenceChanged(event => {
            var _a;
            if (event.preferenceName === ai_code_completion_preference_1.PREF_AI_INLINE_COMPLETION_AUTOMATIC_ENABLE
                || event.preferenceName === ai_code_completion_preference_1.PREF_AI_INLINE_COMPLETION_EXCLUDED_EXTENSIONS) {
                (_a = this.toDispose.get('inlineCompletions')) === null || _a === void 0 ? void 0 : _a.dispose();
                this.toDispose.set('inlineCompletions', handler());
            }
            if (event.preferenceName === ai_code_completion_preference_1.PREF_AI_INLINE_COMPLETION_DEBOUNCE_DELAY) {
                this.debounceDelay = event.newValue;
            }
            if (event.preferenceName === ai_code_completion_preference_1.PREF_AI_INLINE_COMPLETION_CACHE_CAPACITY) {
                this.completionCache.setMaxSize(event.newValue);
            }
        });
        this.activationService.onDidChangeActiveStatus(change => {
            var _a;
            (_a = this.toDispose.get('inlineCompletions')) === null || _a === void 0 ? void 0 : _a.dispose();
            this.toDispose.set('inlineCompletions', handler());
        });
    }
    registerKeybindings(keybindings) {
        keybindings.registerKeybinding({
            command: 'editor.action.inlineSuggest.trigger',
            keybinding: 'Ctrl+Alt+Space',
            when: '!editorReadonly && editorTextFocus'
        });
    }
    handleInlineCompletions() {
        if (!this.activationService.isActive) {
            return core_1.Disposable.NULL;
        }
        const automatic = this.preferenceService.get(ai_code_completion_preference_1.PREF_AI_INLINE_COMPLETION_AUTOMATIC_ENABLE, true);
        const excludedExtensions = this.preferenceService.get(ai_code_completion_preference_1.PREF_AI_INLINE_COMPLETION_EXCLUDED_EXTENSIONS, []);
        return monaco.languages.registerInlineCompletionsProvider({ scheme: 'file' }, {
            provideInlineCompletions: (model, position, context, token) => {
                if (!automatic && context.triggerKind === languages_1.InlineCompletionTriggerKind.Automatic) {
                    return { items: [] };
                }
                const fileName = model.uri.toString();
                if (excludedExtensions.some(ext => fileName.endsWith(ext))) {
                    return { items: [] };
                }
                const completionHandler = async () => {
                    try {
                        const cacheKey = this.completionCache.generateKey(fileName, model, position);
                        const cachedCompletion = this.completionCache.get(cacheKey);
                        if (cachedCompletion) {
                            return cachedCompletion;
                        }
                        const completion = await this.inlineCodeCompletionProvider.provideInlineCompletions(model, position, context, token);
                        if (completion && completion.items.length > 0) {
                            this.completionCache.put(cacheKey, completion);
                        }
                        return completion;
                    }
                    catch (error) {
                        console.error('Error providing inline completions:', error);
                        return { items: [] };
                    }
                };
                if (context.triggerKind === languages_1.InlineCompletionTriggerKind.Automatic) {
                    return this.debouncer.debounce(async () => completionHandler(), this.debounceDelay);
                }
                else if (context.triggerKind === languages_1.InlineCompletionTriggerKind.Explicit) {
                    return completionHandler();
                }
            },
            freeInlineCompletions: completions => {
                this.inlineCodeCompletionProvider.freeInlineCompletions(completions);
            }
        });
    }
};
exports.AIFrontendApplicationContribution = AIFrontendApplicationContribution;
tslib_1.__decorate([
    (0, inversify_1.inject)(ai_code_inline_completion_provider_1.AICodeInlineCompletionsProvider),
    tslib_1.__metadata("design:type", ai_code_inline_completion_provider_1.AICodeInlineCompletionsProvider)
], AIFrontendApplicationContribution.prototype, "inlineCodeCompletionProvider", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.PreferenceService),
    tslib_1.__metadata("design:type", Object)
], AIFrontendApplicationContribution.prototype, "preferenceService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_1.AIActivationService),
    tslib_1.__metadata("design:type", Object)
], AIFrontendApplicationContribution.prototype, "activationService", void 0);
exports.AIFrontendApplicationContribution = AIFrontendApplicationContribution = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], AIFrontendApplicationContribution);
//# sourceMappingURL=ai-code-frontend-application-contribution.js.map