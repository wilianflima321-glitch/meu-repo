import { MergeRange, MergeRangeAcceptedState, MergeSide } from '../model/merge-range';
import { MergeEditor } from '../merge-editor';
export interface MergeRangeAction {
    readonly text: string;
    readonly tooltip?: string;
    run?(): unknown;
}
export declare class MergeRangeActions {
    protected readonly mergeEditor: MergeEditor;
    protected readonly mergeRange: MergeRange;
    readonly side1ActionsObservable: import("@theia/core/lib/common/observable").Observable<readonly MergeRangeAction[], void>;
    readonly side2ActionsObservable: import("@theia/core/lib/common/observable").Observable<readonly MergeRangeAction[], void>;
    readonly resultActionsObservable: import("@theia/core/lib/common/observable").Observable<readonly MergeRangeAction[], void>;
    protected readonly hasSideActionsObservable: import("@theia/core/lib/common/observable").Observable<boolean, void>;
    get hasSideActions(): boolean;
    protected readonly hasResultActionsObservable: import("@theia/core/lib/common/observable").Observable<boolean, void>;
    get hasResultActions(): boolean;
    constructor(mergeEditor: MergeEditor, mergeRange: MergeRange);
    protected getActionsForSide(side: MergeSide): readonly MergeRangeAction[];
    protected getResultActions(): readonly MergeRangeAction[];
    protected applyMergeRangeAcceptedState(mergeRange: MergeRange, state: MergeRangeAcceptedState): Promise<void>;
}
//# sourceMappingURL=merge-range-actions.d.ts.map