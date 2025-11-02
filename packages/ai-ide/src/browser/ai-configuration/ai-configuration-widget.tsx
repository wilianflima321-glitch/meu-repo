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

import { BaseWidget, BoxLayout, codicon, DockPanel, WidgetManager } from '@theia/core/lib/browser';
import { TheiaDockPanel } from '@theia/core/lib/browser/shell/theia-dock-panel';
import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import { AIAgentConfigurationWidget } from './agent-configuration-widget';
import { AIVariableConfigurationWidget } from './variable-configuration-widget';
import { AIToolsConfigurationWidget } from './tools-configuration-widget';
import { AIConfigurationSelectionService } from './ai-configuration-service';
import { nls } from '@theia/core';
import { AIMCPConfigurationWidget } from './mcp-configuration-widget';
import { AITokenUsageConfigurationWidget } from './token-usage-configuration-widget';
import { AIPromptFragmentsConfigurationWidget } from './prompt-fragments-configuration-widget';
import { ModelAliasesConfigurationWidget } from './model-aliases-configuration-widget';

@injectable()
export class AIConfigurationContainerWidget extends BaseWidget {

    static readonly ID = 'ai-configuration';
    static readonly LABEL = nls.localize('theia/ai/core/aiConfiguration/label', 'AI Configuration [Beta]');
    private _dockpanel?: DockPanel;
    protected set dockpanel(v: DockPanel) { this._dockpanel = v; }
    protected get dockpanel(): DockPanel { if (!this._dockpanel) { throw new Error('AIConfigurationContainerWidget: dockpanel not initialized'); } return this._dockpanel; }

    private _dockPanelFactory?: TheiaDockPanel.Factory;
    @inject(TheiaDockPanel.Factory)
    protected set dockPanelFactory(v: TheiaDockPanel.Factory) { this._dockPanelFactory = v; }
    protected get dockPanelFactory(): TheiaDockPanel.Factory { if (!this._dockPanelFactory) { throw new Error('AIConfigurationContainerWidget: dockPanelFactory not injected'); } return this._dockPanelFactory; }

    private _widgetManager?: WidgetManager;
    @inject(WidgetManager)
    protected set widgetManager(v: WidgetManager) { this._widgetManager = v; }
    protected get widgetManager(): WidgetManager { if (!this._widgetManager) { throw new Error('AIConfigurationContainerWidget: widgetManager not injected'); } return this._widgetManager; }

    private _aiConfigurationSelectionService?: AIConfigurationSelectionService;
    @inject(AIConfigurationSelectionService)
    protected set aiConfigurationSelectionService(v: AIConfigurationSelectionService) { this._aiConfigurationSelectionService = v; }
    protected get aiConfigurationSelectionService(): AIConfigurationSelectionService { if (!this._aiConfigurationSelectionService) { throw new Error('AIConfigurationContainerWidget: aiConfigurationSelectionService not injected'); } return this._aiConfigurationSelectionService; }

    private _agentsWidget?: AIAgentConfigurationWidget;
    protected set agentsWidget(v: AIAgentConfigurationWidget) { this._agentsWidget = v; }
    protected get agentsWidget(): AIAgentConfigurationWidget { if (!this._agentsWidget) { throw new Error('AIConfigurationContainerWidget: agentsWidget not initialized'); } return this._agentsWidget; }

    private _variablesWidget?: AIVariableConfigurationWidget;
    protected set variablesWidget(v: AIVariableConfigurationWidget) { this._variablesWidget = v; }
    protected get variablesWidget(): AIVariableConfigurationWidget { if (!this._variablesWidget) { throw new Error('AIConfigurationContainerWidget: variablesWidget not initialized'); } return this._variablesWidget; }

    private _mcpWidget?: AIMCPConfigurationWidget;
    protected set mcpWidget(v: AIMCPConfigurationWidget) { this._mcpWidget = v; }
    protected get mcpWidget(): AIMCPConfigurationWidget { if (!this._mcpWidget) { throw new Error('AIConfigurationContainerWidget: mcpWidget not initialized'); } return this._mcpWidget; }

    private _tokenUsageWidget?: AITokenUsageConfigurationWidget;
    protected set tokenUsageWidget(v: AITokenUsageConfigurationWidget) { this._tokenUsageWidget = v; }
    protected get tokenUsageWidget(): AITokenUsageConfigurationWidget { if (!this._tokenUsageWidget) { throw new Error('AIConfigurationContainerWidget: tokenUsageWidget not initialized'); } return this._tokenUsageWidget; }

