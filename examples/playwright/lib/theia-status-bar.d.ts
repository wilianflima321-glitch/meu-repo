import { ElementHandle } from '@playwright/test';
import { TheiaApp } from './theia-app';
import { TheiaPageObject } from './theia-page-object';
import { TheiaStatusIndicator } from './theia-status-indicator';
export declare class TheiaStatusBar extends TheiaPageObject {
    selector: string;
    protected statusBarElementHandle(): Promise<ElementHandle<SVGElement | HTMLElement> | null>;
    statusIndicator<T extends TheiaStatusIndicator>(statusIndicatorFactory: {
        new (app: TheiaApp): T;
    }): Promise<T>;
    waitForVisible(): Promise<void>;
    isVisible(): Promise<boolean>;
}
//# sourceMappingURL=theia-status-bar.d.ts.map