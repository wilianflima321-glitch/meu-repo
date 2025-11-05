import { LabelProviderContribution } from '@theia/core/lib/browser';
export declare class ContextVariableLabelProvider implements LabelProviderContribution {
    canHandle(element: object): number;
    getIcon(element: object): string | undefined;
    getName(element: object): string | undefined;
    getLongName(element: object): string | undefined;
    getDetails(element: object): string | undefined;
}
//# sourceMappingURL=context-variable-label-provider.d.ts.map