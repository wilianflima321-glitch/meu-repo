import { ElementHandle, Locator } from '@playwright/test';
import { TheiaApp } from './theia-app';
import { TheiaToolbar } from './theia-toolbar';
export declare class TheiaNotebookToolbar extends TheiaToolbar {
    readonly locator: Locator;
    constructor(parentLocator: Locator, app: TheiaApp);
    protected toolBarItemSelector(toolbarItemId?: string): string;
    protected toolbarElementHandle(): Promise<ElementHandle<SVGElement | HTMLElement> | null>;
    waitForVisible(): Promise<void>;
    waitUntilHidden(): Promise<void>;
    waitUntilShown(): Promise<void>;
}
//# sourceMappingURL=theia-notebook-toolbar.d.ts.map