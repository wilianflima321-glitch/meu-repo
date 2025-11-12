import { ElementHandle } from '@playwright/test';
import { TheiaPageObject } from './theia-page-object';
import { TheiaToolbarItem } from './theia-toolbar-item';
export declare class TheiaToolbar extends TheiaPageObject {
    selector: string;
    protected toolbarElementHandle(): Promise<ElementHandle<SVGElement | HTMLElement> | null>;
    waitForVisible(): Promise<void>;
    isShown(): Promise<boolean>;
    show(): Promise<void>;
    hide(): Promise<void>;
    toggle(): Promise<void>;
    waitUntilHidden(): Promise<void>;
    waitUntilShown(): Promise<void>;
    toolbarItems(): Promise<TheiaToolbarItem[]>;
    toolbarItemIds(): Promise<string[]>;
    toolBarItem(commandId: string): Promise<TheiaToolbarItem | undefined>;
    protected toolBarItemSelector(toolbarItemId?: string): string;
    protected toCommandIdArray(items: TheiaToolbarItem[]): Promise<string[]>;
}
//# sourceMappingURL=theia-toolbar.d.ts.map