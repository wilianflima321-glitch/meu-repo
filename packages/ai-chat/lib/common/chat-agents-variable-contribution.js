"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatAgentsVariableContribution = exports.CHAT_AGENTS_VARIABLE = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const chat_agent_service_1 = require("./chat-agent-service");
exports.CHAT_AGENTS_VARIABLE = {
    id: 'chatAgents',
    name: 'chatAgents',
    description: 'Returns the list of chat agents available in the system'
};
let ChatAgentsVariableContribution = class ChatAgentsVariableContribution {
    registerVariables(service) {
        service.registerResolver(exports.CHAT_AGENTS_VARIABLE, this);
    }
    canResolve(request, _context) {
        if (request.variable.name === exports.CHAT_AGENTS_VARIABLE.name) {
            return 1;
        }
        return -1;
    }
    async resolve(request, context) {
        if (request.variable.name === exports.CHAT_AGENTS_VARIABLE.name) {
            return this.resolveAgentsVariable(request);
        }
    }
    resolveAgentsVariable(_request) {
        const agents = this.agents.getAgents().map(agent => ({
            id: agent.id,
            name: agent.name,
            description: agent.description
        }));
        const value = agents.map(agent => prettyPrintInMd(agent)).join('\n');
        return { variable: exports.CHAT_AGENTS_VARIABLE, value };
    }
};
exports.ChatAgentsVariableContribution = ChatAgentsVariableContribution;
tslib_1.__decorate([
    (0, inversify_1.inject)(chat_agent_service_1.ChatAgentService),
    tslib_1.__metadata("design:type", Object)
], ChatAgentsVariableContribution.prototype, "agents", void 0);
exports.ChatAgentsVariableContribution = ChatAgentsVariableContribution = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], ChatAgentsVariableContribution);
function prettyPrintInMd(agent) {
    return `- ${agent.id}
  - *ID*: ${agent.id}
  - *Name*: ${agent.name}
  - *Description*: ${agent.description.replace(/\n/g, ' ')}`;
}
//# sourceMappingURL=chat-agents-variable-contribution.js.map