import { MaybePromise, ProgressService, URI, Event } from '@theia/core';
import { ChatAgent, ChatService, ChatSession } from '../common';
import { PreferenceService } from '@theia/core/lib/common';
import { AgentService, PromptService, ResolvedPromptFragment } from '@theia/ai-core';
import { ChangeSetFileElementFactory } from './change-set-file-element';
export interface SummaryMetadata {
    label: string;
    uri?: URI;
    sessionId?: string;
}
export interface Summary extends SummaryMetadata {
    summary: string;
    id: string;
}
export declare const TaskContextStorageService: unique symbol;
export interface TaskContextStorageService {
    onDidChange: Event<void>;
    store(summary: Summary): MaybePromise<void>;
    getAll(): Summary[];
    get(identifier: string): Summary | undefined;
    delete(identifier: string): MaybePromise<boolean>;
    open(identifier: string): Promise<void>;
}
export declare class TaskContextService {
    protected pendingSummaries: Map<string, Promise<Summary>>;
    protected readonly chatService: ChatService;
    protected readonly agentService: AgentService;
    protected readonly promptService: PromptService;
    protected readonly storageService: TaskContextStorageService;
    protected readonly progressService: ProgressService;
    protected readonly preferenceService: PreferenceService;
    protected readonly fileChangeFactory: ChangeSetFileElementFactory;
    get onDidChange(): Event<void>;
    getAll(): Array<Summary>;
    getSummary(sessionIdOrFilePath: string): Promise<string>;
    /** Returns an ID that can be used to refer to the summary in the future. */
    summarize(session: ChatSession, promptId?: string, agent?: ChatAgent, override?: boolean): Promise<string>;
    update(session: ChatSession, promptId?: string, agent?: ChatAgent, override?: boolean): Promise<string>;
    protected getLlmSummary(session: ChatSession, prompt: ResolvedPromptFragment | undefined, agent?: ChatAgent): Promise<string>;
    protected getSystemPrompt(session: ChatSession, promptId?: string): Promise<ResolvedPromptFragment | undefined>;
    hasSummary(chatSession: ChatSession): boolean;
    protected getSummaryForSession(chatSession: ChatSession): Summary | undefined;
    getLabel(id: string): string | undefined;
    open(id: string): Promise<void>;
}
//# sourceMappingURL=task-context-service.d.ts.map