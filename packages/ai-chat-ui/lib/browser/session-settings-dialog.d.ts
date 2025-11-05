import { InMemoryResources, URI } from '@theia/core';
import { AbstractDialog } from '@theia/core/lib/browser/dialogs';
import { Message } from '@theia/core/lib/browser';
import { MonacoEditor } from '@theia/monaco/lib/browser/monaco-editor';
import { MonacoEditorProvider } from '@theia/monaco/lib/browser/monaco-editor-provider';
export interface SessionSettingsDialogProps {
    initialSettings: {
        [key: string]: unknown;
    } | undefined;
}
export declare class SessionSettingsDialog extends AbstractDialog<{
    [key: string]: unknown;
}> {
    protected readonly editorProvider: MonacoEditorProvider;
    protected readonly resources: InMemoryResources;
    protected readonly uri: URI;
    protected readonly options: SessionSettingsDialogProps;
    protected jsonEditor: MonacoEditor | undefined;
    protected dialogContent: HTMLDivElement;
    protected errorMessageDiv: HTMLDivElement;
    protected settings: {
        [key: string]: unknown;
    };
    protected initialSettingsString: string;
    constructor(editorProvider: MonacoEditorProvider, resources: InMemoryResources, uri: URI, options: SessionSettingsDialogProps);
    protected onAfterAttach(msg: Message): void;
    protected onActivateRequest(msg: Message): void;
    protected createJsonEditor(): Promise<void>;
    protected validateJson(): void;
    protected setErrorButtonState(isError: boolean): void;
    get value(): {
        [key: string]: unknown;
    };
}
//# sourceMappingURL=session-settings-dialog.d.ts.map