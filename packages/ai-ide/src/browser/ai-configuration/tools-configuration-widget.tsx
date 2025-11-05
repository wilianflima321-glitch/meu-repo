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

import { ReactWidget, ConfirmDialog } from '@theia/core/lib/browser';
import { Disposable } from '@theia/core';
import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import * as React from '@theia/core/shared/react';
import { ToolInvocationRegistry } from '@theia/ai-core';
import { PreferenceService } from '@theia/core';
import { ToolConfirmationManager } from '@theia/ai-chat/lib/browser/chat-tool-preference-bindings';
import { ToolConfirmationMode } from '@theia/ai-chat/lib/common/chat-tool-preferences';

const TOOL_OPTIONS: { value: ToolConfirmationMode, label: string, icon: string }[] = [
    { value: ToolConfirmationMode.DISABLED, label: 'Disabled', icon: 'close' },
    { value: ToolConfirmationMode.CONFIRM, label: 'Confirm', icon: 'question' },
    { value: ToolConfirmationMode.ALWAYS_ALLOW, label: 'Always Allow', icon: 'thumbsup' },
];

@injectable()
export class AIToolsConfigurationWidget extends ReactWidget {
    static readonly ID = 'ai-tools-configuration-widget';
    static readonly LABEL = 'Tools';

    @inject(ToolConfirmationManager)
    private _confirmationManager?: ToolConfirmationManager;
    @inject(ToolConfirmationManager)
    protected set confirmationManager(v: ToolConfirmationManager) { this._confirmationManager = v; }
    protected get confirmationManager(): ToolConfirmationManager { if (!this._confirmationManager) { throw new Error('AIToolsConfigurationWidget: confirmationManager not injected'); } return this._confirmationManager; }

    @inject(PreferenceService)
    private _preferenceService?: PreferenceService;
    @inject(PreferenceService)
    protected set preferenceService(v: PreferenceService) { this._preferenceService = v; }
    protected get preferenceService(): PreferenceService { if (!this._preferenceService) { throw new Error('AIToolsConfigurationWidget: preferenceService not injected'); } return this._preferenceService; }

    @inject(ToolInvocationRegistry)
    private _toolInvocationRegistry?: ToolInvocationRegistry;
    @inject(ToolInvocationRegistry)
    protected set toolInvocationRegistry(v: ToolInvocationRegistry) { this._toolInvocationRegistry = v; }
    protected get toolInvocationRegistry(): ToolInvocationRegistry { if (!this._toolInvocationRegistry) { throw new Error('AIToolsConfigurationWidget: toolInvocationRegistry not injected'); } return this._toolInvocationRegistry; }

    // Mocked tool list and state
    protected tools: string[] = [];
    protected toolConfirmationModes: Record<string, ToolConfirmationMode> = {};
    protected defaultState: ToolConfirmationMode = ToolConfirmationMode.DISABLED;
    protected loading = true;

    @postConstruct()
    protected init(): void {
        this.id = AIToolsConfigurationWidget.ID;
        this.title.label = AIToolsConfigurationWidget.LABEL;
        this.title.closable = false;
        this.loadData();
        this.update();
        const pChanged: unknown = this.preferenceService.onPreferenceChanged(async (e: { preferenceName?: string }) => {
            if (e.preferenceName === 'ai-features.chat.toolConfirmation') {
                this.defaultState = await this.loadDefaultConfirmation();
                this.toolConfirmationModes = await this.loadToolConfigurationModes();
                this.update();
            }
        });
        const tChanged: unknown = this.toolInvocationRegistry.onDidChange(async () => {
            this.tools = await this.loadTools();
            this.update();
        });

        this.toDispose.push({ dispose: () => { try { if (typeof pChanged === 'function') { (pChanged as (...args: unknown[]) => unknown)(); } else if (pChanged && typeof (pChanged as { dispose?: unknown }).dispose === 'function') { ((pChanged as { dispose: (...args: unknown[]) => unknown }).dispose)(); } } catch { } } } as unknown as Disposable);
        this.toDispose.push({ dispose: () => { try { if (typeof tChanged === 'function') { (tChanged as (...args: unknown[]) => unknown)(); } else if (tChanged && typeof (tChanged as { dispose?: unknown }).dispose === 'function') { ((tChanged as { dispose: (...args: unknown[]) => unknown }).dispose)(); } } catch { } } } as unknown as Disposable);
    }

