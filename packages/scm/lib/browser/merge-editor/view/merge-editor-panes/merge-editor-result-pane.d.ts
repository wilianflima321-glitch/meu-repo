import { EditorDecoration, Range } from '@theia/editor/lib/browser';
import { MergeEditorPane } from './merge-editor-pane';
import { MergeEditorPaneToolbarItem } from './merge-editor-pane-header';
import { LineRange } from '../../model/line-range';
import { MergeRange } from '../../model/merge-range';
export declare class MergeEditorResultPane extends MergeEditorPane {
    constructor();
    protected initContextKeys(): void;
    getLineRangeForMergeRange(mergeRange: MergeRange): LineRange;
    protected translateBaseRange(range: Range): Range;
    protected goToNextUnhandledMergeRange(): void;
    reset(): void;
    protected getToolbarItems(): MergeEditorPaneToolbarItem[];
    protected computeEditorDecorations(): EditorDecoration[];
}
//# sourceMappingURL=merge-editor-result-pane.d.ts.map