declare module 'tslib' {
    export function __decorate(...args: any[]): any;
    export function __metadata(...args: any[]): any;
    export function __param(...args: any[]): any;
    export function __awaiter(thisArg: any, _arguments: any, P: any, generator: any): any;
}

declare module '@theia/ai-core' {
    export function getJsonOfText(text: string): Promise<any> | any;
    export function getTextOfResponse(resp: any): Promise<string> | string;
    export type LanguageModel = any;
    export type LanguageModelMessage = any;
    export type LanguageModelRequirement = any;
    export type LanguageModelResponse = any;
}

declare module '@theia/core' {
    export function generateUuid(): string;
    export const nls: { localize(key: string, def?: string): string };
}

declare module '@theia/core/shared/inversify' {
    export function inject(...args: any[]): any;
    export function injectable(...args: any[]): any;
}

declare module '@theia/ai-chat/lib/common/chat-agent-service' {
    export interface ChatAgentDescriptor { id: string; displayName?: string }
    export class ChatAgentService {
        getAgents(): ChatAgentDescriptor[];
        getAgent(id: string): any | undefined;
    }
}

declare module '@theia/ai-chat/lib/common/chat-tool-request-service' {
    export type ChatToolRequest = any;
}

declare module '@theia/ai-chat/lib/common/chat-model' {
    export interface ProgressMessage { id?: string; content?: string; status?: 'inProgress' | 'failed' | 'completed' }

    export interface ChatResponseInner {
        addContent(content: any): void;
        cancellationToken?: any;
    }

    export interface ChatResponse {
        progressMessages: ProgressMessage[];
        response: ChatResponseInner;
        cancellationToken?: any;
        addProgressMessage(msg: ProgressMessage): void;
        updateProgressMessage(msg: ProgressMessage): void;
        overrideAgentId(id: string): void;
    }

    export interface SessionInfo { id: string; settings?: Record<string, any> }

    export interface MutableChatRequestModel {
        prompt?: string;
        inputText?: string;
        id?: string;
        session: SessionInfo;
        response: ChatResponse;
        // data helpers used by orchestrator
        addData(key: string, value: any): void;
        getDataByKey<T = any>(key: string): T | undefined;
        removeData(key: string): void;
        // optional original request
        __originalRequest?: MutableChatRequestModel;
    }

    export class InformationalChatResponseContentImpl {
        constructor(text: string);
    }
}

declare module '@theia/ai-chat/lib/common/chat-agents' {
    import { LanguageModelResponse } from '@theia/ai-core';
    import { MutableChatRequestModel } from '@theia/ai-chat/lib/common/chat-model';

    export class AbstractStreamParsingChatAgent {
        // basic identity fields (may be provided by subclasses)
        description?: string;
        iconClass?: string;
        variables?: string[];
        prompts?: any[];
        protected systemPromptId?: string;

        // dependencies / services available on the agent
        protected logger: { warn(...args: any[]): void; error(...args: any[]): void; info?(...args: any[]): void };
        protected languageModelService: { sendRequest(model: any, opts: any): Promise<LanguageModelResponse> };

        protected getLlmSettings(): any;

        // lifecycle / invocation
        invoke(request: MutableChatRequestModel): Promise<void>;

        // methods intended to be overridden by subclasses
        protected sendRequest?(...args: any[]): Promise<any>;
        // expected override point for subclasses that perform LLM requests
        protected sendLlmRequest?(request: MutableChatRequestModel, messages: any[], toolRequests: any[], languageModel: any): Promise<any>;
        protected async addContentsToResponse?(response: LanguageModelResponse, request: MutableChatRequestModel): Promise<void> {}
    }
}

