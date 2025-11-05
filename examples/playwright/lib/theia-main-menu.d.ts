import { ElementHandle } from '@playwright/test';
import { TheiaMenu } from './theia-menu';
import { TheiaPageObject } from './theia-page-object';
export declare class TheiaMainMenu extends TheiaMenu {
    selector: string;
}
export declare class TheiaMenuBar extends TheiaPageObject {
    openMenu(menuName: string): Promise<TheiaMainMenu>;
    visibleMenuBarItems(): Promise<string[]>;
    protected menuBarItem(label?: string): Promise<ElementHandle<SVGElement | HTMLElement> | null>;
    protected menuBarItemSelector(label?: string): string;
}
//# sourceMappingURL=theia-main-menu.d.ts.map