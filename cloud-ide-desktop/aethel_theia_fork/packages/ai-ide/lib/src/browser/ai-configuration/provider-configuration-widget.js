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
var ProviderConfigurationWidget_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderConfigurationWidget = exports.ProviderConfigurationWidgetID = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const browser_1 = require("@theia/core/lib/browser");
const inversify_1 = require("@theia/core/shared/inversify");
const llm_provider_registry_1 = require("../../browser/llm-provider-registry");
const core_1 = require("@theia/core");
exports.ProviderConfigurationWidgetID = 'ai-llm-provider-configuration-widget';
let ProviderConfigurationWidget = class ProviderConfigurationWidget extends browser_1.BaseWidget {
    static { ProviderConfigurationWidget_1 = this; }
    static { this.ID = exports.ProviderConfigurationWidgetID; }
    set widgetManager(v) { this._widgetManager = v; }
    get widgetManager() { if (!this._widgetManager) {
        throw new Error('ProviderConfigurationWidget: widgetManager not injected');
    } return this._widgetManager; }
    set registry(v) { this._registry = v; }
    get registry() { if (!this._registry) {
        throw new Error('ProviderConfigurationWidget: registry not injected');
    } return this._registry; }
    set messageService(v) { this._messageService = v; }
    get messageService() { if (!this._messageService) {
        throw new Error('ProviderConfigurationWidget: messageService not injected');
    } return this._messageService; }
    constructor() {
        super();
        this.state = { id: '', name: '', endpoint: '', apiKey: '', providers: [] };
        this.id = ProviderConfigurationWidget_1.ID;
        this.title.label = 'LLM Providers';
    }
    async init() {
        // load providers from registry
        try {
            const _all = this.registry.getAll();
            this.state.providers = _all;
            this.update();
        }
        catch (e) {
            // ignore
        }
    }
    render() {
        return ((0, jsx_runtime_1.jsx)("div", { className: 'p-2 provider-config-root', children: (0, jsx_runtime_1.jsxs)("div", { className: 'provider-config-columns', children: [(0, jsx_runtime_1.jsxs)("div", { className: 'provider-config-column', children: [(0, jsx_runtime_1.jsx)("h3", { children: "Configured providers" }), (0, jsx_runtime_1.jsx)("ul", { children: this.state.providers.map(p => ((0, jsx_runtime_1.jsxs)("li", { className: 'provider-item', children: [(0, jsx_runtime_1.jsx)("strong", { children: p.name || p.id }), " ", (0, jsx_runtime_1.jsxs)("small", { children: ["(", p.endpoint || 'no endpoint', ")"] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => this.selectProvider(p.id), children: "Edit" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => this.deleteProvider(p.id), children: "Delete" })] })] }, p.id))) })] }), (0, jsx_runtime_1.jsxs)("div", { className: 'provider-config-column', children: [(0, jsx_runtime_1.jsx)("h3", { children: this.state.selected ? 'Edit provider' : 'New provider' }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { children: "Id" }), (0, jsx_runtime_1.jsx)("input", { value: this.state.id, onChange: e => { this.state.id = e.target.value; this.update(); } })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { children: "Name" }), (0, jsx_runtime_1.jsx)("input", { value: this.state.name, onChange: e => { this.state.name = e.target.value; this.update(); } })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { children: "Endpoint" }), (0, jsx_runtime_1.jsx)("input", { value: this.state.endpoint, onChange: e => { this.state.endpoint = e.target.value; this.update(); } })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { children: "API Key" }), (0, jsx_runtime_1.jsx)("input", { type: 'password', value: this.state.apiKey, onChange: e => { this.state.apiKey = e.target.value; this.update(); } })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { children: "Type" }), (0, jsx_runtime_1.jsxs)("select", { value: this.state.type ?? 'custom', onChange: e => { this.state.type = e.target.value; this.update(); }, children: [(0, jsx_runtime_1.jsx)("option", { value: 'custom', children: "Custom HTTP" }), (0, jsx_runtime_1.jsx)("option", { value: 'ensemble', children: "Ensemble (multi-provider)" })] })] }), this.state.type === 'ensemble' && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { children: "Member provider IDs (comma separated)" }), (0, jsx_runtime_1.jsx)("input", { value: this.state.providerIds ?? '', onChange: e => { this.state.providerIds = e.target.value; this.update(); } })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { children: "Ensemble mode" }), (0, jsx_runtime_1.jsxs)("select", { value: this.state.mode ?? 'fast', onChange: e => { this.state.mode = e.target.value; this.update(); }, children: [(0, jsx_runtime_1.jsx)("option", { value: 'fast', children: "Fast (first good)" }), (0, jsx_runtime_1.jsx)("option", { value: 'blend', children: "Blend (concatenate)" }), (0, jsx_runtime_1.jsx)("option", { value: 'best', children: "Best (heuristic)" })] })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { children: "Timeout (ms)" }), (0, jsx_runtime_1.jsx)("input", { type: 'number', value: this.state.timeoutMs ?? 2500, onChange: e => { this.state.timeoutMs = parseInt(e.target.value) || 2500; this.update(); } })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { children: "Constraints (comma separated, e.g. no_weapons,no_smoke)" }), (0, jsx_runtime_1.jsx)("input", { value: this.state.constraints ?? '', onChange: e => { this.state.constraints = e.target.value; this.update(); } })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { children: "Verification mode" }), (0, jsx_runtime_1.jsxs)("select", { value: this.state.verificationMode ?? 'strict', onChange: e => { this.state.verificationMode = e.target.value; this.update(); }, children: [(0, jsx_runtime_1.jsx)("option", { value: 'strict', children: "Strict (block on violations)" }), (0, jsx_runtime_1.jsx)("option", { value: 'soft', children: "Soft (warn but proceed)" })] })] })] })), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { children: "Billing mode" }), (0, jsx_runtime_1.jsxs)("select", { value: this.state.billingMode ?? 'self', onChange: e => { this.state.billingMode = e.target.value; this.update(); }, children: [(0, jsx_runtime_1.jsx)("option", { value: 'self', children: "Self (user-owned)" }), (0, jsx_runtime_1.jsx)("option", { value: 'platform', children: "Platform (Aethel billed)" }), (0, jsx_runtime_1.jsx)("option", { value: 'sponsored', children: "Sponsored / Free" })] })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { children: "Price per token" }), (0, jsx_runtime_1.jsx)("input", { type: 'number', step: '0.0000001', value: this.state.pricePerToken ?? '', onChange: e => { this.state.pricePerToken = parseFloat(e.target.value) || 0; this.update(); } })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { children: "Currency" }), (0, jsx_runtime_1.jsx)("input", { value: this.state.currency ?? 'USD', onChange: e => { this.state.currency = e.target.value; this.update(); } })] }), (0, jsx_runtime_1.jsxs)("div", { className: 'provider-actions', children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => this.save(), children: "Save provider" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => this.clear(), children: "Clear" })] })] })] }) }));
    }
    save() {
        // Enforce non-admin authors to create self-billed providers
        const isAdmin = typeof window !== 'undefined' && window.__IS_ADMIN === true;
        const billingMode = isAdmin ? (this.state.billingMode ?? 'self') : 'self';
        const cfg = {
            id: this.state.id || `local-${Date.now()}`,
            name: this.state.name || this.state.id,
            endpoint: this.state.endpoint || undefined,
            apiKey: this.state.apiKey || undefined,
            billingMode: billingMode,
            rateCard: { pricePerToken: this.state.pricePerToken ?? 0, currency: this.state.currency ?? 'USD' },
            ownerId: isAdmin ? this.state.ownerId ?? undefined : undefined,
            type: this.state.type ?? 'custom'
        };
        if (cfg.type === 'ensemble') {
            const members = (this.state.providerIds || '').split(',').map(s => s.trim()).filter(Boolean);
            cfg.providerIds = members;
            cfg.mode = this.state.mode ?? 'fast';
            cfg.timeoutMs = this.state.timeoutMs ?? 2500;
            const constraints = (this.state.constraints || '').split(',').map(s => s.trim()).filter(Boolean);
            if (constraints.length) {
                cfg.constraints = constraints;
            }
            // verification mode: soft warns or strict blocks
            cfg.verificationMode = this.state.verificationMode ?? 'strict';
        }
        try {
            this.registry.addProvider(cfg);
            // optimistic update to list
            const existing = this.state.providers.filter(p => p.id !== cfg.id);
            const sanitized = { ...cfg };
            // hide secret on UI
            if ('apiKey' in sanitized) {
                delete sanitized['apiKey'];
            }
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
        if (!p) {
            return;
        }
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
            if (this.state.selected === id) {
                this.clear();
            }
            this.messageService.info('Provider delete triggered (backend will be updated if available).');
        }
        catch (e) {
            this.messageService.error('Failed to delete provider');
        }
        this.update();
    }
};
exports.ProviderConfigurationWidget = ProviderConfigurationWidget;
__decorate([
    (0, inversify_1.inject)(browser_1.WidgetManager),
    __metadata("design:type", browser_1.WidgetManager)
], ProviderConfigurationWidget.prototype, "_widgetManager", void 0);
__decorate([
    (0, inversify_1.inject)(browser_1.WidgetManager),
    __metadata("design:type", browser_1.WidgetManager),
    __metadata("design:paramtypes", [browser_1.WidgetManager])
], ProviderConfigurationWidget.prototype, "widgetManager", null);
__decorate([
    (0, inversify_1.inject)(llm_provider_registry_1.LlmProviderRegistry),
    __metadata("design:type", llm_provider_registry_1.LlmProviderRegistry)
], ProviderConfigurationWidget.prototype, "_registry", void 0);
__decorate([
    (0, inversify_1.inject)(llm_provider_registry_1.LlmProviderRegistry),
    __metadata("design:type", llm_provider_registry_1.LlmProviderRegistry),
    __metadata("design:paramtypes", [llm_provider_registry_1.LlmProviderRegistry])
], ProviderConfigurationWidget.prototype, "registry", null);
__decorate([
    (0, inversify_1.inject)(core_1.MessageService),
    __metadata("design:type", Object)
], ProviderConfigurationWidget.prototype, "_messageService", void 0);
__decorate([
    (0, inversify_1.inject)(core_1.MessageService),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [Object])
], ProviderConfigurationWidget.prototype, "messageService", null);
exports.ProviderConfigurationWidget = ProviderConfigurationWidget = ProviderConfigurationWidget_1 = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], ProviderConfigurationWidget);
