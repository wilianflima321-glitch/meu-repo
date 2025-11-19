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
var AiIdeBrandingWidget_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiIdeBrandingWidget = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const inversify_1 = require("@theia/core/shared/inversify");
const browser_1 = require("@theia/core/lib/browser");
const react_widget_1 = require("@theia/core/lib/browser/widgets/react-widget");
const ai_configuration_service_1 = require("../ai-configuration/ai-configuration-service");
const provider_configuration_widget_1 = require("../ai-configuration/provider-configuration-widget");
const agent_configuration_widget_1 = require("../ai-configuration/agent-configuration-widget");
const tools_configuration_widget_1 = require("../ai-configuration/tools-configuration-widget");
const token_usage_configuration_widget_1 = require("../ai-configuration/token-usage-configuration-widget");
const chat_view_widget_1 = require("@theia/ai-chat-ui/lib/browser/chat-view-widget");
const ai_history_widget_1 = require("@theia/ai-history/lib/browser/ai-history-widget");
const branding_copy_1 = require("./branding-copy");
let AiIdeBrandingWidget = class AiIdeBrandingWidget extends react_widget_1.ReactWidget {
    static { AiIdeBrandingWidget_1 = this; }
    static { this.ID = 'ai-ide-branding-widget'; }
    constructor(shell, widgetManager, configurationSelection) {
        super();
        this.shell = shell;
        this.widgetManager = widgetManager;
        this.configurationSelection = configurationSelection;
        this.quickActions = [];
        this.id = AiIdeBrandingWidget_1.ID;
        this.addClass('ai-ide-branding-widget');
        this.node.setAttribute('role', 'banner');
    }
    init() {
        this.quickActions = this.createQuickActions();
    }
    createQuickActions() {
        const copy = (0, branding_copy_1.getBrandingCopy)();
        return [
            {
                id: 'providers',
                label: copy.quickActions.providers.label,
                description: copy.quickActions.providers.description,
                codicon: 'cloud',
                widgetId: provider_configuration_widget_1.ProviderConfigurationWidget.ID,
                area: 'left'
            },
            {
                id: 'agents',
                label: copy.quickActions.agents.label,
                description: copy.quickActions.agents.description,
                codicon: 'organization',
                widgetId: agent_configuration_widget_1.AIAgentConfigurationWidget.ID,
                area: 'left'
            },
            {
                id: 'tools',
                label: copy.quickActions.tools.label,
                description: copy.quickActions.tools.description,
                codicon: 'tools',
                widgetId: tools_configuration_widget_1.AIToolsConfigurationWidget.ID,
                area: 'left'
            },
            {
                id: 'usage',
                label: copy.quickActions.usage.label,
                description: copy.quickActions.usage.description,
                codicon: 'graph-line',
                widgetId: token_usage_configuration_widget_1.AITokenUsageConfigurationWidget.ID,
                area: 'bottom'
            },
            {
                id: 'chat',
                label: copy.quickActions.chat.label,
                description: copy.quickActions.chat.description,
                codicon: 'comment-discussion',
                widgetId: chat_view_widget_1.ChatViewWidget.ID,
                area: 'main'
            },
            {
                id: 'history',
                label: copy.quickActions.history.label,
                description: copy.quickActions.history.description,
                codicon: 'history',
                widgetId: ai_history_widget_1.AIHistoryView.ID,
                area: 'right'
            },
        ];
    }
    render() {
        const copy = (0, branding_copy_1.getBrandingCopy)();
        return ((0, jsx_runtime_1.jsxs)("div", { className: 'ai-ide-branding-bar', children: [(0, jsx_runtime_1.jsxs)("div", { className: 'ai-ide-branding-identity', children: [(0, jsx_runtime_1.jsx)("div", { className: 'ai-ide-logo-mark', children: (0, jsx_runtime_1.jsxs)("svg", { width: '32', height: '32', viewBox: '0 0 64 64', role: 'img', "aria-label": copy.logoAriaLabel, children: [(0, jsx_runtime_1.jsx)("title", { children: copy.logoTitle }), (0, jsx_runtime_1.jsx)("defs", { children: (0, jsx_runtime_1.jsxs)("linearGradient", { id: 'ai-ide-logo-gradient', x1: '0%', y1: '0%', x2: '100%', y2: '100%', children: [(0, jsx_runtime_1.jsx)("stop", { offset: '0%', stopColor: '#6366f1' }), (0, jsx_runtime_1.jsx)("stop", { offset: '100%', stopColor: '#ec4899' })] }) }), (0, jsx_runtime_1.jsx)("rect", { width: '64', height: '64', rx: '14', fill: 'url(#ai-ide-logo-gradient)' }), (0, jsx_runtime_1.jsx)("path", { d: 'M18 42l14-22 14 22', stroke: '#ffffff', strokeWidth: '4', strokeLinecap: 'round', strokeLinejoin: 'round' }), (0, jsx_runtime_1.jsx)("circle", { cx: '32', cy: '42', r: '3', fill: '#ffffff' })] }) }), (0, jsx_runtime_1.jsxs)("div", { className: 'ai-ide-branding-text', children: [(0, jsx_runtime_1.jsx)("span", { className: 'ai-ide-branding-name', children: copy.name }), (0, jsx_runtime_1.jsx)("span", { className: 'ai-ide-branding-tagline', children: copy.tagline })] })] }), (0, jsx_runtime_1.jsx)("div", { className: 'ai-ide-branding-actions', children: this.quickActions.map(action => this.renderAction(action)) })] }));
    }
    renderAction(action) {
        const codiconClass = `codicon codicon-${action.codicon}`;
        return ((0, jsx_runtime_1.jsxs)("button", { className: 'ai-ide-branding-action', title: action.description, onClick: () => this.handleAction(action), children: [(0, jsx_runtime_1.jsx)("span", { className: codiconClass, "aria-hidden": 'true' }), (0, jsx_runtime_1.jsx)("span", { children: action.label })] }, action.id));
    }
    async handleAction(action) {
        await this.openWidget(action.widgetId, action.area);
        if (action.widgetId === provider_configuration_widget_1.ProviderConfigurationWidget.ID) {
            this.configurationSelection.selectConfigurationTab(provider_configuration_widget_1.ProviderConfigurationWidget.ID);
        }
        if (typeof action.onAfterOpen === 'function') {
            try {
                action.onAfterOpen();
            }
            catch (error) {
                console.warn('[ai-ide] quick action callback failure', error);
            }
        }
    }
    async openWidget(widgetId, area) {
        try {
            const widget = await this.widgetManager.getOrCreateWidget(widgetId);
            if (!widget.isAttached) {
                this.shell.addWidget(widget, { area });
            }
            await this.shell.activateWidget(widgetId);
        }
        catch (error) {
            console.error(`[ai-ide] failed to open widget ${widgetId} from branding bar`, error);
        }
    }
};
exports.AiIdeBrandingWidget = AiIdeBrandingWidget;
__decorate([
    (0, inversify_1.postConstruct)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AiIdeBrandingWidget.prototype, "init", null);
exports.AiIdeBrandingWidget = AiIdeBrandingWidget = AiIdeBrandingWidget_1 = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(browser_1.ApplicationShell)),
    __param(1, (0, inversify_1.inject)(browser_1.WidgetManager)),
    __param(2, (0, inversify_1.inject)(ai_configuration_service_1.AIConfigurationSelectionService)),
    __metadata("design:paramtypes", [browser_1.ApplicationShell,
        browser_1.WidgetManager,
        ai_configuration_service_1.AIConfigurationSelectionService])
], AiIdeBrandingWidget);
