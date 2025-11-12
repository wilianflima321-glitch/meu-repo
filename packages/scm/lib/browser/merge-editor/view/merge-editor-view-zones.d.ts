import { Disposable } from '@theia/core';
import { Observable } from '@theia/core/lib/common/observable';
import { MonacoEditorViewZone } from '@theia/monaco/lib/browser/monaco-editor-zone-widget';
import { MergeEditor } from '../merge-editor';
import { MergeRange } from '../model/merge-range';
import { MergeRangeAction, MergeRangeActions } from './merge-range-actions';
import { MergeEditorPane } from './merge-editor-panes';
import { DiffSpacerService } from './diff-spacers';
export interface MergeEditorViewZone {
    create(ctx: MergeEditorViewZone.CreationContext): void;
}
export declare namespace MergeEditorViewZone {
    interface CreationContext {
        createViewZone(viewZone: Omit<MonacoEditorViewZone, 'id'>): void;
        register(disposable: Disposable): void;
    }
}
export interface MergeEditorViewZones {
    readonly baseViewZones: readonly MergeEditorViewZone[];
    readonly side1ViewZones: readonly MergeEditorViewZone[];
    readonly side2ViewZones: readonly MergeEditorViewZone[];
    readonly resultViewZones: readonly MergeEditorViewZone[];
}
export declare class MergeEditorViewZoneComputer {
    protected readonly diffSpacerService: DiffSpacerService;
    computeViewZones(mergeEditor: MergeEditor): MergeEditorViewZones;
    protected createSpacerZones(spacers: number[], viewZones: MergeEditorViewZone[]): void;
    protected newMergeRangeActions(mergeEditor: MergeEditor, mergeRange: MergeRange): MergeRangeActions;
    protected getActionZoneMinHeight(pane: MergeEditorPane): number;
    protected newActionZone(pane: MergeEditorPane, actions: Observable<readonly MergeRangeAction[]>, afterLineNumber: number, heightInPx: number): MergeEditorViewZone;
    protected newActionZonePlaceholder(afterLineNumber: number, heightInPx: number): MergeEditorViewZone;
    protected newSpacerZone(afterLineNumber: number, heightInLines: number): MergeEditorViewZone;
}
export declare class MergeEditorActionZone implements MergeEditorViewZone {
    protected readonly pane: MergeEditorPane;
    protected readonly actionsObservable: Observable<readonly MergeRangeAction[]>;
    protected readonly afterLineNumber: number;
    protected readonly heightInPx: number;
    protected static counter: number;
    constructor(pane: MergeEditorPane, actionsObservable: Observable<readonly MergeRangeAction[]>, afterLineNumber: number, heightInPx: number);
    create(ctx: MergeEditorViewZone.CreationContext): void;
    protected renderActions(parent: HTMLElement, actions: readonly MergeRangeAction[]): void;
    protected getActionTitle(action: MergeRangeAction): string;
}
export declare class MergeEditorActionZonePlaceholder implements MergeEditorViewZone {
    protected readonly afterLineNumber: number;
    protected readonly heightInPx: number;
    constructor(afterLineNumber: number, heightInPx: number);
    create(ctx: MergeEditorViewZone.CreationContext): void;
}
export declare class MergeEditorSpacerZone implements MergeEditorViewZone {
    protected readonly afterLineNumber: number;
    protected readonly heightInLines: number;
    constructor(afterLineNumber: number, heightInLines: number);
    create(ctx: MergeEditorViewZone.CreationContext): void;
}
//# sourceMappingURL=merge-editor-view-zones.d.ts.map