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

import {
    Agent,
    AgentService,
    AISettingsService,
    AIVariableService,
    BasePromptFragment,
    FrontendLanguageModelRegistry,
    LanguageModel,
    LanguageModelRegistry,
    matchVariablesRegEx,
    PROMPT_FUNCTION_REGEX,
    PromptFragmentCustomizationService,
    PromptService,
} from '@theia/ai-core/lib/common';
import { codicon, QuickInputService, ReactWidget } from '@theia/core/lib/browser';
import { URI } from '@theia/core/lib/common';
import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import * as React from '@theia/core/shared/react';
import { AIConfigurationSelectionService } from './ai-configuration-service';
import { LanguageModelRenderer } from './language-model-renderer';
import { LanguageModelAliasRegistry, LanguageModelAlias } from '@theia/ai-core/lib/common/language-model-alias';
import { AIVariableConfigurationWidget } from './variable-configuration-widget';
import { nls, Disposable } from '@theia/core';
import { PromptVariantRenderer } from './template-settings-renderer';

interface ParsedPrompt {
    functions: string[];
    globalVariables: string[];
    agentSpecificVariables: string[];
};

@injectable()
export class AIAgentConfigurationWidget extends ReactWidget {

    static readonly ID = 'ai-agent-configuration-container-widget';
    static readonly LABEL = nls.localize('theia/ai/core/agentConfiguration/label', 'Agents');

    private _agentService?: AgentService;
    @inject(AgentService)
    protected set agentService(v: AgentService) { this._agentService = v; }
    protected get agentService(): AgentService { if (!this._agentService) { throw new Error('AIAgentConfigurationWidget: agentService not injected'); } return this._agentService; }

    private _languageModelRegistry?: FrontendLanguageModelRegistry;
    @inject(LanguageModelRegistry)
    protected set languageModelRegistry(v: FrontendLanguageModelRegistry) { this._languageModelRegistry = v; }
    protected get languageModelRegistry(): FrontendLanguageModelRegistry { if (!this._languageModelRegistry) { throw new Error('AIAgentConfigurationWidget: languageModelRegistry not injected'); } return this._languageModelRegistry; }

    private _promptFragmentCustomizationService?: PromptFragmentCustomizationService;
    @inject(PromptFragmentCustomizationService)
    protected set promptFragmentCustomizationService(v: PromptFragmentCustomizationService) { this._promptFragmentCustomizationService = v; }
    protected get promptFragmentCustomizationService(): PromptFragmentCustomizationService { if (!this._promptFragmentCustomizationService) { throw new Error('AIAgentConfigurationWidget: promptFragmentCustomizationService not injected'); } return this._promptFragmentCustomizationService; }

    private _languageModelAliasRegistry?: LanguageModelAliasRegistry;
    @inject(LanguageModelAliasRegistry)
    protected set languageModelAliasRegistry(v: LanguageModelAliasRegistry) { this._languageModelAliasRegistry = v; }
    protected get languageModelAliasRegistry(): LanguageModelAliasRegistry { if (!this._languageModelAliasRegistry) { throw new Error('AIAgentConfigurationWidget: languageModelAliasRegistry not injected'); } return this._languageModelAliasRegistry; }

    private _aiSettingsService?: AISettingsService;
    @inject(AISettingsService)
    protected set aiSettingsService(v: AISettingsService) { this._aiSettingsService = v; }
    protected get aiSettingsService(): AISettingsService { if (!this._aiSettingsService) { throw new Error('AIAgentConfigurationWidget: aiSettingsService not injected'); } return this._aiSettingsService; }

    private _aiConfigurationSelectionService?: AIConfigurationSelectionService;
    @inject(AIConfigurationSelectionService)
    protected set aiConfigurationSelectionService(v: AIConfigurationSelectionService) { this._aiConfigurationSelectionService = v; }
    protected get aiConfigurationSelectionService(): AIConfigurationSelectionService { if (!this._aiConfigurationSelectionService) { throw new Error('AIAgentConfigurationWidget: aiConfigurationSelectionService not injected'); } return this._aiConfigurationSelectionService; }

