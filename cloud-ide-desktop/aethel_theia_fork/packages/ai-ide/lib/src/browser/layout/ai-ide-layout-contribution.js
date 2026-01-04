"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiIdeLayoutContribution = void 0;
const inversify_1 = require("@theia/core/shared/inversify");
const browser_1 = require("@theia/core/lib/browser");
const provider_configuration_widget_1 = require("../ai-configuration/provider-configuration-widget");
const agent_configuration_widget_1 = require("../ai-configuration/agent-configuration-widget");
const tools_configuration_widget_1 = require("../ai-configuration/tools-configuration-widget");
const token_usage_configuration_widget_1 = require("../ai-configuration/token-usage-configuration-widget");
const ai_history_widget_1 = require("@theia/ai-history/lib/browser/ai-history-widget");
const chat_view_widget_1 = require("@theia/ai-chat-ui/lib/browser/chat-view-widget");
/**
 * Shapes the default workbench layout so the IDE boots with a populated surface that
 * mirrors the multi-panel workflows we discussed (configuration panes on the left,
 * chat + inspector center, telemetry/billing on the right/bottom).
 */
let AiIdeLayoutContribution = class AiIdeLayoutContribution {
    constructor(shell, widgetManager) {
        this.shell = shell;
        this.widgetManager = widgetManager;
        this.widgetIcons = new Map([
            [provider_configuration_widget_1.ProviderConfigurationWidget.ID, 'codicon codicon-cloud'],
            [agent_configuration_widget_1.AIAgentConfigurationWidget.ID, 'codicon codicon-organization'],
            [tools_configuration_widget_1.AIToolsConfigurationWidget.ID, 'codicon codicon-tools'],
            [token_usage_configuration_widget_1.AITokenUsageConfigurationWidget.ID, 'codicon codicon-graph-line'],
            [chat_view_widget_1.ChatViewWidget.ID, 'codicon codicon-comment-discussion'],
            [ai_history_widget_1.AIHistoryView.ID, 'codicon codicon-history']
        ]);
    }
    async initializeLayout(_app) {
        const layoutPromises = [
            this.openWidget(provider_configuration_widget_1.ProviderConfigurationWidget.ID, 'left', { rank: 10 }),
            this.openWidget(agent_configuration_widget_1.AIAgentConfigurationWidget.ID, 'left', { rank: 20 }),
            this.openWidget(tools_configuration_widget_1.AIToolsConfigurationWidget.ID, 'left', { rank: 30 }),
            this.openWidget(token_usage_configuration_widget_1.AITokenUsageConfigurationWidget.ID, 'bottom', { rank: 10 }),
            this.openWidget(chat_view_widget_1.ChatViewWidget.ID, 'main'),
            this.openWidget(ai_history_widget_1.AIHistoryView.ID, 'right', { rank: 10 }),
        ];
        await Promise.all(layoutPromises);
        await this.ensureWidgetVisible(provider_configuration_widget_1.ProviderConfigurationWidget.ID);
        this.shell.leftPanelHandler.expand(provider_configuration_widget_1.ProviderConfigurationWidget.ID);
        await this.ensureWidgetVisible(ai_history_widget_1.AIHistoryView.ID);
        this.shell.rightPanelHandler.expand(ai_history_widget_1.AIHistoryView.ID);
        await this.ensureWidgetVisible(token_usage_configuration_widget_1.AITokenUsageConfigurationWidget.ID);
        // Finish on the chat view so the primary interaction surface is selected.
        await this.ensureWidgetVisible(chat_view_widget_1.ChatViewWidget.ID);
    }
    async openWidget(widgetId, area, options = {}) {
        try {
            const widget = await this.widgetManager.getOrCreateWidget(widgetId);
            const iconClass = this.widgetIcons.get(widgetId);
            if (iconClass) {
                widget.title.iconClass = iconClass;
            }
            await this.attachIfNeeded(widget, area, options);
        }
        catch (error) {
            console.error(`[ai-ide] failed to open widget ${widgetId}`, error);
        }
    }
    async attachIfNeeded(widget, area, options) {
        if (!widget.isAttached) {
            this.shell.addWidget(widget, { area, ...options });
        }
    }
    async ensureWidgetVisible(widgetId) {
        try {
            await this.shell.activateWidget(widgetId);
        }
        catch (error) {
            console.warn(`[ai-ide] failed to activate widget ${widgetId}`, error);
        }
    }
};
exports.AiIdeLayoutContribution = AiIdeLayoutContribution;
exports.AiIdeLayoutContribution = AiIdeLayoutContribution = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(browser_1.ApplicationShell)),
    __param(1, (0, inversify_1.inject)(browser_1.WidgetManager)),
    __metadata("design:paramtypes", [browser_1.ApplicationShell,
        browser_1.WidgetManager])
], AiIdeLayoutContribution);