    private _promptFragmentsWidget?: AIPromptFragmentsConfigurationWidget;
    protected set promptFragmentsWidget(v: AIPromptFragmentsConfigurationWidget) { this._promptFragmentsWidget = v; }
    protected get promptFragmentsWidget(): AIPromptFragmentsConfigurationWidget { if (!this._promptFragmentsWidget) { throw new Error('AIConfigurationContainerWidget: promptFragmentsWidget not initialized'); } return this._promptFragmentsWidget; }

    private _toolsWidget?: AIToolsConfigurationWidget;
    protected set toolsWidget(v: AIToolsConfigurationWidget) { this._toolsWidget = v; }
    protected get toolsWidget(): AIToolsConfigurationWidget { if (!this._toolsWidget) { throw new Error('AIConfigurationContainerWidget: toolsWidget not initialized'); } return this._toolsWidget; }

    private _modelAliasesWidget?: ModelAliasesConfigurationWidget;
    protected set modelAliasesWidget(v: ModelAliasesConfigurationWidget) { this._modelAliasesWidget = v; }
    protected get modelAliasesWidget(): ModelAliasesConfigurationWidget { if (!this._modelAliasesWidget) { throw new Error('AIConfigurationContainerWidget: modelAliasesWidget not initialized'); } return this._modelAliasesWidget; }

    @postConstruct()
    protected init(): void {
        this.id = AIConfigurationContainerWidget.ID;
        this.title.label = AIConfigurationContainerWidget.LABEL;
        this.title.closable = true;
        this.addClass('theia-settings-container');
        this.title.iconClass = codicon('hubot');
        this.initUI();
        this.initListeners();
    }

    protected async initUI(): Promise<void> {
        const layout = (this.layout = new BoxLayout({ direction: 'top-to-bottom', spacing: 0 }));
        this.dockpanel = this.dockPanelFactory({
            mode: 'multiple-document',
            spacing: 0
        });
        BoxLayout.setStretch(this.dockpanel, 1);
        layout.addWidget(this.dockpanel);
        this.dockpanel.addClass('ai-configuration-widget');

        this.agentsWidget = await this.widgetManager.getOrCreateWidget(AIAgentConfigurationWidget.ID);
        this.variablesWidget = await this.widgetManager.getOrCreateWidget(AIVariableConfigurationWidget.ID);
        this.mcpWidget = await this.widgetManager.getOrCreateWidget(AIMCPConfigurationWidget.ID);
        this.tokenUsageWidget = await this.widgetManager.getOrCreateWidget(AITokenUsageConfigurationWidget.ID);
        this.promptFragmentsWidget = await this.widgetManager.getOrCreateWidget(AIPromptFragmentsConfigurationWidget.ID);
        this.toolsWidget = await this.widgetManager.getOrCreateWidget(AIToolsConfigurationWidget.ID);
        this.modelAliasesWidget = await this.widgetManager.getOrCreateWidget(ModelAliasesConfigurationWidget.ID);

        this.dockpanel.addWidget(this.agentsWidget);
        this.dockpanel.addWidget(this.variablesWidget, { mode: 'tab-after', ref: this.agentsWidget });
        this.dockpanel.addWidget(this.mcpWidget, { mode: 'tab-after', ref: this.variablesWidget });
        this.dockpanel.addWidget(this.tokenUsageWidget, { mode: 'tab-after', ref: this.mcpWidget });
        this.dockpanel.addWidget(this.promptFragmentsWidget, { mode: 'tab-after', ref: this.tokenUsageWidget });
        this.dockpanel.addWidget(this.toolsWidget, { mode: 'tab-after', ref: this.promptFragmentsWidget });
        this.dockpanel.addWidget(this.modelAliasesWidget, { mode: 'tab-after', ref: this.toolsWidget });

        this.update();
    }

    protected initListeners(): void {
    this.aiConfigurationSelectionService.onDidSelectConfiguration((widgetId: any) => {
            if (widgetId === AIAgentConfigurationWidget.ID) {
                this.dockpanel.activateWidget(this.agentsWidget);
            } else if (widgetId === AIVariableConfigurationWidget.ID) {
                this.dockpanel.activateWidget(this.variablesWidget);
            } else if (widgetId === AIMCPConfigurationWidget.ID) {
                this.dockpanel.activateWidget(this.mcpWidget);
            } else if (widgetId === AITokenUsageConfigurationWidget.ID) {
                this.dockpanel.activateWidget(this.tokenUsageWidget);
            } else if (widgetId === AIPromptFragmentsConfigurationWidget.ID) {
                this.dockpanel.activateWidget(this.promptFragmentsWidget);
            } else if (widgetId === AIToolsConfigurationWidget.ID) {
                this.dockpanel.activateWidget(this.toolsWidget);
            } else if (widgetId === ModelAliasesConfigurationWidget.ID) {
                this.dockpanel.activateWidget(this.modelAliasesWidget);
            }
        });
    }
}
