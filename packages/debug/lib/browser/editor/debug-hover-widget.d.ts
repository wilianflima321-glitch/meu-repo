import { SourceTreeWidget } from '@theia/core/lib/browser/source-tree';
import { DisposableCollection } from '@theia/core/lib/common/disposable';
import { Message } from '@theia/core/shared/@lumino/messaging';
import { Container, interfaces } from '@theia/core/shared/inversify';
import * as monaco from '@theia/monaco-editor-core';
import { DebugSessionManager } from '../debug-session-manager';
import { DebugEditor } from './debug-editor';
import { DebugExpressionProvider } from './debug-expression-provider';
import { DebugHoverSource } from './debug-hover-source';
export interface ShowDebugHoverOptions {
    selection: monaco.Range;
    /** default: false */
    focus?: boolean;
    /** default: true */
    immediate?: boolean;
}
export interface HideDebugHoverOptions {
    /** default: true */
    immediate?: boolean;
}
export declare function createDebugHoverWidgetContainer(parent: interfaces.Container, editor: DebugEditor): Container;
export declare class DebugHoverWidget extends SourceTreeWidget implements monaco.editor.IContentWidget {
    protected readonly editor: DebugEditor;
    protected readonly sessions: DebugSessionManager;
    protected readonly hoverSource: DebugHoverSource;
    protected readonly expressionProvider: DebugExpressionProvider;
    allowEditorOverflow: boolean;
    protected suppressEditorHoverToDispose: DisposableCollection;
    static ID: string;
    getId(): string;
    protected readonly domNode: HTMLDivElement;
    protected readonly titleNode: HTMLDivElement;
    protected readonly contentNode: HTMLDivElement;
    getDomNode(): HTMLElement;
    protected init(): void;
    dispose(): void;
    show(options?: ShowDebugHoverOptions): void;
    hide(options?: HideDebugHoverOptions): void;
    protected readonly doSchedule: import("lodash").DebouncedFunc<(fn: () => void) => void>;
    protected schedule(fn: () => void, immediate?: boolean): void;
    protected options: ShowDebugHoverOptions | undefined;
    protected doHide(): void;
    protected doShow(options?: ShowDebugHoverOptions | undefined): Promise<void>;
    /**
     * Suppress the default editor-contribution hover from Code.
     * Otherwise, both `textdocument/hover` and the debug hovers are visible
     * at the same time when hovering over a symbol.
     * This will priorize the debug hover over the editor hover.
     */
    protected suppressEditorHover(): void;
    protected isEditorFrame(): boolean;
    getPosition(): monaco.editor.IContentWidgetPosition;
    protected onUpdateRequest(msg: Message): void;
    protected onAfterAttach(msg: Message): void;
}
//# sourceMappingURL=debug-hover-widget.d.ts.map