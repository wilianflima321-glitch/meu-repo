import '../../../src/browser/style/merge-editor.css';
import { interfaces } from '@theia/core/shared/inversify';
import { DisposableCollection, URI } from '@theia/core';
import { EditorManager, EditorWidget } from '@theia/editor/lib/browser';
import { MergeEditor, MergeUris } from './merge-editor';
export declare function bindMergeEditor(bind: interfaces.Bind): void;
export declare class MergeEditorFactory {
    protected readonly container: interfaces.Container;
    protected readonly editorManager: EditorManager;
    constructor(container: interfaces.Container, editorManager?: EditorManager);
    createMergeEditor({ baseUri, side1Uri, side2Uri, resultUri }: MergeUris): Promise<MergeEditor>;
    protected createEditorWidget(uri: URI, disposables: DisposableCollection): Promise<EditorWidget>;
    protected createMergeEditorContainer({ baseEditorWidget, side1EditorWidget, side2EditorWidget, resultEditorWidget, options }: MergeEditorContainerProps): interfaces.Container;
}
export interface MergeEditorContainerProps {
    baseEditorWidget: EditorWidget;
    side1EditorWidget: EditorWidget;
    side2EditorWidget: EditorWidget;
    resultEditorWidget: EditorWidget;
    options?: {
        resetResult?: boolean;
    };
}
//# sourceMappingURL=merge-editor-module.d.ts.map