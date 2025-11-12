import { CustomChatAgent } from '../common';
export declare const CustomAgentFactory: unique symbol;
export type CustomAgentFactory = (id: string, name: string, description: string, prompt: string, defaultLLM: string) => CustomChatAgent;
//# sourceMappingURL=custom-agent-factory.d.ts.map