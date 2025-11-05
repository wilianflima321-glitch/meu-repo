import { URI, MaybePromise } from '@theia/core';
import { OpenHandler, OpenerOptions } from '@theia/core/lib/browser';
import { NotebookEditorWidgetService } from './service/notebook-editor-widget-service';
export declare class NotebookCellOpenHandler implements OpenHandler {
    protected readonly notebookEditorWidgetService: NotebookEditorWidgetService;
    id: string;
    canHandle(uri: URI, options?: OpenerOptions | undefined): MaybePromise<number>;
    open(uri: URI, options?: OpenerOptions | undefined): undefined;
}
//# sourceMappingURL=notebook-cell-open-handler.d.ts.map