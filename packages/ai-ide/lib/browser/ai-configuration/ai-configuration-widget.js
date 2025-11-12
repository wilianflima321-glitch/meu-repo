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
var AIConfigurationContainerWidget_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIConfigurationContainerWidget = void 0;
const tslib_1 = require("tslib");
const browser_1 = require("@theia/core/lib/browser");
const theia_dock_panel_1 = require("@theia/core/lib/browser/shell/theia-dock-panel");
const inversify_1 = require("@theia/core/shared/inversify");
const agent_configuration_widget_1 = require("./agent-configuration-widget");
const variable_configuration_widget_1 = require("./variable-configuration-widget");
const tools_configuration_widget_1 = require("./tools-configuration-widget");
const ai_configuration_service_1 = require("./ai-configuration-service");
const core_1 = require("@theia/core");
const mcp_configuration_widget_1 = require("./mcp-configuration-widget");
const token_usage_configuration_widget_1 = require("./token-usage-configuration-widget");
const prompt_fragments_configuration_widget_1 = require("./prompt-fragments-configuration-widget");
const model_aliases_configuration_widget_1 = require("./model-aliases-configuration-widget");
let AIConfigurationContainerWidget = class AIConfigurationContainerWidget extends browser_1.BaseWidget {
    static { AIConfigurationContainerWidget_1 = this; }
    static ID = 'ai-configuration';
    static LABEL = core_1.nls.localize('theia/ai/core/aiConfiguration/label', 'AI Configuration [Beta]');
    dockpanel;
    dockPanelFactory;
    widgetManager;
    aiConfigurationSelectionService;
    agentsWidget;
    variablesWidget;
    mcpWidget;
    tokenUsageWidget;
    promptFragmentsWidget;
    toolsWidget;
    modelAliasesWidget;
    init() {
        this.id = AIConfigurationContainerWidget_1.ID;
        this.title.label = AIConfigurationContainerWidget_1.LABEL;
        this.title.closable = true;
        this.addClass('theia-settings-container');
        this.title.iconClass = (0, browser_1.codicon)('hubot');
        this.initUI();
        this.initListeners();
    }
    async initUI() {
        const layout = (this.layout = new browser_1.BoxLayout({ direction: 'top-to-bottom', spacing: 0 }));
        this.dockpanel = this.dockPanelFactory({
            mode: 'multiple-document',
            spacing: 0
        });
        browser_1.BoxLayout.setStretch(this.dockpanel, 1);
        layout.addWidget(this.dockpanel);
        this.dockpanel.addClass('ai-configuration-widget');
        this.agentsWidget = await this.widgetManager.getOrCreateWidget(agent_configuration_widget_1.AIAgentConfigurationWidget.ID);
        this.variablesWidget = await this.widgetManager.getOrCreateWidget(variable_configuration_widget_1.AIVariableConfigurationWidget.ID);
        this.mcpWidget = await this.widgetManager.getOrCreateWidget(mcp_configuration_widget_1.AIMCPConfigurationWidget.ID);
        this.tokenUsageWidget = await this.widgetManager.getOrCreateWidget(token_usage_configuration_widget_1.AITokenUsageConfigurationWidget.ID);
        this.promptFragmentsWidget = await this.widgetManager.getOrCreateWidget(prompt_fragments_configuration_widget_1.AIPromptFragmentsConfigurationWidget.ID);
        this.toolsWidget = await this.widgetManager.getOrCreateWidget(tools_configuration_widget_1.AIToolsConfigurationWidget.ID);
        this.modelAliasesWidget = await this.widgetManager.getOrCreateWidget(model_aliases_configuration_widget_1.ModelAliasesConfigurationWidget.ID);
        this.dockpanel.addWidget(this.agentsWidget);
        this.dockpanel.addWidget(this.variablesWidget, { mode: 'tab-after', ref: this.agentsWidget });
        this.dockpanel.addWidget(this.mcpWidget, { mode: 'tab-after', ref: this.variablesWidget });
        this.dockpanel.addWidget(this.tokenUsageWidget, { mode: 'tab-after', ref: this.mcpWidget });
        this.dockpanel.addWidget(this.promptFragmentsWidget, { mode: 'tab-after', ref: this.tokenUsageWidget });
        this.dockpanel.addWidget(this.toolsWidget, { mode: 'tab-after', ref: this.promptFragmentsWidget });
        this.dockpanel.addWidget(this.modelAliasesWidget, { mode: 'tab-after', ref: this.toolsWidget });
        this.update();
    }
    initListeners() {
        this.aiConfigurationSelectionService.onDidSelectConfiguration(widgetId => {
            if (widgetId === agent_configuration_widget_1.AIAgentConfigurationWidget.ID) {
                this.dockpanel.activateWidget(this.agentsWidget);
            }
            else if (widgetId === variable_configuration_widget_1.AIVariableConfigurationWidget.ID) {
                this.dockpanel.activateWidget(this.variablesWidget);
            }
            else if (widgetId === mcp_configuration_widget_1.AIMCPConfigurationWidget.ID) {
                this.dockpanel.activateWidget(this.mcpWidget);
            }
            else if (widgetId === token_usage_configuration_widget_1.AITokenUsageConfigurationWidget.ID) {
                this.dockpanel.activateWidget(this.tokenUsageWidget);
            }
            else if (widgetId === prompt_fragments_configuration_widget_1.AIPromptFragmentsConfigurationWidget.ID) {
                this.dockpanel.activateWidget(this.promptFragmentsWidget);
            }
            else if (widgetId === tools_configuration_widget_1.AIToolsConfigurationWidget.ID) {
                this.dockpanel.activateWidget(this.toolsWidget);
            }
            else if (widgetId === model_aliases_configuration_widget_1.ModelAliasesConfigurationWidget.ID) {
                this.dockpanel.activateWidget(this.modelAliasesWidget);
            }
        });
    }
};
exports.AIConfigurationContainerWidget = AIConfigurationContainerWidget;
tslib_1.__decorate([
    (0, inversify_1.inject)(theia_dock_panel_1.TheiaDockPanel.Factory),
    tslib_1.__metadata("design:type", Function)
], AIConfigurationContainerWidget.prototype, "dockPanelFactory", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_1.WidgetManager),
    tslib_1.__metadata("design:type", browser_1.WidgetManager)
], AIConfigurationContainerWidget.prototype, "widgetManager", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(ai_configuration_service_1.AIConfigurationSelectionService),
    tslib_1.__metadata("design:type", ai_configuration_service_1.AIConfigurationSelectionService)
], AIConfigurationContainerWidget.prototype, "aiConfigurationSelectionService", void 0);
tslib_1.__decorate([
    (0, inversify_1.postConstruct)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], AIConfigurationContainerWidget.prototype, "init", null);
exports.AIConfigurationContainerWidget = AIConfigurationContainerWidget = AIConfigurationContainerWidget_1 = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], AIConfigurationContainerWidget);
//# sourceMappingURL=ai-configuration-widget.js.map