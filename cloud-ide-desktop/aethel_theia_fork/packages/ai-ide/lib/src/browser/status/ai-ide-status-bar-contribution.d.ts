import { FrontendApplicationContribution } from '@theia/core/lib/browser/frontend-application-contribution';
import { StatusBar } from '@theia/core/lib/browser/status-bar/status-bar';
import { DisposableCollection } from '@theia/core/lib/common/disposable';
import { AIConfigurationSelectionService } from '../ai-configuration/ai-configuration-service';
import { LlmProviderRegistry } from '../llm-provider-registry';
import type { LlmProviderConfig } from '../../common/ai-llm-preferences';
export declare class AiIdeStatusBarContribution implements FrontendApplicationContribution {
    private readonly statusBar;
    private readonly providerRegistry;
    private readonly selectionService;
    protected readonly toDispose: DisposableCollection;
    protected currentDefaultProviderId: string | undefined;
    protected currentProviders: LlmProviderConfig[];
    constructor(statusBar: StatusBar, providerRegistry: LlmProviderRegistry, selectionService: AIConfigurationSelectionService);
    onStart(): void;
    protected renderProviderSummary(providersArg?: LlmProviderConfig[], defaultProviderId?: string): void;
    protected renderActiveAgent(agentName?: string): void;
    protected safeGetProviders(): LlmProviderConfig[];
    dispose(): void;
}
