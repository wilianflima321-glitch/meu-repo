import { AIChatInputWidget, type AIChatInputConfiguration } from '../chat-input-widget';
import type { EditableRequestNode } from './chat-view-tree-widget';
import { URI } from '@theia/core';
import type { ChatRequestModel, EditableChatRequestModel, ChatHierarchyBranch } from '@theia/ai-chat';
import type { AIVariableResolutionRequest } from '@theia/ai-core';
export declare const AIChatTreeInputConfiguration: unique symbol;
export interface AIChatTreeInputConfiguration extends AIChatInputConfiguration {
}
export declare const AIChatTreeInputArgs: unique symbol;
export interface AIChatTreeInputArgs {
    node: EditableRequestNode;
    /**
     * The branch of the chat tree for this request node (used by the input widget for state tracking).
     */
    branch?: ChatHierarchyBranch;
    initialValue?: string;
    onQuery: (query: string) => Promise<void>;
    onUnpin?: () => void;
    onCancel?: (requestModel: ChatRequestModel) => void;
    onDeleteChangeSet?: (requestModel: ChatRequestModel) => void;
    onDeleteChangeSetElement?: (requestModel: ChatRequestModel, index: number) => void;
}
export declare const AIChatTreeInputFactory: unique symbol;
export type AIChatTreeInputFactory = (args: AIChatTreeInputArgs) => AIChatTreeInputWidget;
export declare class AIChatTreeInputWidget extends AIChatInputWidget {
    static ID: string;
    protected readonly args: AIChatTreeInputArgs;
    protected readonly configuration: AIChatTreeInputConfiguration | undefined;
    get requestNode(): EditableRequestNode;
    get request(): EditableChatRequestModel;
    protected init(): void;
    protected updateBranch(): void;
    protected getResourceUri(): URI;
    addContext(variable: AIVariableResolutionRequest): void;
    protected getContext(): readonly AIVariableResolutionRequest[];
    protected deleteContextElement(index: number): void;
}
//# sourceMappingURL=chat-view-tree-input-widget.d.ts.map