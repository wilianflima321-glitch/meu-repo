import { URI } from '@theia/core';
import { LabelProvider, LabelProviderContribution } from '@theia/core/lib/browser';
import { ChangeSetFileService } from './change-set-file-service';
export declare class ContextFileVariableLabelProvider implements LabelProviderContribution {
    protected readonly labelProvider: LabelProvider;
    protected readonly changeSetFileService: ChangeSetFileService;
    canHandle(element: object): number;
    getIcon(element: object): string | undefined;
    getName(element: object): string | undefined;
    getLongName(element: object): string | undefined;
    getDetails(element: object): string | undefined;
    protected getUri(element: object): URI | undefined;
}
//# sourceMappingURL=context-file-variable-label-provider.d.ts.map