    protected async loadData(): Promise<void> {
        // Replace with real service calls
        this.tools = await this.loadTools();
        this.defaultState = await this.loadDefaultConfirmation();
        this.toolConfirmationModes = await this.loadToolConfigurationModes();
        this.loading = false;
        this.update();
    }

    protected async loadTools(): Promise<string[]> {
        return this.toolInvocationRegistry.getAllFunctions().map(func => func.name);
    }
    protected async loadDefaultConfirmation(): Promise<ToolConfirmationMode> {
        return this.confirmationManager.getConfirmationMode('*', 'doesNotMatter');
    }
    protected async loadToolConfigurationModes(): Promise<Record<string, ToolConfirmationMode>> {
        return this.confirmationManager.getAllConfirmationSettings();
    }
    protected async updateToolConfirmationMode(tool: string, state: ToolConfirmationMode): Promise<void> {
        await this.confirmationManager.setConfirmationMode(tool, state);
    }
    protected async updateDefaultConfirmation(state: ToolConfirmationMode): Promise<void> {
        await this.confirmationManager.setConfirmationMode('*', state);
    }

    protected handleToolConfirmationModeChange = async (tool: string, event: React.ChangeEvent<HTMLSelectElement>) => {
        const newState = event.target.value as ToolConfirmationMode;
        await this.updateToolConfirmationMode(tool, newState);
    };
    protected handleDefaultStateChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
        const newState = event.target.value as ToolConfirmationMode;
        await this.updateDefaultConfirmation(newState);
    };

    protected async resetAllToolsToDefault(): Promise<void> {
        const dialog = new ConfirmDialog({
            title: 'Reset All Tool Confirmation Modes',
            msg: 'Are you sure you want to reset all tool confirmation modes to the default? This will remove all custom settings.',
            ok: 'Reset All',
            cancel: 'Cancel'
        });
        const shouldReset = await dialog.open();
        if (shouldReset) {
            this.confirmationManager.resetAllConfirmationModeSettings();
        }
    }

    protected render(): React.ReactNode {
        if (this.loading) {
            return <div>Loading tools...</div>;
        }
        return <div className='ai-tools-configuration-container'>
            <div className='ai-tools-configuration-default-section ai-tools-default-row'>
                <div className='ai-tools-configuration-default-label'>Default Tool Confirmation Mode:</div>
                <select
                    className="ai-tools-configuration-default-select"
                    value={this.defaultState}
                    onChange={this.handleDefaultStateChange}
                >
                    {TOOL_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
                <button
                    className='ai-tools-configuration-reset-btn ai-tools-reset'
                    title='Reset all tools to default'
                    onClick={() => this.resetAllToolsToDefault()}
                >
                    Reset All
                </button>
            </div>
            <div className='ai-tools-configuration-tools-section'>
                <div className='ai-tools-configuration-tools-label'>Tools</div>
                <ul className='ai-tools-configuration-tools-list'>
                    {this.tools.map(tool => {
                        const state = this.toolConfirmationModes[tool] || this.defaultState;
                        const isDefault = state === this.defaultState;
                        const selectClass = 'ai-tools-configuration-tool-select';
                        return (
                            <li
                                key={tool}
                                className={
                                    'ai-tools-configuration-tool-item ' +
                                    (isDefault ? 'default' : 'custom')
                                }
                            >
                                <span className='ai-tools-configuration-tool-name'>{tool}</span>
                                <select
                                    className={selectClass}
                                    value={state}
                                    onChange={e => this.handleToolConfirmationModeChange(tool, e)}
                                >
                                    {TOOL_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>;
    }
}
