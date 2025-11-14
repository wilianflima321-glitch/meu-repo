import { nls } from '@theia/core/lib/common/nls';

export type BrandingQuickActionId = 'providers' | 'agents' | 'tools' | 'usage' | 'chat' | 'history';

export interface BrandingQuickActionStrings {
    label: string;
    description: string;
}

export interface BrandingCopy {
    name: string;
    tagline: string;
    logoTitle: string;
    logoAriaLabel: string;
    quickActions: Record<BrandingQuickActionId, BrandingQuickActionStrings>;
}

export const getBrandingCopy = (): BrandingCopy => ({
    name: nls.localize('theia/ai/branding/name', 'Aethel IDE'),
    tagline: nls.localize('theia/ai/branding/tagline', 'Orchestrate providers, agents, and AI tools with confidence'),
    logoTitle: nls.localize('theia/ai/branding/logo/title', 'Aethel logo'),
    logoAriaLabel: nls.localize('theia/ai/branding/logo/ariaLabel', 'Aethel logo'),
    quickActions: {
        providers: {
            label: nls.localize('theia/ai/branding/quickActions/providersLabel', 'Providers'),
            description: nls.localize('theia/ai/branding/quickActions/providersDescription', 'Configure LLM providers and credentials')
        },
        agents: {
            label: nls.localize('theia/ai/branding/quickActions/agentsLabel', 'Agents'),
            description: nls.localize('theia/ai/branding/quickActions/agentsDescription', 'Manage orchestrator agents')
        },
        tools: {
            label: nls.localize('theia/ai/branding/quickActions/toolsLabel', 'Tools'),
            description: nls.localize('theia/ai/branding/quickActions/toolsDescription', 'Enable and review available tools')
        },
        usage: {
            label: nls.localize('theia/ai/branding/quickActions/usageLabel', 'Token Usage'),
            description: nls.localize('theia/ai/branding/quickActions/usageDescription', 'Monitor consumption and billing')
        },
        chat: {
            label: nls.localize('theia/ai/branding/quickActions/chatLabel', 'Chat'),
            description: nls.localize('theia/ai/branding/quickActions/chatDescription', 'Return to the active conversation')
        },
        history: {
            label: nls.localize('theia/ai/branding/quickActions/historyLabel', 'History'),
            description: nls.localize('theia/ai/branding/quickActions/historyDescription', 'Explore executions and audit trails')
        }
    }
});
