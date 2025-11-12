import { TextEditorDocument } from '@theia/editor/lib/browser/editor';
import { DetailedLineRangeMapping } from './range-mapping';
import { LineRange } from './line-range';
import { LineRangeEdit, RangeEdit } from './range-editing';
/**
 * Describes modifications in side 1 and side 2 for a specific range in base.
 */
export declare class MergeRange {
    readonly baseRange: LineRange;
    readonly baseDocument: TextEditorDocument;
    readonly side1Range: LineRange;
    readonly side1Changes: readonly DetailedLineRangeMapping[];
    readonly side1Document: TextEditorDocument;
    readonly side2Range: LineRange;
    readonly side2Changes: readonly DetailedLineRangeMapping[];
    readonly side2Document: TextEditorDocument;
    static computeMergeRanges(side1Diff: readonly DetailedLineRangeMapping[], side2Diff: readonly DetailedLineRangeMapping[], baseDocument: TextEditorDocument, side1Document: TextEditorDocument, side2Document: TextEditorDocument): MergeRange[];
    readonly side1CombinedChange: DetailedLineRangeMapping | undefined;
    readonly side2CombinedChange: DetailedLineRangeMapping | undefined;
    readonly isEqualChange: boolean;
    constructor(baseRange: LineRange, baseDocument: TextEditorDocument, side1Range: LineRange, side1Changes: readonly DetailedLineRangeMapping[], side1Document: TextEditorDocument, side2Range: LineRange, side2Changes: readonly DetailedLineRangeMapping[], side2Document: TextEditorDocument);
    getModifiedRange(side: MergeSide): LineRange;
    getCombinedChange(side: MergeSide): DetailedLineRangeMapping | undefined;
    getChanges(side: MergeSide): readonly DetailedLineRangeMapping[];
    get isConflicting(): boolean;
    canBeSmartCombined(firstSide: MergeSide): boolean;
    get isSmartCombinationOrderRelevant(): boolean;
    getBaseRangeEdit(state: MergeRangeAcceptedState): LineRangeEdit;
    protected smartCombinationEdit1?: {
        value: LineRangeEdit | undefined;
    };
    protected smartCombinationEdit2?: {
        value: LineRangeEdit | undefined;
    };
    protected smartCombineChanges(firstSide: MergeSide): LineRangeEdit | undefined;
    protected editsToLineRangeEdit(range: LineRange, sortedEdits: RangeEdit[], document: TextEditorDocument): LineRangeEdit | undefined;
    protected dumbCombinationEdit1?: LineRangeEdit;
    protected dumbCombinationEdit2?: LineRangeEdit;
    protected dumbCombineChanges(firstSide: MergeSide): LineRangeEdit;
}
export type MergeSide = 1 | 2;
export type MergeRangeAcceptedState = 'Base' | 'Side1' | 'Side2' | 'Side1Side2' | 'Side2Side1' | 'Side1Side2Smart' | 'Side2Side1Smart';
export declare namespace MergeRangeAcceptedState {
    function addSide(state: MergeRangeAcceptedState, side: MergeSide, options?: {
        smartCombination?: boolean;
    }): MergeRangeAcceptedState;
    function removeSide(state: MergeRangeAcceptedState, side: MergeSide): MergeRangeAcceptedState;
}
export type MergeRangeResultState = MergeRangeAcceptedState | 'Unrecognized';
//# sourceMappingURL=merge-range.d.ts.map