"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIAgentConfigurationViewContribution = exports.OPEN_AI_CONFIG_VIEW = exports.AI_CONFIGURATION_TOGGLE_COMMAND_ID = void 0;
const tslib_1 = require("tslib");
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
const core_1 = require("@theia/core");
const browser_1 = require("@theia/ai-core/lib/browser");
const chat_view_widget_1 = require("@theia/ai-chat-ui/lib/browser/chat-view-widget");
const inversify_1 = require("@theia/core/shared/inversify");
const ai_configuration_widget_1 = require("./ai-configuration-widget");
exports.AI_CONFIGURATION_TOGGLE_COMMAND_ID = 'aiConfiguration:toggle';
exports.OPEN_AI_CONFIG_VIEW = core_1.Command.toLocalizedCommand({
    id: 'aiConfiguration:open',
    label: 'Open AI Configuration view',
});
let AIAgentConfigurationViewContribution = class AIAgentConfigurationViewContribution extends browser_1.AIViewContribution {
    constructor() {
        super({
            widgetId: ai_configuration_widget_1.AIConfigurationContainerWidget.ID,
            widgetName: ai_configuration_widget_1.AIConfigurationContainerWidget.LABEL,
            defaultWidgetOptions: {
                area: 'main',
                rank: 100
            },
            toggleCommandId: exports.AI_CONFIGURATION_TOGGLE_COMMAND_ID
        });
    }
    async initializeLayout(_app) {
        await this.openView();
    }
    registerCommands(commands) {
        super.registerCommands(commands);
        commands.registerCommand(exports.OPEN_AI_CONFIG_VIEW, {
            execute: () => this.openView({ activate: true }),
        });
    }
    registerToolbarItems(registry) {
        registry.registerItem({
            id: 'chat-view.' + exports.OPEN_AI_CONFIG_VIEW.id,
            command: exports.OPEN_AI_CONFIG_VIEW.id,
            tooltip: core_1.nls.localize('theia/ai-ide/open-agent-settings-tooltip', 'Open Agent settings...'),
            group: 'ai-settings',
            priority: 2,
            isVisible: widget => this.activationService.isActive && widget instanceof chat_view_widget_1.ChatViewWidget
        });
    }
};
exports.AIAgentConfigurationViewContribution = AIAgentConfigurationViewContribution;
exports.AIAgentConfigurationViewContribution = AIAgentConfigurationViewContribution = tslib_1.__decorate([
    (0, inversify_1.injectable)(),
    tslib_1.__metadata("design:paramtypes", [])
], AIAgentConfigurationViewContribution);
//# sourceMappingURL=ai-configuration-view-contribution.js.map