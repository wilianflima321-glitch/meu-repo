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
exports.AiIdeStatusBarContribution = void 0;
const inversify_1 = require("@theia/core/shared/inversify");
const status_bar_1 = require("@theia/core/lib/browser/status-bar/status-bar");
const disposable_1 = require("@theia/core/lib/common/disposable");
const ai_configuration_service_1 = require("../ai-configuration/ai-configuration-service");
const llm_provider_registry_1 = require("../llm-provider-registry");
let AiIdeStatusBarContribution = class AiIdeStatusBarContribution {
    constructor(statusBar, providerRegistry, selectionService) {
        this.statusBar = statusBar;
        this.providerRegistry = providerRegistry;
        this.selectionService = selectionService;
        this.toDispose = new disposable_1.DisposableCollection();
        this.currentProviders = [];
    }
    onStart() {
        this.renderProviderSummary();
        this.renderActiveAgent();
        this.toDispose.push(this.providerRegistry.onDidChangeProviders(providers => {
            this.renderProviderSummary(providers, this.currentDefaultProviderId);
        }));
        this.toDispose.push(this.providerRegistry.onDidChangeDefaultProvider(id => {
            this.currentDefaultProviderId = id;
            this.renderProviderSummary(this.currentProviders, id);
        }));
        const agentEvent = this.selectionService.onDidAgentChange;
        if (typeof agentEvent === 'function') {
            this.toDispose.push(agentEvent((agent) => {
                this.renderActiveAgent(agent?.name ?? agent?.id ?? undefined);
            }));
        }
    }
    renderProviderSummary(providersArg, defaultProviderId) {
        const providers = providersArg ?? this.safeGetProviders();
        this.currentProviders = [...providers];
        const defaultProvider = defaultProviderId ?? this.currentDefaultProviderId ?? this.providerRegistry.getDefaultProviderId();
        this.currentDefaultProviderId = defaultProvider;
        const total = providers.length;
        const summary = total === 0 ? 'Nenhum provedor configurado' : `${total} provedor${total > 1 ? 'es' : ''}`;
        const tooltip = defaultProvider
            ? `Provedor padrão: ${defaultProvider}\nClique para abrir as configurações.`
            : 'Configure provedores LLM. Clique para abrir as configurações.';
        this.statusBar.setElement('ai-ide-provider-summary', {
            alignment: status_bar_1.StatusBarAlignment.LEFT,
            text: `$(cloud) ${summary}`,
            tooltip,
            priority: 1000,
            command: 'aiConfiguration:open'
        });
    }
    renderActiveAgent(agentName) {
        const label = agentName || 'Agente não selecionado';
        this.statusBar.setElement('ai-ide-active-agent', {
            alignment: status_bar_1.StatusBarAlignment.LEFT,
            text: `$(person) ${label}`,
            tooltip: 'Selecione e configure agentes de IA.',
            priority: 950,
            command: 'aiConfiguration:open'
        });
    }
    safeGetProviders() {
        try {
            return this.providerRegistry.getAll();
        }
        catch (error) {
            console.warn('[ai-ide] Não foi possível recuperar provedores cadastrados', error);
            return [];
        }
    }
    dispose() {
        this.toDispose.dispose();
    }
};
exports.AiIdeStatusBarContribution = AiIdeStatusBarContribution;
exports.AiIdeStatusBarContribution = AiIdeStatusBarContribution = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(status_bar_1.StatusBar)),
    __param(1, (0, inversify_1.inject)(llm_provider_registry_1.LlmProviderRegistry)),
    __param(2, (0, inversify_1.inject)(ai_configuration_service_1.AIConfigurationSelectionService)),
    __metadata("design:paramtypes", [Object, llm_provider_registry_1.LlmProviderRegistry,
        ai_configuration_service_1.AIConfigurationSelectionService])
], AiIdeStatusBarContribution);
