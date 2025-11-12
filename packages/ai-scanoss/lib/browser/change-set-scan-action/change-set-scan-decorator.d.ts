import type { ChangeSetDecoration, ChangeSetElement } from '@theia/ai-chat';
import type { ChangeSetDecorator } from '@theia/ai-chat/lib/browser/change-set-decorator-service';
import { Emitter } from '@theia/core';
import type { ScanOSSResult } from '@theia/scanoss';
export declare class ChangeSetScanDecorator implements ChangeSetDecorator {
    readonly id = "thei-change-set-scanoss-decorator";
    protected readonly emitter: Emitter<void>;
    readonly onDidChangeDecorations: import("@theia/core").Event<void>;
    protected scanResult: ScanOSSResult[];
    setScanResult(results: ScanOSSResult[]): void;
    decorate(element: ChangeSetElement): ChangeSetDecoration | undefined;
}
//# sourceMappingURL=change-set-scan-decorator.d.ts.map