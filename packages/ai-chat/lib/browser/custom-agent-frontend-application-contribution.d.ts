import { PromptFragmentCustomizationService } from '@theia/ai-core';
import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { CustomAgentFactory } from './custom-agent-factory';
export declare class AICustomAgentsFrontendApplicationContribution implements FrontendApplicationContribution {
    protected readonly customAgentFactory: CustomAgentFactory;
    protected readonly customizationService: PromptFragmentCustomizationService;
    private readonly agentService;
    private readonly chatAgentService;
    private knownCustomAgents;
    onStart(): void;
    onStop(): void;
}
//# sourceMappingURL=custom-agent-frontend-application-contribution.d.ts.map