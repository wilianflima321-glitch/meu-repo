/// <reference types="react" />
import * as React from '@theia/core/shared/react';
import { ChangeSet, ChangeSetElement } from '@theia/ai-chat';
import { ChangeSetActionRenderer } from '@theia/ai-chat-ui/lib/browser/change-set-actions/change-set-action-service';
import { PreferenceService } from '@theia/core/lib/common/preferences';
import { ScanOSSService, ScanOSSResult } from '@theia/scanoss';
import { ChangeSetFileElement } from '@theia/ai-chat/lib/browser/change-set-file-element';
import { IDocumentDiffProvider } from '@theia/monaco-editor-core/esm/vs/editor/common/diff/documentDiffProvider';
import { MonacoTextModelService } from '@theia/monaco/lib/browser/monaco-text-model-service';
import { Emitter, MessageService } from '@theia/core';
import { ChangeSetScanDecorator } from './change-set-scan-decorator';
import { AIActivationService } from '@theia/ai-core/lib/browser';
export declare class ChangeSetScanActionRenderer implements ChangeSetActionRenderer {
    readonly id = "change-set-scanoss";
    readonly priority = 10;
    protected readonly onDidChangeEmitter: Emitter<void>;
    readonly onDidChange: import("@theia/core").Event<void>;
    protected readonly scanService: ScanOSSService;
    protected readonly preferenceService: PreferenceService;
    protected readonly textModelService: MonacoTextModelService;
    protected readonly messageService: MessageService;
    protected readonly scanChangeSetDecorator: ChangeSetScanDecorator;
    protected readonly activationService: AIActivationService;
    protected differ: IDocumentDiffProvider;
    init(): void;
    canRender(): boolean;
    render(changeSet: ChangeSet): React.ReactNode;
    protected getPreferenceValues(): string;
    protected _scan: (changeSetElements: ChangeSetElement[]) => Promise<ScanOSSResult[]>;
    protected runScan(changeSetElements: ChangeSetFileElement[], cache: Map<string, ScanOSSResult>, userTriggered: boolean): Promise<ScanOSSResult[]>;
    protected getScanContent(fileChange: ChangeSetFileElement): Promise<string>;
}
//# sourceMappingURL=change-set-scan-action.d.ts.map