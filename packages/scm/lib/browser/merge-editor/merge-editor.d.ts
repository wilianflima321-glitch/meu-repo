import { Disposable, URI } from '@theia/core';
import { ApplicationShell, BaseWidget, LabelProvider, Message, Navigatable, NavigatableWidgetOpenHandler, Saveable, SaveableSource, SplitPanel, StatefulWidget, StorageService, Widget, WidgetOpenerOptions } from '@theia/core/lib/browser';
import { Observable } from '@theia/core/lib/common/observable';
import { Range } from '@theia/editor/lib/browser';
import { MergeRange } from './model/merge-range';
import { MergeEditorModel } from './model/merge-editor-model';
import { MergeEditorBasePane, MergeEditorPane, MergeEditorResultPane, MergeEditorSide1Pane, MergeEditorSide2Pane } from './view/merge-editor-panes';
import { MergeEditorViewZoneComputer } from './view/merge-editor-view-zones';
import { MergeEditorScrollSync } from './view/merge-editor-scroll-sync';
export interface MergeUris {
    baseUri: URI;
    side1Uri: URI;
    side2Uri: URI;
    resultUri: URI;
}
export declare namespace MergeEditorUri {
    function isMergeEditorUri(uri: URI): boolean;
    function encode({ baseUri, side1Uri, side2Uri, resultUri }: MergeUris): URI;
    function decode(uri: URI): MergeUris;
}
export type MergeEditorLayoutKind = 'mixed' | 'columns';
export interface MergeEditorLayoutMode {
    readonly kind: MergeEditorLayoutKind;
    readonly showBase: boolean;
    readonly showBaseAtTop: boolean;
}
export declare namespace MergeEditorLayoutMode {
    const DEFAULT: MergeEditorLayoutMode;
}
export interface MergeEditorSideWidgetState {
    title?: string;
    description?: string;
    detail?: string;
}
export interface MergeEditorWidgetState {
    layoutMode?: MergeEditorLayoutMode;
    side1State?: MergeEditorSideWidgetState;
    side2State?: MergeEditorSideWidgetState;
}
export declare class MergeEditorSettings {
    protected static LAYOUT_MODE: string;
    protected readonly storageService: StorageService;
    layoutMode: MergeEditorLayoutMode;
    load(): Promise<void>;
    save(): Promise<void>;
}
export declare class MergeEditor extends BaseWidget implements StatefulWidget, SaveableSource, Navigatable, ApplicationShell.TrackableWidgetProvider {
    readonly model: MergeEditorModel;
    readonly basePane: MergeEditorBasePane;
    readonly side1Pane: MergeEditorSide1Pane;
    readonly side2Pane: MergeEditorSide2Pane;
    readonly resultPane: MergeEditorResultPane;
    protected readonly viewZoneComputer: MergeEditorViewZoneComputer;
    protected readonly settings: MergeEditorSettings;
    protected readonly labelProvider: LabelProvider;
    protected readonly visibilityObservable: Observable.Settable<boolean, void>;
    protected readonly currentPaneObservable: Observable.Settable<MergeEditorPane | undefined, void>;
    protected readonly layoutModeObservable: Observable.Settable<MergeEditorLayoutMode, void>;
    protected readonly currentMergeRangeObservable: Observable<MergeRange | undefined, unknown>;
    protected readonly selectionInBaseObservable: Observable<Range[] | undefined, unknown>;
    protected verticalSplitPanel: SplitPanel;
    protected horizontalSplitPanel: SplitPanel;
    protected scrollSync: MergeEditorScrollSync;
    protected init(): void;
    protected createScrollSynchronizer(): MergeEditorScrollSync;
    protected initCurrentPaneTracker(): void;
    protected layoutInitialized: boolean;
    protected ensureLayoutInitialized(): void;
    protected doInitializeLayout(): void;
    protected onLayoutInitialized(): void;
    protected onResize(msg: Widget.ResizeMessage): void;
    get isShown(): boolean;
    get currentPane(): MergeEditorPane | undefined;
    protected createCurrentMergeRangeObservable(): Observable<MergeRange | undefined>;
    get currentMergeRange(): MergeRange | undefined;
    protected createSelectionInBaseObservable(): Observable<Range[] | undefined>;
    get selectionInBase(): Range[] | undefined;
    get panes(): MergeEditorPane[];
    get baseUri(): URI;
    get side1Uri(): URI;
    get side1Title(): string;
    get side2Uri(): URI;
    get side2Title(): string;
    get resultUri(): URI;
    storeState(): MergeEditorWidgetState;
    restoreState(state: MergeEditorWidgetState): void;
    get saveable(): Saveable;
    getResourceUri(): URI | undefined;
    createMoveToUri(resourceUri: URI): URI | undefined;
    getTrackableWidgets(): Widget[];
    goToFirstMergeRange(predicate?: (mergeRange: MergeRange) => boolean): void;
    goToNextMergeRange(predicate?: (mergeRange: MergeRange) => boolean): void;
    goToPreviousMergeRange(predicate?: (mergeRange: MergeRange) => boolean): void;
    get layoutMode(): MergeEditorLayoutMode;
    set layoutMode(value: MergeEditorLayoutMode);
    get layoutKind(): MergeEditorLayoutKind;
    set layoutKind(kind: MergeEditorLayoutKind);
    get isShowingBase(): boolean;
    get isShowingBaseAtTop(): boolean;
    toggleShowBase(): void;
    toggleShowBaseTop(): void;
    toggleShowBaseCenter(): void;
    get shouldAlignResult(): boolean;
    get shouldAlignBase(): boolean;
    protected applyLayoutMode(layoutMode: MergeEditorLayoutMode): void;
    protected createViewZones(): Disposable;
    protected onBeforeHide(msg: Message): void;
    protected onAfterShow(msg: Message): void;
    protected onActivateRequest(msg: Message): void;
}
export interface MergeEditorOpenerOptions extends WidgetOpenerOptions {
    widgetState?: MergeEditorWidgetState;
}
export declare class MergeEditorOpenHandler extends NavigatableWidgetOpenHandler<MergeEditor> {
    static readonly ID = "merge-editor-opener";
    readonly id = "merge-editor-opener";
    readonly label: string;
    canHandle(uri: URI, options?: MergeEditorOpenerOptions): number;
    open(uri: URI, options?: MergeEditorOpenerOptions): Promise<MergeEditor>;
    protected getOrCreateWidget(uri: URI, options?: MergeEditorOpenerOptions): Promise<MergeEditor>;
}
//# sourceMappingURL=merge-editor.d.ts.map