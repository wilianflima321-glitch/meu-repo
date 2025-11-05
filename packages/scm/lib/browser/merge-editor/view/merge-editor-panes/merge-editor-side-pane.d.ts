import { LabelProvider, OpenerService } from '@theia/core/lib/browser';
import { EditorDecoration, Range } from '@theia/editor/lib/browser';
import { MergeRange, MergeSide } from '../../model/merge-range';
import { MergeEditorPane } from './merge-editor-pane';
import { MergeEditorPaneToolbarItem } from './merge-editor-pane-header';
import { LineRange } from '../../model/line-range';
export declare abstract class MergeEditorSidePane extends MergeEditorPane {
    protected readonly labelProvider: LabelProvider;
    protected readonly openerService: OpenerService;
    abstract get mergeSide(): MergeSide;
    constructor();
    getLineRangeForMergeRange(mergeRange: MergeRange): LineRange;
    protected translateBaseRange(range: Range): Range;
    acceptAllChanges(): Promise<void>;
    compareWithBase(): void;
    protected getToolbarItems(): MergeEditorPaneToolbarItem[];
    protected computeEditorDecorations(): EditorDecoration[];
}
export declare class MergeEditorSide1Pane extends MergeEditorSidePane {
    readonly mergeSide = 1;
    constructor();
}
export declare class MergeEditorSide2Pane extends MergeEditorSidePane {
    readonly mergeSide = 2;
    constructor();
}
//# sourceMappingURL=merge-editor-side-pane.d.ts.map