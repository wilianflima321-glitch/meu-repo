/// <reference types="react" />
import { CodeChatResponseContent } from '@theia/ai-chat';
import { CodePartRendererAction } from '@theia/ai-chat-ui/lib/browser/chat-response-renderer';
import { ScanOSSResultMatch, ScanOSSService } from '@theia/scanoss';
import { ReactNode } from '@theia/core/shared/react';
import { ResponseNode } from '@theia/ai-chat-ui/lib/browser/chat-tree-view';
import * as React from '@theia/core/shared/react';
import { ReactDialog } from '@theia/core/lib/browser/dialogs/react-dialog';
import { PreferenceService } from '@theia/core';
export declare class ScanOSSScanButtonAction implements CodePartRendererAction {
    protected readonly scanService: ScanOSSService;
    protected readonly preferenceService: PreferenceService;
    priority: number;
    canRender(response: CodeChatResponseContent, parentNode: ResponseNode): boolean;
    render(response: CodeChatResponseContent, parentNode: ResponseNode): ReactNode;
}
export declare class ScanOSSDialog extends ReactDialog<void> {
    protected results: ScanOSSResultMatch[];
    protected readonly okButton: HTMLButtonElement;
    constructor(results: ScanOSSResultMatch[]);
    protected render(): React.ReactNode;
    protected renderHeader(): React.ReactNode;
    protected renderSummary(): React.ReactNode;
    protected renderContent(): React.ReactNode;
    get value(): undefined;
}
//# sourceMappingURL=ai-scanoss-code-scan-action.d.ts.map