    private _variableService?: AIVariableService;
    @inject(AIVariableService)
    protected set variableService(v: AIVariableService) { this._variableService = v; }
    protected get variableService(): AIVariableService { if (!this._variableService) { throw new Error('AIAgentConfigurationWidget: variableService not injected'); } return this._variableService; }

    private _promptService?: PromptService;
    @inject(PromptService)
    protected set promptService(v: PromptService) { this._promptService = v; }
    protected get promptService(): PromptService { if (!this._promptService) { throw new Error('AIAgentConfigurationWidget: promptService not injected'); } return this._promptService; }

    private _quickInputService?: QuickInputService;
    @inject(QuickInputService)
    protected set quickInputService(v: QuickInputService) { this._quickInputService = v; }
    protected get quickInputService(): QuickInputService { if (!this._quickInputService) { throw new Error('AIAgentConfigurationWidget: quickInputService not injected'); } return this._quickInputService; }

    protected languageModels: LanguageModel[] | undefined;
    protected languageModelAliases: LanguageModelAlias[] = [];

    @postConstruct()
    protected init(): void {
        this.id = AIAgentConfigurationWidget.ID;
        this.title.label = AIAgentConfigurationWidget.LABEL;
        this.title.closable = false;

        this.languageModelRegistry.getLanguageModels().then(models => {
            this.languageModels = models ?? [];
            this.update();
        });
        this.languageModelAliasRegistry.ready.then(() => {
            this.languageModelAliases = this.languageModelAliasRegistry.getAliases();
                const d = this.languageModelAliasRegistry.onDidChange(() => {
                this.languageModelAliases = this.languageModelAliasRegistry.getAliases();
                this.update();
            });
                this.pushDisposable(d);
        });
        const d2 = this.languageModelRegistry.onChange((payload: { models?: LanguageModel[] }) => {
            const models = payload.models;
            this.languageModelAliases = this.languageModelAliasRegistry.getAliases();
            this.languageModels = models;
            this.update();
        });
    this.pushDisposable(d2);
        const d3 = this.promptService.onPromptsChange(() => this.update());
    this.pushDisposable(d3);

        this.aiSettingsService.onDidChange(() => this.update());
        this.aiConfigurationSelectionService.onDidAgentChange(() => this.update());
        this.agentService.onDidChangeAgents(() => this.update());
        this.update();
    }

    /**
     * Normalize and push a disposable-like value into this.toDispose.
     * Accepts functions, objects with a dispose() method, or disposables.
     */
    protected pushDisposable(d: unknown): void {
        if (!d) {
            return;
        }
        // If it's a function (unregister callback), wrap it
        if (typeof d === 'function') {
            this.toDispose.push({ dispose: (d as (...args: unknown[]) => unknown) } as unknown as Disposable);
            return;
        }
        // If it already has dispose(), push as-is
        if (d && typeof (d as { dispose?: unknown }).dispose === 'function') {
            this.toDispose.push(d as unknown as Disposable);
            return;
        }
        // Last resort: if it has a 'dispose' property that's not a function, ignore
    }

    /**
     * Safely format a runtime URI-like object into a displayable label.
     * Accepts real URI instances or plain strings/objects that have a `path` property.
     */
    protected formatUriLabel(uriRaw: unknown): string {
        if (!uriRaw) {
            return '';
        }
        if (typeof uriRaw === 'object') {
            const asObj = uriRaw as { path?: unknown };
            const p = asObj.path;
            if (p) {
                // Prefer a runtime toString if present, otherwise fallback to String()
                if (typeof (p as { toString?: () => string }).toString === 'function') {
                    return (p as { toString?: () => string }).toString!();
                }
                return String(p);
            }
        }
        return String(uriRaw);
    }

