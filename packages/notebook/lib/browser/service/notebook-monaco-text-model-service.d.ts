import { URI, Reference, Event, Emitter } from '@theia/core';
import { MonacoTextModelService, MonacoEditorModelFilter } from '@theia/monaco/lib/browser/monaco-text-model-service';
import { MonacoEditorModel } from '@theia/monaco/lib/browser/monaco-editor-model';
import { NotebookModel } from '../view-model/notebook-model';
export declare class NotebookMonacoEditorModelFilter implements MonacoEditorModelFilter {
    protected readonly onDidCreateCellModelEmitter: Emitter<MonacoEditorModel>;
    get onDidCreateCellModel(): Event<MonacoEditorModel>;
    filter(model: MonacoEditorModel): boolean;
}
/**
 * special service for creating monaco textmodels for notebook cells.
 * Its for optimization purposes since there is alot of overhead otherwise with calling the backend to create a document for each cell and other smaller things.
 */
export declare class NotebookMonacoTextModelService {
    protected readonly monacoTextModelService: MonacoTextModelService;
    protected readonly notebookMonacoEditorModelFilter: NotebookMonacoEditorModelFilter;
    getOrCreateNotebookCellModelReference(uri: URI): Promise<Reference<MonacoEditorModel>>;
    createTextModelsForNotebook(notebook: NotebookModel): Promise<void>;
    get onDidCreateNotebookCellModel(): Event<MonacoEditorModel>;
}
//# sourceMappingURL=notebook-monaco-text-model-service.d.ts.map