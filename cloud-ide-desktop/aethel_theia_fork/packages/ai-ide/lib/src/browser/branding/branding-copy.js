"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBrandingCopy = void 0;
const nls_1 = require("@theia/core/lib/common/nls");
const getBrandingCopy = () => ({
    name: nls_1.nls.localize('theia/ai/branding/name', 'Aethel IDE'),
    tagline: nls_1.nls.localize('theia/ai/branding/tagline', 'Orchestrate providers, agents, and AI tools with confidence'),
    logoTitle: nls_1.nls.localize('theia/ai/branding/logo/title', 'Aethel logo'),
    logoAriaLabel: nls_1.nls.localize('theia/ai/branding/logo/ariaLabel', 'Aethel logo'),
    quickActions: {
        providers: {
            label: nls_1.nls.localize('theia/ai/branding/quickActions/providersLabel', 'Providers'),
            description: nls_1.nls.localize('theia/ai/branding/quickActions/providersDescription', 'Configure LLM providers and credentials')
        },
        agents: {
            label: nls_1.nls.localize('theia/ai/branding/quickActions/agentsLabel', 'Agents'),
            description: nls_1.nls.localize('theia/ai/branding/quickActions/agentsDescription', 'Manage orchestrator agents')
        },
        tools: {
            label: nls_1.nls.localize('theia/ai/branding/quickActions/toolsLabel', 'Tools'),
            description: nls_1.nls.localize('theia/ai/branding/quickActions/toolsDescription', 'Enable and review available tools')
        },
        usage: {
            label: nls_1.nls.localize('theia/ai/branding/quickActions/usageLabel', 'Token Usage'),
            description: nls_1.nls.localize('theia/ai/branding/quickActions/usageDescription', 'Monitor consumption and billing')
        },
        chat: {
            label: nls_1.nls.localize('theia/ai/branding/quickActions/chatLabel', 'Chat'),
            description: nls_1.nls.localize('theia/ai/branding/quickActions/chatDescription', 'Return to the active conversation')
        },
        history: {
            label: nls_1.nls.localize('theia/ai/branding/quickActions/historyLabel', 'History'),
            description: nls_1.nls.localize('theia/ai/branding/quickActions/historyDescription', 'Explore executions and audit trails')
        }
    }
});
exports.getBrandingCopy = getBrandingCopy;
