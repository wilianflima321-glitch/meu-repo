/**
 * Minimal shim for @theia/ai-chat
 */

export interface SystemMessageDescription {
    template?: string;
}

// Some code paths treat this as a runtime helper; provide a value shape.
export const SystemMessageDescription: {
    fromResolvedPromptFragment?: (s: string) => SystemMessageDescription;
};

export abstract class AbstractStreamParsingChatAgent {
    id: string;
    name: string;
    description?: string;
    iconClass?: string;
    variables?: string[];
    prompts?: any[];
    languageModelRequirements?: any[];

    protected defaultLanguageModelPurpose?: string;
    protected systemPromptId?: string;

    // Services (injected in real Theia)
    protected promptService: any;
    protected languageModelService: any;
    protected logger: any;

    protected getLlmSettings(): any;

    agentSpecificVariables?: any[];

    protected getSystemMessageDescription?(context: any): Promise<SystemMessageDescription | undefined>;
    protected sendLlmRequest?(request: any, messages: any[], toolRequests: any[], languageModel: any): Promise<any>;
    protected addContentsToResponse?(response: any, request: any): Promise<void>;

    async invoke(_request: any): Promise<void> {
        // no-op shim
    }
}

export abstract class AbstractTextToModelParsingChatAgent<T> extends AbstractStreamParsingChatAgent {
    protected abstract parseTextResponse(text: string): Promise<T>;
}

export interface ChatAgent {
    id: string;
    name: string;
    invoke(request: any): Promise<void>;
}

export const ChatAgent: unique symbol;

