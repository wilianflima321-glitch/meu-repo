import { EditorDecoration, Range } from '@theia/editor/lib/browser';
import { MergeEditorPane } from './merge-editor-pane';
import { MergeRange } from '../../model/merge-range';
import { LineRange } from '../../model/line-range';
export declare class MergeEditorBasePane extends MergeEditorPane {
    constructor();
    getLineRangeForMergeRange(mergeRange: MergeRange): LineRange;
    protected translateBaseRange(range: Range): Range;
    protected onAfterMergeEditorSet(): void;
    protected computeEditorDecorations(): EditorDecoration[];
}
//# sourceMappingURL=merge-editor-base-pane.d.ts.map