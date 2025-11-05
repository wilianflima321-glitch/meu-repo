import URI from '@theia/core/lib/common/uri';
import { WidgetOpenHandler } from '@theia/core/lib/browser';
import { VSXExtensionEditor } from './vsx-extension-editor';
export declare class VSXExtensionEditorManager extends WidgetOpenHandler<VSXExtensionEditor> {
    readonly id: string;
    canHandle(uri: URI): number;
    protected createWidgetOptions(uri: URI): {
        id: string;
    };
}
//# sourceMappingURL=vsx-extension-editor-manager.d.ts.map