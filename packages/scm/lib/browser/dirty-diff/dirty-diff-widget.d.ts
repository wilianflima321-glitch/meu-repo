import { Disposable, Event, MenuModelRegistry, MenuPath, URI } from '@theia/core';
import { ContextKeyService } from '@theia/core/lib/browser/context-key-service';
import { MonacoEditor } from '@theia/monaco/lib/browser/monaco-editor';
import { MonacoDiffEditor } from '@theia/monaco/lib/browser/monaco-diff-editor';
import { MonacoEditorProvider } from '@theia/monaco/lib/browser/monaco-editor-provider';
import { Change } from './diff-computer';
export declare const SCM_CHANGE_TITLE_MENU: MenuPath;
/** Reserved for plugin contributions, corresponds to contribution point 'scm/change/title'. */
export declare const PLUGIN_SCM_CHANGE_TITLE_MENU: MenuPath;
export declare const DirtyDiffWidgetProps: unique symbol;
export interface DirtyDiffWidgetProps {
    readonly editor: MonacoEditor;
    readonly previousRevisionUri: URI;
}
export declare const DirtyDiffWidgetFactory: unique symbol;
export type DirtyDiffWidgetFactory = (props: DirtyDiffWidgetProps) => DirtyDiffWidget;
export declare class DirtyDiffWidget implements Disposable {
    protected readonly props: DirtyDiffWidgetProps;
    readonly editorProvider: MonacoEditorProvider;
    readonly contextKeyService: ContextKeyService;
    readonly menuModelRegistry: MenuModelRegistry;
    private readonly onDidCloseEmitter;
    readonly onDidClose: Event<unknown>;
    protected index: number;
    private peekView;
    private diffEditorPromise;
    protected _changes?: readonly Change[];
    constructor(props: DirtyDiffWidgetProps, editorProvider: MonacoEditorProvider, contextKeyService: ContextKeyService, menuModelRegistry: MenuModelRegistry);
    create(): void;
    get changes(): readonly Change[];
    set changes(changes: readonly Change[]);
    get editor(): MonacoEditor;
    get uri(): URI;
    get previousRevisionUri(): URI;
    get currentChange(): Change | undefined;
    get currentChangeIndex(): number;
    protected handleChangedChanges(updated: readonly Change[]): void;
    showChange(index: number): Promise<void>;
    showNextChange(): void;
    showPreviousChange(): void;
    getContentWithSelectedChanges(predicate: (change: Change, index: number, changes: readonly Change[]) => boolean): Promise<string>;
    dispose(): void;
    protected showCurrentChange(): void;
    protected updateHeading(): void;
    protected computePrimaryHeading(): string;
    protected computeSecondaryHeading(): string;
    protected computeHeightInLines(): number;
    protected checkCreated(): Promise<MonacoDiffEditor>;
}
//# sourceMappingURL=dirty-diff-widget.d.ts.map