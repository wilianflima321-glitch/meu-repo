import { Disposable, DisposableCollection } from '@theia/core';
import { MonacoEditor } from '@theia/monaco/lib/browser/monaco-editor';
import { MergeEditor } from '../merge-editor';
import { DocumentLineRangeMap } from '../model/range-mapping';
export declare class MergeEditorScrollSync implements Disposable {
    protected readonly mergeEditor: MergeEditor;
    protected readonly toDispose: DisposableCollection;
    protected isSyncing: boolean;
    constructor(mergeEditor: MergeEditor);
    dispose(): void;
    storeScrollState(): unknown;
    restoreScrollState(state: unknown): void;
    update(): void;
    protected handleSide1ScrollTopChanged(scrollTop: number): void;
    protected handleSide2ScrollTopChanged(scrollTop: number): void;
    protected handleResultScrollTopChanged(scrollTop: number): void;
    protected handleBaseScrollTopChanged(scrollTop: number): void;
    protected computeTargetScrollTop(sourceEditor: MonacoEditor, targetEditor: MonacoEditor, lineRangeMap: DocumentLineRangeMap): number;
}
//# sourceMappingURL=merge-editor-scroll-sync.d.ts.map