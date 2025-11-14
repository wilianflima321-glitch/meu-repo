import { injectable, inject } from '@theia/core/shared/inversify';
import { FrontendApplicationContribution } from '@theia/core/lib/browser/frontend-application-contribution';
import { StatusBar, StatusBarAlignment } from '@theia/core/lib/browser/status-bar/status-bar';
import { DisposableCollection } from '@theia/core/lib/common/disposable';
import { AIConfigurationSelectionService } from '../ai-configuration/ai-configuration-service';
import { LlmProviderRegistry } from '../llm-provider-registry';
import type { Agent } from '@theia/ai-core/lib/common';
import type { LlmProviderConfig } from '../../common/ai-llm-preferences';

@injectable()
export class AiIdeStatusBarContribution implements FrontendApplicationContribution {
    protected readonly toDispose = new DisposableCollection();
    protected currentDefaultProviderId: string | undefined;
    protected currentProviders: LlmProviderConfig[] = [];

    constructor(
        @inject(StatusBar) private readonly statusBar: StatusBar,
        @inject(LlmProviderRegistry) private readonly providerRegistry: LlmProviderRegistry,
        @inject(AIConfigurationSelectionService) private readonly selectionService: AIConfigurationSelectionService,
    ) {}

    onStart(): void {
        this.renderProviderSummary();
        this.renderActiveAgent();

        this.toDispose.push(this.providerRegistry.onDidChangeProviders(providers => {
            this.renderProviderSummary(providers, this.currentDefaultProviderId);
        }));
        this.toDispose.push(this.providerRegistry.onDidChangeDefaultProvider(id => {
            this.currentDefaultProviderId = id;
            this.renderProviderSummary(this.currentProviders, id);
        }));

        const agentEvent = this.selectionService.onDidAgentChange as unknown;
        if (typeof agentEvent === 'function') {
            this.toDispose.push(agentEvent((agent: Agent | undefined) => {
                this.renderActiveAgent(agent?.name ?? agent?.id ?? undefined);
            }));
        }
    }

    protected renderProviderSummary(providersArg?: LlmProviderConfig[], defaultProviderId?: string): void {
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
            alignment: StatusBarAlignment.LEFT,
            text: `$(cloud) ${summary}`,
            tooltip,
            priority: 1000,
            command: 'aiConfiguration:open'
        });
    }

    protected renderActiveAgent(agentName?: string): void {
        const label = agentName || 'Agente não selecionado';
        this.statusBar.setElement('ai-ide-active-agent', {
            alignment: StatusBarAlignment.LEFT,
            text: `$(person) ${label}`,
            tooltip: 'Selecione e configure agentes de IA.',
            priority: 950,
            command: 'aiConfiguration:open'
        });
    }

    protected safeGetProviders(): LlmProviderConfig[] {
        try {
            return this.providerRegistry.getAll();
        } catch (error) {
            console.warn('[ai-ide] Não foi possível recuperar provedores cadastrados', error);
            return [];
        }
    }

    dispose(): void {
        this.toDispose.dispose();
    }
}
