import { DisposableCollection } from '@theia/core';
import { Observable } from '@theia/core/lib/common/observable';
import { BoxPanel, Message } from '@theia/core/lib/browser';
import { EditorDecoration, EditorWidget, Position, Range } from '@theia/editor/lib/browser';
import { MonacoEditor } from '@theia/monaco/lib/browser/monaco-editor';
import { MergeEditorPaneHeader, MergeEditorPaneToolbarItem } from './merge-editor-pane-header';
import { MergeEditor } from '../../merge-editor';
import { MergeRange } from '../../model/merge-range';
import { DetailedLineRangeMapping } from '../../model/range-mapping';
import { LineRange } from '../../model/line-range';
export declare abstract class MergeEditorPane extends BoxPanel {
    readonly header: MergeEditorPaneHeader;
    readonly editorWidget: EditorWidget;
    private readonly m2p;
    get editor(): MonacoEditor;
    protected _mergeEditor: MergeEditor;
    protected cursorPositionObservable: Observable<Position>;
    protected cursorLineObservable: Observable<number>;
    protected selectionObservable: Observable<Range[] | undefined>;
    protected readonly toDispose: DisposableCollection;
    constructor();
    protected init(): void;
    dispose(): void;
    get mergeEditor(): MergeEditor;
    set mergeEditor(mergeEditor: MergeEditor);
    protected onAfterMergeEditorSet(): void;
    get cursorPosition(): Position;
    get cursorLine(): number;
    get selection(): Range[] | undefined;
    goToMergeRange(mergeRange: MergeRange, options?: {
        reveal?: boolean;
    }): void;
    abstract getLineRangeForMergeRange(mergeRange: MergeRange): LineRange;
    protected abstract translateBaseRange(range: Range): Range;
    protected getToolbarItems(): MergeEditorPaneToolbarItem[];
    protected computeEditorDecorations(): EditorDecoration[];
    protected toMergeRangeDecoration(lineRange: LineRange, { isHandled, isFocused, isAfterEnd }: {
        isHandled: boolean;
        isFocused: boolean;
        isAfterEnd: boolean;
    }): EditorDecoration;
    protected toChangeDecorations(changes: readonly DetailedLineRangeMapping[], { diffSide }: {
        diffSide: 'original' | 'modified';
    }): EditorDecoration[];
    protected initContextKeys(): void;
    protected initSelectionSynchronizer(): void;
    protected onActivateRequest(msg: Message): void;
}
//# sourceMappingURL=merge-editor-pane.d.ts.map