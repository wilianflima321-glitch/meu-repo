/**
 * Minimal shim for @theia/ai-chat
 */

export abstract class AbstractStreamParsingChatAgent {
    id: string;
    name: string;
    description?: string;
    iconClass?: string;
    variables?: string[];
    prompts?: any[];
    languageModelRequirements?: any[];
    
    abstract invoke(request: any): Promise<void>;
}

export interface ChatAgent {
    id: string;
    name: string;
    invoke(request: any): Promise<void>;
}
