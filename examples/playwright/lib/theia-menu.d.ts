import { ElementHandle } from '@playwright/test';
import { TheiaMenuItem } from './theia-menu-item';
import { TheiaPageObject } from './theia-page-object';
export declare class TheiaMenu extends TheiaPageObject {
    selector: string;
    protected menuElementHandle(): Promise<ElementHandle<SVGElement | HTMLElement> | null>;
    waitForVisible(): Promise<void>;
    isOpen(): Promise<boolean>;
    close(): Promise<void>;
    menuItems(): Promise<TheiaMenuItem[]>;
    clickMenuItem(name: string): Promise<void>;
    menuItemByName(name: string): Promise<TheiaMenuItem | undefined>;
    menuItemByNamePath(...names: string[]): Promise<TheiaMenuItem | undefined>;
    protected menuItemSelector(label?: string): string;
    visibleMenuItems(): Promise<string[]>;
}
//# sourceMappingURL=theia-menu.d.ts.map