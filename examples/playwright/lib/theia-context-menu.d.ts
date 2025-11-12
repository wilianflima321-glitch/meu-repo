import { ElementHandle } from '@playwright/test';
import { TheiaApp } from './theia-app';
import { TheiaMenu } from './theia-menu';
export declare class TheiaContextMenu extends TheiaMenu {
    static openAt(app: TheiaApp, x: number, y: number): Promise<TheiaContextMenu>;
    static open(app: TheiaApp, element: () => Promise<ElementHandle<SVGElement | HTMLElement>>): Promise<TheiaContextMenu>;
    private static returnWhenVisible;
}
//# sourceMappingURL=theia-context-menu.d.ts.map