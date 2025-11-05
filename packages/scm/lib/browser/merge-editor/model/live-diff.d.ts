import { Disposable, DisposableCollection } from '@theia/core';
import { Observable } from '@theia/core/lib/common/observable';
import { DiffComputer } from '@theia/core/lib/common/diff';
import { MonacoEditorModel } from '@theia/monaco/lib/browser/monaco-editor-model';
import { DetailedLineRangeMapping } from './range-mapping';
export declare class LiveDiff implements Disposable {
    protected readonly originalDocument: MonacoEditorModel;
    protected readonly modifiedDocument: MonacoEditorModel;
    protected readonly diffComputer: DiffComputer;
    protected recomputeCount: number;
    protected readonly stateObservable: Observable.Settable<LiveDiffState, void>;
    protected readonly changesObservable: Observable.Settable<readonly DetailedLineRangeMapping[], void>;
    protected readonly toDispose: DisposableCollection;
    constructor(originalDocument: MonacoEditorModel, modifiedDocument: MonacoEditorModel, diffComputer: DiffComputer);
    dispose(): void;
    get state(): LiveDiffState;
    get changes(): readonly DetailedLineRangeMapping[];
    protected recompute(): void;
}
export declare const enum LiveDiffState {
    Initializing = 0,
    UpToDate = 1,
    Updating = 2,
    Error = 3
}
//# sourceMappingURL=live-diff.d.ts.map