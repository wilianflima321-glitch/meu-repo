import { ChatRequestInvocation, ChatResponseContent } from '../common';
/**
 * Response Content created when an Agent delegates a prompt to another agent.
 * Contains agent id, delegated prompt, and the response.
 */
export declare class DelegationResponseContent implements ChatResponseContent {
    agentId: string;
    prompt: string;
    response: ChatRequestInvocation;
    kind: string;
    /**
     * @param agentId The id of the agent to whom the task was delegated
     * @param prompt The prompt that was delegated
     * @param response The response from the delegated agent
     */
    constructor(agentId: string, prompt: string, response: ChatRequestInvocation);
    asString(): string | undefined;
}
export declare function isDelegationResponseContent(value: unknown): value is DelegationResponseContent;
//# sourceMappingURL=delegation-response-content.d.ts.map