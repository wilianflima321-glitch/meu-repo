import { interfaces } from '@theia/core/shared/inversify';
import { PreferenceLeafNodeRenderer, PreferenceNodeRenderer } from './preference-node-renderer';
import { Preference } from '../../util/preference-types';
import { PreferenceLeafNodeRendererContribution } from './preference-node-renderer-creator';
export declare class PreferenceNullInputRenderer extends PreferenceLeafNodeRenderer<null, HTMLElement> {
    protected createInteractable(container: HTMLElement): void;
    protected getFallbackValue(): null;
    protected doHandleValueChange(): void;
}
export declare class PreferenceNullRendererContribution extends PreferenceLeafNodeRendererContribution {
    static ID: string;
    id: string;
    canHandleLeafNode(node: Preference.LeafNode): number;
    createLeafNodeRenderer(container: interfaces.Container): PreferenceNodeRenderer;
}
//# sourceMappingURL=preference-null-input.d.ts.map