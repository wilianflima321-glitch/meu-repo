"use strict";
var ProviderConfigurationWidget_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderConfigurationWidget = exports.ProviderConfigurationWidgetID = void 0;
const tslib_1 = require("tslib");
const React = require("react");
const browser_1 = require("@theia/core/lib/browser");
const inversify_1 = require("@theia/core/shared/inversify");
const llm_provider_registry_1 = require("../../browser/llm-provider-registry");
const core_1 = require("@theia/core");
exports.ProviderConfigurationWidgetID = 'ai-llm-provider-configuration-widget';
let ProviderConfigurationWidget = class ProviderConfigurationWidget extends browser_1.BaseWidget {
    static { ProviderConfigurationWidget_1 = this; }
    static ID = exports.ProviderConfigurationWidgetID;
    widgetManager;
    registry;
    messageService;
    state = { id: '', name: '', endpoint: '', apiKey: '', providers: [] };
    constructor() {
        super();
        this.id = ProviderConfigurationWidget_1.ID;
        this.title.label = 'LLM Providers';
    }
    async init() {
        // load providers from registry
        try {
            const all = this.registry.getAll();
            this.state.providers = all;
            this.update();
        }
        catch (e) {
            // ignore
        }
    }
    render() {
        return (React.createElement("div", { className: 'p-2 provider-config-root' },
            React.createElement("div", { className: 'provider-config-columns' },
                React.createElement("div", { className: 'provider-config-column' },
                    React.createElement("h3", null, "Configured providers"),
                    React.createElement("ul", null, this.state.providers.map(p => (React.createElement("li", { key: p.id, className: 'provider-item' },
                        React.createElement("strong", null, p.name || p.id),
                        " ",
                        React.createElement("small", null,
                            "(",
                            p.endpoint || 'no endpoint',
                            ")"),
                        React.createElement("div", null,
                            React.createElement("button", { onClick: () => this.selectProvider(p.id) }, "Edit"),
                            React.createElement("button", { onClick: () => this.deleteProvider(p.id) }, "Delete"))))))),
                React.createElement("div", { className: 'provider-config-column' },
                    React.createElement("h3", null, this.state.selected ? 'Edit provider' : 'New provider'),
                    React.createElement("div", null,
                        React.createElement("label", null, "Id"),
                        React.createElement("input", { value: this.state.id, onChange: e => { this.state.id = e.target.value; this.update(); } })),
                    React.createElement("div", null,
                        React.createElement("label", null, "Name"),
                        React.createElement("input", { value: this.state.name, onChange: e => { this.state.name = e.target.value; this.update(); } })),
                    React.createElement("div", null,
                        React.createElement("label", null, "Endpoint"),
                        React.createElement("input", { value: this.state.endpoint, onChange: e => { this.state.endpoint = e.target.value; this.update(); } })),
                    React.createElement("div", null,
                        React.createElement("label", null, "API Key"),
                        React.createElement("input", { type: 'password', value: this.state.apiKey, onChange: e => { this.state.apiKey = e.target.value; this.update(); } })),
                    React.createElement("div", null,
                        React.createElement("label", null, "Billing mode"),
                        React.createElement("select", { value: this.state.billingMode ?? 'self', onChange: e => { this.state.billingMode = e.target.value; this.update(); } },
                            React.createElement("option", { value: 'self' }, "Self (user-owned)"),
                            React.createElement("option", { value: 'platform' }, "Platform (Aethel billed)"),
                            React.createElement("option", { value: 'sponsored' }, "Sponsored / Free"))),
                    React.createElement("div", null,
                        React.createElement("label", null, "Price per token"),
                        React.createElement("input", { type: 'number', step: '0.0000001', value: this.state.pricePerToken ?? '', onChange: e => { this.state.pricePerToken = parseFloat(e.target.value) || 0; this.update(); } })),
                    React.createElement("div", null,
                        React.createElement("label", null, "Currency"),
                        React.createElement("input", { value: this.state.currency ?? 'USD', onChange: e => { this.state.currency = e.target.value; this.update(); } })),
                    React.createElement("div", { className: 'provider-actions' },
                        React.createElement("button", { onClick: () => this.save() }, "Save provider"),
                        React.createElement("button", { onClick: () => this.clear() }, "Clear"))))));
    }
    save() {
        // Enforce non-admin authors to create self-billed providers
        const isAdmin = (typeof window !== 'undefined' && window.__IS_ADMIN) === true;
        const billingMode = isAdmin ? (this.state.billingMode ?? 'self') : 'self';
        const cfg = {
            id: this.state.id || `local-${Date.now()}`,
            name: this.state.name || this.state.id,
            endpoint: this.state.endpoint,
            apiKey: this.state.apiKey,
            billingMode,
            rateCard: { pricePerToken: this.state.pricePerToken ?? 0, currency: this.state.currency ?? 'USD' },
            ownerId: isAdmin ? this.state.ownerId ?? undefined : undefined
        };
        try {
            this.registry.addProvider(cfg);
            // optimistic update to list
            const existing = this.state.providers.filter(p => p.id !== cfg.id);
            const sanitized = { ...cfg, apiKey: undefined };
            // hide secret on UI
            if ('apiKey' in sanitized)
                delete sanitized.apiKey;
            this.state.providers = [...existing, sanitized];
            this.state.selected = cfg.id;
            // clear apiKey from local state
            this.state.apiKey = '';
            this.messageService.info('Provider saved (backend will be updated if available).');
        }
        catch (e) {
            this.messageService.error('Failed to save provider');
        }
        this.update();
    }
    clear() {
        this.state = { id: '', name: '', endpoint: '', apiKey: '', providers: this.state.providers };
        this.state.selected = undefined;
        this.update();
    }
    selectProvider(id) {
        const p = this.state.providers.find(x => x.id === id);
        if (!p)
            return;
        this.state.id = p.id;
        this.state.name = p.name || p.id;
        this.state.endpoint = p.endpoint || '';
        this.state.apiKey = '';
        this.state.selected = id;
        this.update();
    }
    deleteProvider(id) {
        try {
            this.registry.removeProvider(id);
            this.state.providers = this.state.providers.filter(p => p.id !== id);
            if (this.state.selected === id)
                this.clear();
            this.messageService.info('Provider delete triggered (backend will be updated if available).');
        }
        catch (e) {
            this.messageService.error('Failed to delete provider');
        }
        this.update();
    }
};
exports.ProviderConfigurationWidget = ProviderConfigurationWidget;
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_1.WidgetManager),
    tslib_1.__metadata("design:type", browser_1.WidgetManager)
], ProviderConfigurationWidget.prototype, "widgetManager", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(llm_provider_registry_1.LlmProviderRegistry),
    tslib_1.__metadata("design:type", llm_provider_registry_1.LlmProviderRegistry)
], ProviderConfigurationWidget.prototype, "registry", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.MessageService),
    tslib_1.__metadata("design:type", Object)
], ProviderConfigurationWidget.prototype, "messageService", void 0);
exports.ProviderConfigurationWidget = ProviderConfigurationWidget = ProviderConfigurationWidget_1 = tslib_1.__decorate([
    (0, inversify_1.injectable)(),
    tslib_1.__metadata("design:paramtypes", [])
], ProviderConfigurationWidget);
//# sourceMappingURL=provider-configuration-widget.js.map