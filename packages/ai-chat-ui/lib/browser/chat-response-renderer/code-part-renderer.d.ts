import { ChatResponseContent, CodeChatResponseContent } from '@theia/ai-chat/lib/common';
import { ContributionProvider, UntitledResourceResolver, URI } from '@theia/core';
import { ContextMenuRenderer, TreeNode } from '@theia/core/lib/browser';
import { ClipboardService } from '@theia/core/lib/browser/clipboard-service';
import * as React from '@theia/core/shared/react';
import { ReactNode } from '@theia/core/shared/react';
import { Position } from '@theia/core/shared/vscode-languageserver-protocol';
import { EditorManager } from '@theia/editor/lib/browser';
import { MonacoEditorProvider } from '@theia/monaco/lib/browser/monaco-editor-provider';
import { MonacoLanguages } from '@theia/monaco/lib/browser/monaco-languages';
import { ChatResponsePartRenderer } from '../chat-response-part-renderer';
import { ResponseNode } from '../chat-tree-view/chat-view-tree-widget';
import { IMouseEvent } from '@theia/monaco-editor-core';
export declare const CodePartRendererAction: unique symbol;
/**
 * The CodePartRenderer offers to contribute arbitrary React nodes to the rendered code part.
 * Technically anything can be rendered, however it is intended to be used for actions, like
 * "Copy to Clipboard" or "Insert at Cursor".
 */
export interface CodePartRendererAction {
    render(response: CodeChatResponseContent, parentNode: ResponseNode): ReactNode;
    /**
     * Determines if the action should be rendered for the given response.
     */
    canRender?(response: CodeChatResponseContent, parentNode: ResponseNode): boolean;
    /**
     *  The priority determines the order in which the actions are rendered.
     *  The default priorities are 10 and 20.
     */
    priority: number;
}
export declare class CodePartRenderer implements ChatResponsePartRenderer<CodeChatResponseContent> {
    protected readonly editorManager: EditorManager;
    protected readonly untitledResourceResolver: UntitledResourceResolver;
    protected readonly editorProvider: MonacoEditorProvider;
    protected readonly languageService: MonacoLanguages;
    protected readonly contextMenuRenderer: ContextMenuRenderer;
    protected readonly codePartRendererActions: ContributionProvider<CodePartRendererAction>;
    canHandle(response: ChatResponseContent): number;
    render(response: CodeChatResponseContent, parentNode: ResponseNode): ReactNode;
    protected renderTitle(response: CodeChatResponseContent): ReactNode;
    private getTitle;
    /**
     * Opens a file and moves the cursor to the specified position.
     *
     * @param uri - The URI of the file to open.
     * @param position - The position to move the cursor to, specified as {line, character}.
     */
    openFileAtPosition(uri: URI, position: Position): Promise<void>;
    protected handleContextMenuEvent(node: TreeNode | undefined, event: IMouseEvent, code: string): void;
}
export declare class CopyToClipboardButtonAction implements CodePartRendererAction {
    protected readonly clipboardService: ClipboardService;
    priority: number;
    render(response: CodeChatResponseContent): ReactNode;
}
export declare class InsertCodeAtCursorButtonAction implements CodePartRendererAction {
    protected readonly editorManager: EditorManager;
    priority: number;
    render(response: CodeChatResponseContent): ReactNode;
}
/**
 * Renders the given code within a Monaco Editor
 */
export declare const CodeWrapper: (props: {
    content: string;
    language?: string;
    untitledResourceResolver: UntitledResourceResolver;
    editorProvider: MonacoEditorProvider;
    contextMenuCallback: (e: IMouseEvent) => void;
}) => React.JSX.Element;
//# sourceMappingURL=code-part-renderer.d.ts.map