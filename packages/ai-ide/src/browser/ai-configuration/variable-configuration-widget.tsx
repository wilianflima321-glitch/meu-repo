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

import { Agent, AgentService, AIVariable, AIVariableService } from '@theia/ai-core/lib/common';
import { codicon, ReactWidget } from '@theia/core/lib/browser';
import { Disposable } from '@theia/core';
import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import * as React from '@theia/core/shared/react';
import { AIAgentConfigurationWidget } from './agent-configuration-widget';
import { AIConfigurationSelectionService } from './ai-configuration-service';

@injectable()
export class AIVariableConfigurationWidget extends ReactWidget {

    static readonly ID = 'ai-variable-configuration-container-widget';
    static readonly LABEL = 'Variables';

    private _variableService?: AIVariableService;
    @inject(AIVariableService)
    protected set variableService(v: AIVariableService) { this._variableService = v; }
    protected get variableService(): AIVariableService { if (!this._variableService) { throw new Error('AIVariableConfigurationWidget: variableService not injected'); } return this._variableService; }

    private _agentService?: AgentService;
    @inject(AgentService)
    protected set agentService(v: AgentService) { this._agentService = v; }
    protected get agentService(): AgentService { if (!this._agentService) { throw new Error('AIVariableConfigurationWidget: agentService not injected'); } return this._agentService; }

    private _aiConfigurationSelectionService?: AIConfigurationSelectionService;
    @inject(AIConfigurationSelectionService)
    protected set aiConfigurationSelectionService(v: AIConfigurationSelectionService) { this._aiConfigurationSelectionService = v; }
    protected get aiConfigurationSelectionService(): AIConfigurationSelectionService { if (!this._aiConfigurationSelectionService) { throw new Error('AIVariableConfigurationWidget: aiConfigurationSelectionService not injected'); } return this._aiConfigurationSelectionService; }

    @postConstruct()
    protected init(): void {
        this.id = AIVariableConfigurationWidget.ID;
        this.title.label = AIVariableConfigurationWidget.LABEL;
        this.title.closable = false;
        this.update();
        // The onDidChangeVariables API may return either a unregister function or a Disposable.
        // Treat the return as an unknown runtime value and wrap unconditionally to avoid testing a value typed as void.
        const d: unknown = this.variableService.onDidChangeVariables(() => this.update());
        // Normalize listener return into a Disposable. Supports unregister functions and Disposable objects.
        const makeDisposable = (x: unknown): Disposable | undefined => {
            if (!x) {
                return undefined;
            }
            if (typeof x === 'function') {
                // The function type uses an unused parameter name in the type declaration;
                // suppress the no-unused-vars rule here to avoid lint noise.
                const fn = x as unknown as () => unknown;
                return { dispose: () => { try { fn(); } catch { /* swallow */ } } } as Disposable;
            }
            if (x && typeof (x as { dispose?: unknown }).dispose === 'function') {
                return x as Disposable;
            }
            return undefined;
        };
        const dd = makeDisposable(d);
        if (dd) {
            this.toDispose.push(dd);
        }
    }

    protected render(): React.ReactNode {
        return <div className='configuration-variables-list'>
            <ul>
                {this.variableService.getVariables().map(variable =>
                    <li key={variable.id} className='variable-item' >
                        <div className='settings-section-title settings-section-category-title variable-title'>{variable.name}</div>
                        <small>{variable.id}</small>
                        <small>{variable.description}</small>
                        {this.renderReferencedVariables(variable)}
                        {this.renderArgs(variable)}
                    </li>
                )}
            </ul>
        </div>;
    }

    protected renderReferencedVariables(variable: AIVariable): React.ReactNode | undefined {
        const agents = this.getAgentsForVariable(variable);
        if (agents.length === 0) {
            return;
        }

        return <div>
            <h3>Agents</h3>
            <ul className='variable-references'>
                {agents.map(agent => <li key={agent.id} className='theia-TreeNode theia-CompositeTreeNode theia-ExpandableTreeNode theia-mod-selected'>
                    <div onClick={() => { this.showAgentConfiguration(agent); }} className='variable-reference'>
                        <span>{agent.name}</span>
                        <i className={codicon('chevron-right')}></i>
                    </div></li>)}
            </ul>
        </div>;
    }

    protected renderArgs(variable: AIVariable): React.ReactNode | undefined {
        if (variable.args === undefined || variable.args.length === 0) {
            return;
        }

        return <div className='variable-args-container'>
            <h3>Variable Arguments</h3>
            <div className='variable-args'>
                {variable.args.map((arg: any) =>
                    <React.Fragment key={arg.name}>
                        <span>{arg.name}</span>
                        <small>{arg.description}</small>
                    </React.Fragment>
                )}
            </div>
        </div>;
    }

    protected showAgentConfiguration(agent: Agent): void {
        this.aiConfigurationSelectionService.setActiveAgent(agent);
        this.aiConfigurationSelectionService.selectConfigurationTab(AIAgentConfigurationWidget.ID);
    }

    protected getAgentsForVariable(variable: AIVariable): Agent[] {
        return this.agentService.getAgents().filter(a => a.variables?.includes(variable.id));
    }
}
