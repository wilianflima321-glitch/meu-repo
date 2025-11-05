import { Disposable, DisposableCollection } from '@theia/core';
import { Observable } from '@theia/core/lib/common/observable';
import { DiffComputer } from '@theia/core/lib/common/diff';
import { Range } from '@theia/core/shared/vscode-languageserver-protocol';
import { MonacoEditor } from '@theia/monaco/lib/browser/monaco-editor';
import { MonacoEditorModel } from '@theia/monaco/lib/browser/monaco-editor-model';
import { MergeRange, MergeRangeAcceptedState, MergeRangeResultState, MergeSide } from './merge-range';
import { DetailedLineRangeMapping, DocumentLineRangeMap, DocumentRangeMap, LineRangeMapping, RangeMapping } from './range-mapping';
import { LiveDiff } from './live-diff';
import { LineRange } from './line-range';
export declare const MergeEditorModelProps: unique symbol;
export interface MergeEditorModelProps {
    readonly baseEditor: MonacoEditor;
    readonly side1Editor: MonacoEditor;
    readonly side2Editor: MonacoEditor;
    readonly resultEditor: MonacoEditor;
    readonly options?: {
        readonly resetResult?: boolean;
    };
}
export declare class MergeEditorModel implements Disposable {
    protected readonly props: MergeEditorModelProps;
    protected readonly diffComputer: DiffComputer;
    private readonly m2p;
    protected readonly toDispose: DisposableCollection;
    protected side1LiveDiff: LiveDiff;
    protected side2LiveDiff: LiveDiff;
    protected resultLiveDiff: LiveDiff;
    protected shouldRecomputeHandledState: boolean;
    protected readonly mergeRangesObservable: Observable<MergeRange[], void>;
    get mergeRanges(): readonly MergeRange[];
    protected readonly mergeRangesDataObservable: Observable<Map<MergeRange, MergeRangeData>, void>;
    protected readonly side1ToResultLineRangeMapObservable: Observable<DocumentLineRangeMap, void>;
    get side1ToResultLineRangeMap(): DocumentLineRangeMap;
    protected readonly resultToSide1LineRangeMapObservable: Observable<DocumentLineRangeMap, void>;
    get resultToSide1LineRangeMap(): DocumentLineRangeMap;
    protected readonly side2ToResultLineRangeMapObservable: Observable<DocumentLineRangeMap, void>;
    get side2ToResultLineRangeMap(): DocumentLineRangeMap;
    protected readonly resultToSide2LineRangeMapObservable: Observable<DocumentLineRangeMap, void>;
    get resultToSide2LineRangeMap(): DocumentLineRangeMap;
    protected readonly baseToSide1LineRangeMapObservable: Observable<DocumentLineRangeMap, void>;
    get baseToSide1LineRangeMap(): DocumentLineRangeMap;
    protected readonly side1ToBaseLineRangeMapObservable: Observable<DocumentLineRangeMap, void>;
    get side1ToBaseLineRangeMap(): DocumentLineRangeMap;
    protected readonly baseToSide2LineRangeMapObservable: Observable<DocumentLineRangeMap, void>;
    get baseToSide2LineRangeMap(): DocumentLineRangeMap;
    protected readonly side2ToBaseLineRangeMapObservable: Observable<DocumentLineRangeMap, void>;
    get side2ToBaseLineRangeMap(): DocumentLineRangeMap;
    protected readonly baseToResultLineRangeMapObservable: Observable<DocumentLineRangeMap, void>;
    get baseToResultLineRangeMap(): DocumentLineRangeMap;
    protected readonly resultToBaseLineRangeMapObservable: Observable<DocumentLineRangeMap, void>;
    get resultToBaseLineRangeMap(): DocumentLineRangeMap;
    protected readonly baseToSide1RangeMapObservable: Observable<DocumentRangeMap, void>;
    get baseToSide1RangeMap(): DocumentRangeMap;
    protected readonly side1ToBaseRangeMapObservable: Observable<DocumentRangeMap, void>;
    get side1ToBaseRangeMap(): DocumentRangeMap;
    protected readonly baseToSide2RangeMapObservable: Observable<DocumentRangeMap, void>;
    get baseToSide2RangeMap(): DocumentRangeMap;
    protected readonly side2ToBaseRangeMapObservable: Observable<DocumentRangeMap, void>;
    get side2ToBaseRangeMap(): DocumentRangeMap;
    protected readonly baseToResultRangeMapObservable: Observable<DocumentRangeMap, void>;
    get baseToResultRangeMap(): DocumentRangeMap;
    protected readonly resultToBaseRangeMapObservable: Observable<DocumentRangeMap, void>;
    get resultToBaseRangeMap(): DocumentRangeMap;
    protected readonly diffComputingStateObservable: Observable<DiffComputingState, void>;
    protected readonly diffComputingStateForSidesObservable: Observable<DiffComputingState, void>;
    readonly isUpToDateObservable: Observable<boolean, void>;
    protected readonly unhandledMergeRangesCountObservable: Observable<number, void>;
    get unhandledMergeRangesCount(): number;
    protected _onInitialized: Promise<void>;
    get onInitialized(): Promise<void>;
    get baseDocument(): MonacoEditorModel;
    get side1Document(): MonacoEditorModel;
    get side2Document(): MonacoEditorModel;
    get resultDocument(): MonacoEditorModel;
    protected get resultEditor(): MonacoEditor;
    get side1Changes(): readonly DetailedLineRangeMapping[];
    get side2Changes(): readonly DetailedLineRangeMapping[];
    get resultChanges(): readonly DetailedLineRangeMapping[];
    protected init(): void;
    protected computeMergeRangeStateFromResult(mergeRange: MergeRange): MergeRangeResultState;
    protected doInit(): Promise<void>;
    dispose(): void;
    isDisposed(): boolean;
    reset(): Promise<void>;
    protected computeAutoMergedResult(): string;
    protected computeMergeRanges(): MergeRange[];
    hasMergeRange(mergeRange: MergeRange): boolean;
    protected getMergeRangeData(mergeRange: MergeRange): MergeRangeData;
    getMergeRangeResultState(mergeRange: MergeRange): MergeRangeResultState;
    applyMergeRangeAcceptedState(mergeRange: MergeRange, state: MergeRangeAcceptedState): void;
    isMergeRangeHandled(mergeRange: MergeRange): boolean;
    getLineRangeInResult(mergeRange: MergeRange): LineRange;
    protected getResultLineRangeMapping(mergeRange: MergeRange): LineRangeMapping;
    translateBaseRangeToSide(range: Range, side: MergeSide): Range;
    translateSideRangeToBase(range: Range, side: MergeSide): Range;
    translateBaseRangeToResult(range: Range): Range;
    translateResultRangeToBase(range: Range): Range;
    findMergeRanges(baseRange: LineRange): MergeRange[];
    protected computeSideToResultDiff(sideChanges: readonly LineRangeMapping[], resultChanges: readonly LineRangeMapping[]): readonly LineRangeMapping[];
    protected newMergeRangeData(): MergeRangeData;
    protected newLiveDiff(originalDocument: MonacoEditorModel, modifiedDocument: MonacoEditorModel): LiveDiff;
    protected newDocumentLineRangeMap(lineRangeMappings: readonly LineRangeMapping[]): DocumentLineRangeMap;
    protected newDocumentRangeMap(rangeMappings: readonly RangeMapping[]): DocumentRangeMap;
    protected getDiffComputingState(...liveDiffs: LiveDiff[]): DiffComputingState;
}
export declare const enum DiffComputingState {
    Initializing = 0,
    UpToDate = 1,
    Updating = 2
}
export declare class MergeRangeData {
    readonly resultStateObservable: Observable.Settable<MergeRangeResultState, void>;
    readonly isHandledObservable: Observable.Settable<boolean, void>;
}
//# sourceMappingURL=merge-editor-model.d.ts.map