import { Emitter, URI } from '@theia/core';
import { SimpleMonacoEditor } from '@theia/monaco/lib/browser/simple-monaco-editor';
import { NotebookEditorWidgetService } from './notebook-editor-widget-service';
import { ActiveMonacoEditorContribution, MonacoEditorService } from '@theia/monaco/lib/browser/monaco-editor-service';
import { ICodeEditor } from '@theia/monaco-editor-core/esm/vs/editor/browser/editorBrowser';
export declare class NotebookCellEditorService implements ActiveMonacoEditorContribution {
    protected readonly notebookEditorWidgetService: NotebookEditorWidgetService;
    protected readonly monacoEditorService: MonacoEditorService;
    protected onDidChangeCellEditorsEmitter: Emitter<void>;
    readonly onDidChangeCellEditors: import("@theia/core").Event<void>;
    protected onDidChangeFocusedCellEditorEmitter: Emitter<SimpleMonacoEditor | undefined>;
    readonly onDidChangeFocusedCellEditor: import("@theia/core").Event<SimpleMonacoEditor | undefined>;
    protected currentActiveCell?: SimpleMonacoEditor;
    protected currentCellEditors: Map<string, SimpleMonacoEditor>;
    protected init(): void;
    get allCellEditors(): SimpleMonacoEditor[];
    editorCreated(uri: URI, editor: SimpleMonacoEditor): void;
    editorDisposed(uri: URI): void;
    editorFocusChanged(editor?: SimpleMonacoEditor): void;
    getActiveCell(): SimpleMonacoEditor | undefined;
    getActiveEditor(): ICodeEditor | undefined;
}
//# sourceMappingURL=notebook-cell-editor-service.d.ts.map