    protected normalizeLocation(raw: unknown): { uri: URI, exists: boolean } {
        if (!raw) {
            return { uri: new URI(''), exists: false };
        }
        // raw may be a string (uri) or an object { uri, exists }
        if (typeof raw === 'string') {
            return { uri: new URI(raw), exists: false };
        }
        const rawObj = raw as { uri?: unknown, exists?: unknown };
        const uriCandidate = rawObj.uri;
        let uri: URI;
        if (uriCandidate && typeof uriCandidate === 'object' && 'path' in (uriCandidate as object) && (uriCandidate as { path?: unknown }).path) {
            uri = uriCandidate as URI;
        } else {
            uri = new URI(String(uriCandidate));
        }
        const exists = !!rawObj.exists;
        return { uri, exists };
    }

    protected render(): React.ReactNode {
        return <div className='ai-agent-configuration-main'>
            <div className='configuration-agents-list theia-Tree theia-TreeContainer configuration-agents-sidebar'>
                <ul>
                    {this.agentService.getAllAgents().map(agent => {
                        const isActive = this.aiConfigurationSelectionService.getActiveAgent()?.id === agent.id;
                        const className = `theia-TreeNode theia-CompositeTreeNode theia-ExpandableTreeNode${isActive ? ' theia-mod-selected' : ''}`;
                        return <li key={agent.id} className={className} onClick={() => this.setActiveAgent(agent)}>
                            {this.renderAgentName(agent)}
                        </li>;
                    })}
                </ul>
                <div className='configuration-agents-add'>
                    <button
                        className='theia-button main'
                        onClick={() => this.addCustomAgent()}>
                        {nls.localize('theia/ai/core/agentConfiguration/addCustomAgent', 'Add Custom Agent')}
                    </button>
                </div>
            </div>
            <div className='configuration-agent-panel preferences-editor-widget'>
                {this.renderAgentDetails()}
            </div>
        </div>;
    }

    private renderAgentName(agent: Agent): React.ReactNode {
        const tagsSuffix = agent.tags?.length ? <span>{agent.tags.map(tag => <span key={tag} className='agent-tag'>{tag}</span>)}</span> : '';
        return <span>{agent.name} {tagsSuffix}</span>;
    }

    private renderAgentDetails(): React.ReactNode {
        const agent = this.aiConfigurationSelectionService.getActiveAgent();
        if (!agent) {
            return <div>{nls.localize('theia/ai/core/agentConfiguration/selectAgentMessage', 'Please select an Agent first!')}</div>;
        }

        const enabled = this.agentService.isEnabled(agent.id);

        const parsedPromptParts = this.parsePromptFragmentsForVariableAndFunction(agent);
        const globalVariables = Array.from(new Set([...parsedPromptParts.globalVariables, ...agent.variables]));
        const functions = Array.from(new Set([...parsedPromptParts.functions, ...agent.functions]));

        return <div key={agent.id} className='agent-details-column'>
            <div className='settings-section-title settings-section-category-title agent-title'>
                {this.renderAgentName(agent)}
                <pre className='agent-id-pre'>
                    Id: {agent.id}
                </pre>
            </div>
            <div className='agent-description'>{agent.description}</div>
            <div className='agent-enable-row'>
                <label>
                    <input type="checkbox" checked={enabled} onChange={this.toggleAgentEnabled} />
                    {nls.localize('theia/ai/core/agentConfiguration/enableAgent', 'Enable Agent')}
                </label>
            </div>
            <div className="settings-section-subcategory-title ai-settings-section-subcategory-title">
                {nls.localize('theia/ai/core/agentConfiguration/promptTemplates', 'Prompt Templates')}
            </div>
            <div className="ai-templates">
                {(() => {
                    const prompts = agent.prompts;
                    return prompts.length > 0 ? (
                        prompts.map(prompt => (
                            <div key={agent.id + '.' + prompt.id}>
                                <PromptVariantRenderer
                                    key={agent.id + '.' + prompt.id}
                                    agentId={agent.id}
                                    promptVariantSet={prompt}
                                    promptService={this.promptService}
                                />
                            </div>
                        ))
                    ) : (
                        <div>{nls.localize('theia/ai/core/agentConfiguration/noDefaultTemplate', 'No default template available')}</div>
                    );
                })()}
            </div>

            <div className='ai-lm-requirements'>
                <LanguageModelRenderer
                    agent={agent}
                    languageModels={this.languageModels}
                    aiSettingsService={this.aiSettingsService}
                    languageModelRegistry={this.languageModelRegistry}
                    languageModelAliases={this.languageModelAliases}
                />
            </div>
            <div>
                <span>Used Global Variables:</span>
                <ul className='variable-references'>
                    <AgentGlobalVariables variables={globalVariables} showVariableConfigurationTab={this.showVariableConfigurationTab.bind(this)} />
                </ul>
            </div>
            <div>
                <span>Used agent-specific Variables:</span>
                <ul className='variable-references'>
                    <AgentSpecificVariables
                        promptVariables={parsedPromptParts.agentSpecificVariables}
                        agent={agent}
                    />
                </ul>
            </div>
            <div>
                <span>Used Functions:</span>
                <ul className='function-references'>
                    <AgentFunctions functions={functions} />
                </ul>
            </div>
        </div>;
    }

