import { ElementHandle } from '@playwright/test';
import { TheiaApp } from './theia-app';
import { TheiaPageObject } from './theia-page-object';
export declare class TheiaToolbarItem extends TheiaPageObject {
    protected element: ElementHandle<SVGElement | HTMLElement>;
    constructor(app: TheiaApp, element: ElementHandle<SVGElement | HTMLElement>);
    commandId(): Promise<string | null>;
    isEnabled(): Promise<boolean>;
    trigger(): Promise<void>;
}
//# sourceMappingURL=theia-toolbar-item.d.ts.map