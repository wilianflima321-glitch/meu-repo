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
import { inject, injectable } from '@theia/core/shared/inversify';
import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { Emitter, MaybePromise, Event, PreferenceService, } from '@theia/core';
import { MessageService } from '@theia/core/lib/common/message-service';
import { ContextKeyService, ContextKey } from '@theia/core/lib/browser/context-key-service';
import { AIActivationService, ENABLE_AI_CONTEXT_KEY } from '@theia/ai-core/lib/browser/ai-activation-service';
import { LlmProviderService } from './llm-provider-service';
import { PREFERENCE_NAME_ENABLE_AI } from '../common/ai-ide-preferences';

/**
 * Implements AI Activation Service based on preferences.
 */
@injectable()
export class AIIdeActivationServiceImpl implements AIActivationService, FrontendApplicationContribution {
    @inject(ContextKeyService)
    private _contextKeyService?: ContextKeyService;
    @inject(ContextKeyService)
    protected set contextKeyService(v: ContextKeyService) { this._contextKeyService = v; }
    protected get contextKeyService(): ContextKeyService { if (!this._contextKeyService) { throw new Error('AIIdeActivationServiceImpl: contextKeyService not injected'); } return this._contextKeyService; }

    @inject(PreferenceService)
    private _preferenceService?: PreferenceService;
    @inject(PreferenceService)
    protected set preferenceService(v: PreferenceService) { this._preferenceService = v; }
    protected get preferenceService(): PreferenceService { if (!this._preferenceService) { throw new Error('AIIdeActivationServiceImpl: preferenceService not injected'); } return this._preferenceService; }

    @inject(MessageService)
    private _messageService?: MessageService;
    @inject(MessageService)
    protected set messageService(v: MessageService) { this._messageService = v; }
    protected get messageService(): MessageService { if (!this._messageService) { throw new Error('AIIdeActivationServiceImpl: messageService not injected'); } return this._messageService; }

    @inject(LlmProviderService)
    private _llmProviderService?: LlmProviderService;
    @inject(LlmProviderService)
    protected set llmProviderService(v: LlmProviderService) { this._llmProviderService = v; }
    protected get llmProviderService(): LlmProviderService { if (!this._llmProviderService) { throw new Error('AIIdeActivationServiceImpl: llmProviderService not injected'); } return this._llmProviderService; }

    private _isAiEnabledKey?: ContextKey<boolean>;
    protected get isAiEnabledKey(): ContextKey<boolean> { if (!this._isAiEnabledKey) { throw new Error('AIIdeActivationServiceImpl: isAiEnabledKey not initialized'); } return this._isAiEnabledKey; }

    protected onDidChangeAIEnabled = new Emitter<boolean>();
    get onDidChangeActiveStatus(): Event<boolean> {
        return this.onDidChangeAIEnabled.event;
    }

    get isActive(): boolean {
        return this.isAiEnabledKey.get() ?? false;
    }

    protected updateEnableValue(value: boolean): void {
        if (value !== this.isAiEnabledKey.get()) {
            this.isAiEnabledKey.set(value);
            this.onDidChangeAIEnabled.fire(value);
        }
    }

    initialize(): MaybePromise<void> {
        this._isAiEnabledKey = this.contextKeyService.createKey(ENABLE_AI_CONTEXT_KEY, false);
        // make sure we don't miss once preferences are ready
        // preferenceService.ready may be optional in some environments; normalize to a Promise
        Promise.resolve(this.preferenceService.ready).then(() => {
            const enableValue = this.preferenceService.get ? this.preferenceService.get<boolean>(PREFERENCE_NAME_ENABLE_AI, false) : false;
            this.updateEnableValue(enableValue as boolean);
        });
        this.preferenceService.onPreferenceChanged((e: any) => {
            if (e.preferenceName === PREFERENCE_NAME_ENABLE_AI) {
                this.updateEnableValue(e.newValue as boolean);
            }
        });

                        // Create a lightweight persistent warning banner in the DOM and subscribe to provider warnings
                        try {
                            const styleId = 'ai-ide-warning-banner-style';
                            if (!document.getElementById(styleId)) {
                                const st = document.createElement('style');
                                st.id = styleId;
                                st.textContent = `
                                    .ai-warning-banner { position: fixed; right: 16px; bottom: 16px; max-width: 420px; z-index: 9999; box-shadow: 0 2px 10px rgba(0,0,0,0.2); border-radius: 6px; overflow: hidden; font-family: var(--theia-font-family, Arial); }
                                    .ai-warning-banner .header { background: var(--theia-warningBackground, #fff4e5); color: var(--theia-warningForeground, #663c00); padding: 8px 12px; display:flex; align-items:center; gap:8px; }
                                    .ai-warning-banner .body { background: var(--theia-surface, #fff); color: var(--theia-foreground, #111); padding: 8px 12px; display:none; max-height:220px; overflow:auto; }
                                    .ai-warning-banner.show .body { display:block; }
                                    .ai-warning-banner .actions { margin-left:auto; display:flex; gap:8px; }
                                    .ai-warning-banner .warnings-list { margin:0; padding:0 0 0 16px; }
                                `;
                                document.head.appendChild(st);
                            }

                            const banner = document.createElement('div');
                            banner.className = 'ai-warning-banner';
                            banner.innerHTML = `
                                <div class="header"><span class="codicon codicon-warning"></span><strong>AI verification</strong><div class="actions"><button class="toggle">Details</button><button class="close">×</button></div></div>
                                <div class="body"><div class="meta"></div><ul class="warnings-list"></ul></div>
                            `;
                            document.body.appendChild(banner);

                            const meta = banner.querySelector('.meta') as HTMLElement;
                            const list = banner.querySelector('.warnings-list') as HTMLElement;
                            const toggle = banner.querySelector('.toggle') as HTMLButtonElement;
                            const closeBtn = banner.querySelector('.close') as HTMLButtonElement;

                            function showWarnings(providerId: string, warnings: string[]) {
                                meta.textContent = `Provider: ${providerId} — ${warnings.length} warning(s)`;
                                list.innerHTML = '';
                                for (const w of warnings) {
                                    const li = document.createElement('li');
                                    li.textContent = w;
                                    list.appendChild(li);
                                }
                                // ensure visible
                                banner.classList.add('show');
                            }

                            toggle.addEventListener('click', () => { banner.classList.toggle('show'); });
                            closeBtn.addEventListener('click', () => { banner.classList.remove('show'); });

                            if (this.llmProviderService && typeof this.llmProviderService.onDidProviderWarning === 'function') {
                                this.llmProviderService.onDidProviderWarning((ev: any) => {
                                    try {
                                        const providerId = ev?.providerId ?? 'unknown';
                                        const warnings = Array.isArray(ev?.warnings) ? ev.warnings : (Array.isArray(ev?.body?.warnings) ? ev.body.warnings : []);
                                        if (warnings && warnings.length) {
                                            // also surface a quick toast for immediate attention
                                            try { this.messageService.warn(`AI provider ${providerId} returned ${warnings.length} warning(s)`); } catch {}
                                            showWarnings(providerId, warnings);
                                            console.warn('AI provider warnings', providerId, warnings);
                                        }
                                    } catch (e) { /* best-effort */ }
                                });
                            }
                        } catch (e) {
                            // best-effort; don't break activation
                            console.warn('Failed to initialize AI warning banner', e);
                        }
    }
}