    private parsePromptFragmentsForVariableAndFunction(agent: Agent): ParsedPrompt {
        const prompts = agent.prompts;
        const promptFragments: BasePromptFragment[] = [];
        prompts.forEach(prompt => {
            promptFragments.push(prompt.defaultVariant);
            if (prompt.variants) {
                promptFragments.push(...prompt.variants);
            }
        });
        const result: ParsedPrompt = { functions: [], globalVariables: [], agentSpecificVariables: [] };
        promptFragments.forEach(template => {
            const storedPrompt = this.promptService.getPromptFragment(template.id);
            const prompt = storedPrompt?.template ?? template.template;
            const variableMatches = matchVariablesRegEx(prompt);

            variableMatches.forEach((match: any) => {
                const variableId = match[1];
                // if the variable is part of the variable service and not part of the agent specific variables then it is a global variable
                if (this.variableService.hasVariable(variableId) &&
                    agent.agentSpecificVariables.find(v => v.name === variableId) === undefined) {
                    result.globalVariables.push(variableId);
                } else {
                    result.agentSpecificVariables.push(variableId);
                }
            });

            const functionMatches = [...prompt.matchAll(PROMPT_FUNCTION_REGEX)];
            functionMatches.forEach(match => {
                const functionId = match[1];
                result.functions.push(functionId);
            });

        });
        return result;
    }

    protected showVariableConfigurationTab(): void {
        this.aiConfigurationSelectionService.selectConfigurationTab(AIVariableConfigurationWidget.ID);
    }

    protected async addCustomAgent(): Promise<void> {
        const locations = await this.promptFragmentCustomizationService.getCustomAgentsLocations();

        // If only one location is available, use the direct approach
        if (locations.length === 1) {
            const first = this.normalizeLocation(locations[0]);
            this.promptFragmentCustomizationService.openCustomAgentYaml(first.uri.toString());
            return;
        }

        // Multiple locations - show quick picker
        const quickPick = this.quickInputService.createQuickPick();
        quickPick.title = 'Select Location for Custom Agents File';
        quickPick.placeholder = 'Choose where to create or open a custom agents file';

        quickPick.items = locations.map(locationRaw => {
            const location = this.normalizeLocation(locationRaw);
            return ({
                label: this.formatUriLabel(location.uri),
                description: location.exists ? 'Open existing file' : 'Create new file',
                location
            });
        });

        const acceptDisposable = quickPick.onDidAccept(async () => {
            const selectedItem = quickPick.selectedItems[0] as unknown;
            const loc = (selectedItem && typeof selectedItem === 'object' && 'location' in (selectedItem as object)) ? (selectedItem as { location?: unknown }).location as unknown : undefined;
            if (loc) {
                quickPick.dispose();
                const raw = (loc as { uri?: unknown }).uri;
                // Normalize potential string URIs to a URI instance at runtime
                let uri: URI;
                if (raw && typeof raw === 'object' && 'path' in (raw as object) && (raw as { path?: unknown }).path) {
                    uri = raw as URI;
                } else {
                    uri = new URI(String(raw));
                }
                this.promptFragmentCustomizationService.openCustomAgentYaml(uri.toString());
            }
        });
    this.pushDisposable(acceptDisposable);

        quickPick.show();
    }

