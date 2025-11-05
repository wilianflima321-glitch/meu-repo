import { ElementHandle } from '@playwright/test';
import { TheiaPageObject } from './theia-page-object';
export declare abstract class TheiaStatusIndicator extends TheiaPageObject {
    protected abstract id: string;
    protected statusBarElementSelector: string;
    protected getSelectorForId(id: string): string;
    waitForVisible(waitForDetached?: boolean): Promise<void>;
    getElementHandle(): Promise<ElementHandle<SVGElement | HTMLElement>>;
    isVisible(): Promise<boolean>;
}
//# sourceMappingURL=theia-status-indicator.d.ts.map