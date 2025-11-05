import { CommandService, Emitter, Event, MessageService, PreferenceService, URI } from '@theia/core';
import { ChatRequest, ChatRequestModel, ChatService, ChatSession } from '@theia/ai-chat';
import { BaseWidget, ExtractableWidget, Message, StatefulWidget } from '@theia/core/lib/browser';
import { AIChatInputWidget } from './chat-input-widget';
import { ChatViewTreeWidget } from './chat-tree-view/chat-view-tree-widget';
import { AIActivationService } from '@theia/ai-core/lib/browser/ai-activation-service';
import { AIVariableResolutionRequest } from '@theia/ai-core';
import { ProgressBarFactory } from '@theia/core/lib/browser/progress-bar-factory';
import { FrontendVariableService } from '@theia/ai-core/lib/browser';
export declare namespace ChatViewWidget {
    interface State {
        locked?: boolean;
        temporaryLocked?: boolean;
    }
}
export declare class ChatViewWidget extends BaseWidget implements ExtractableWidget, StatefulWidget {
    readonly treeWidget: ChatViewTreeWidget;
    readonly inputWidget: AIChatInputWidget;
    static ID: string;
    static LABEL: string;
    protected chatService: ChatService;
    protected messageService: MessageService;
    protected readonly preferenceService: PreferenceService;
    protected readonly commandService: CommandService;
    protected readonly activationService: AIActivationService;
    protected readonly variableService: FrontendVariableService;
    protected readonly progressBarFactory: ProgressBarFactory;
    protected chatSession: ChatSession;
    protected _state: ChatViewWidget.State;
    protected readonly onStateChangedEmitter: Emitter<ChatViewWidget.State>;
    isExtractable: boolean;
    secondaryWindow: Window | undefined;
    constructor(treeWidget: ChatViewTreeWidget, inputWidget: AIChatInputWidget);
    protected init(): void;
    protected initListeners(): void;
    protected onActivateRequest(msg: Message): void;
    storeState(): object;
    restoreState(oldState: object & Partial<ChatViewWidget.State>): void;
    protected get state(): ChatViewWidget.State;
    protected set state(state: ChatViewWidget.State);
    get onStateChanged(): Event<ChatViewWidget.State>;
    protected onQuery(query?: string | ChatRequest): Promise<void>;
    protected onUnpin(): void;
    protected onCancel(requestModel: ChatRequestModel): void;
    protected onDeleteChangeSet(sessionId: string): void;
    protected onDeleteChangeSetElement(sessionId: string, uri: URI): void;
    protected onScrollLockChange(temporaryLocked: boolean): void;
    lock(): void;
    unlock(): void;
    setTemporaryLock(locked: boolean): void;
    get isLocked(): boolean;
    addContext(variable: AIVariableResolutionRequest): void;
    setSettings(settings: {
        [key: string]: unknown;
    }): void;
    getSettings(): {
        [key: string]: unknown;
    } | undefined;
}
//# sourceMappingURL=chat-view-widget.d.ts.map