    protected setActiveAgent(agent: Agent): void {
        this.aiConfigurationSelectionService.setActiveAgent(agent);
        this.update();
    }

    private toggleAgentEnabled = () => {
        const agent = this.aiConfigurationSelectionService.getActiveAgent();
        if (!agent) {
            return false;
        }
        const enabled = this.agentService.isEnabled(agent.id);
        if (enabled) {
            this.agentService.disableAgent(agent.id);
        } else {
            this.agentService.enableAgent(agent.id);
        }
        this.update();
    };

}
interface AgentGlobalVariablesProps {
    variables: string[];
    showVariableConfigurationTab: () => void;
}
const AgentGlobalVariables = ({ variables: globalVariables, showVariableConfigurationTab }: AgentGlobalVariablesProps) => {
    if (globalVariables.length === 0) {
        return <>{nls.localize('theia/ai/core/agentConfiguration/none', 'None')}</>;
    }
    return <>
        {globalVariables.map(variableId => <li key={variableId} className='theia-TreeNode theia-CompositeTreeNode theia-ExpandableTreeNode theia-mod-selected'>
            <div key={variableId} onClick={() => { showVariableConfigurationTab(); }} className='variable-reference'>
                <span>{variableId}</span>
                <i className={codicon('chevron-right')}></i>
            </div></li>)}

    </>;
};

interface AgentFunctionsProps {
    functions: string[];
}
const AgentFunctions = ({ functions }: AgentFunctionsProps) => {
    if (functions.length === 0) {
        return <>{nls.localize('theia/ai/core/agentConfiguration/none', 'None')}</>;
    }
    return <>
        {functions.map(functionId => <li key={functionId} className='variable-reference'>
            <span>{functionId}</span>
        </li>)}
    </>;
};

interface AgentSpecificVariablesProps {
    promptVariables: string[];
    agent: Agent;
}
const AgentSpecificVariables = ({ promptVariables, agent }: AgentSpecificVariablesProps) => {
    const agentDefinedVariablesName = agent.agentSpecificVariables.map(v => v.name);
    const variables = Array.from(new Set([...promptVariables, ...agentDefinedVariablesName]));
    if (variables.length === 0) {
        return <>{nls.localize('theia/ai/core/agentConfiguration/none', 'None')}</>;
    }
    return <>
        {variables.map(variableId =>
            <AgentSpecificVariable
                key={variableId}
                variableId={variableId}
                agent={agent}
                promptVariables={promptVariables} />

        )}
    </>;
};
interface AgentSpecificVariableProps {
    variableId: string;
    agent: Agent;
    promptVariables: string[];
}
const AgentSpecificVariable = ({ variableId, agent, promptVariables }: AgentSpecificVariableProps) => {
    const agentDefinedVariable = agent.agentSpecificVariables.find(v => v.name === variableId);
    const undeclared = agentDefinedVariable === undefined;
    const notUsed = !promptVariables.includes(variableId) && agentDefinedVariable?.usedInPrompt === true;
    return <li key={variableId}>
        <div><span>{nls.localize('theia/ai/core/agentConfiguration/name', 'Name:')}</span> <span>{variableId}</span></div>
        {undeclared ? <div><span>{nls.localize('theia/ai/core/agentConfiguration/undeclared', 'Undeclared')}</span></div> :
            (<>
                <div><span>{nls.localize('theia/ai/core/agentConfiguration/description', 'Description:')}</span> <span>{agentDefinedVariable.description}</span></div>
                {notUsed && <div>{nls.localize('theia/ai/core/agentConfiguration/notUsedInPrompt', 'Not used in prompt')}</div>}
            </>)}
        <hr />
    </li>;
};
