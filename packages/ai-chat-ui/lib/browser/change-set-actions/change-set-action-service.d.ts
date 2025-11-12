import { ContributionProvider, Event, Emitter } from '@theia/core';
import { ChangeSet } from '@theia/ai-chat';
export declare const ChangeSetActionRenderer: unique symbol;
/**
 * The CodePartRenderer offers to contribute arbitrary React nodes to the rendered code part.
 * Technically anything can be rendered, however it is intended to be used for actions, like
 * "Copy to Clipboard" or "Insert at Cursor".
 */
export interface ChangeSetActionRenderer {
    readonly id: string;
    onDidChange?: Event<void>;
    render(changeSet: ChangeSet): React.ReactNode;
    /**
     * Determines if the action should be rendered for the given response.
     */
    canRender?(changeSet: ChangeSet): boolean;
    /**
     *  Actions are ordered by descending priority. (Highest on left).
     */
    readonly priority?: number;
}
export declare class ChangeSetActionService {
    protected readonly onDidChangeEmitter: Emitter<void>;
    get onDidChange(): Event<void>;
    protected readonly contributions: ContributionProvider<ChangeSetActionRenderer>;
    protected init(): void;
    getActions(): readonly ChangeSetActionRenderer[];
    getActionsForChangeset(changeSet: ChangeSet): ChangeSetActionRenderer[];
}
//# sourceMappingURL=change-set-action-service.d.ts.map