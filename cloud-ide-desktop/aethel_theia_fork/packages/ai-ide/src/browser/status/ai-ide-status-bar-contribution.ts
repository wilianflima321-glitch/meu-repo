import { injectable, inject } from '@theia/core/shared/inversify';
import { FrontendApplicationContribution } from '@theia/core/lib/browser/frontend-application-contribution';
import { StatusBar, StatusBarAlignment } from '@theia/core/lib/browser/status-bar/status-bar';
import { PreferenceService } from '@theia/core';
import { DisposableCollection } from '@theia/core/lib/common/disposable';
import { AIConfigurationSelectionService } from '../ai-configuration/ai-configuration-service';
import { LlmProviderRegistry } from '../llm-provider-registry';
import { AI_LLM_PROVIDERS_PREF } from '../../common/ai-llm-preferences';
import type { Agent } from '@theia/ai-core/lib/common';

@injectable()
export class AiIdeStatusBarContribution implements FrontendApplicationContribution {
    protected readonly toDispose = new DisposableCollection();

    constructor(
        @inject(StatusBar) private readonly statusBar: StatusBar,
        @inject(LlmProviderRegistry) private readonly providerRegistry: LlmProviderRegistry,
        @inject(AIConfigurationSelectionService) private readonly selectionService: AIConfigurationSelectionService,
        @inject(PreferenceService) private readonly preferenceService: PreferenceService,
    ) {}

    onStart(): void {
        this.renderProviderSummary();
        this.renderActiveAgent();

        this.toDispose.push(this.preferenceService.onPreferenceChanged(change => {
            if (change.preferenceName === AI_LLM_PROVIDERS_PREF) {
                this.renderProviderSummary();
            }
        }));

        const agentEvent = this.selectionService.onDidAgentChange as unknown;
        if (typeof agentEvent === 'function') {
            this.toDispose.push(agentEvent((agent: Agent | undefined) => {
                this.renderActiveAgent(agent?.name ?? agent?.id ?? undefined);
            }));
        }
    }

    protected renderProviderSummary(): void {
        const providers = this.safeGetProviders();
        const defaultProvider = this.providerRegistry.getDefaultProviderId();
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

    protected safeGetProviders(): Array<{ id: string; name?: string }> {
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
