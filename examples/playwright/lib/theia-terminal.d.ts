import { ElementHandle } from '@playwright/test';
import { TheiaApp } from './theia-app';
import { TheiaMenu } from './theia-menu';
import { TheiaView } from './theia-view';
export declare class TheiaTerminal extends TheiaView {
    constructor(tabId: string, app: TheiaApp);
    submit(text: string): Promise<void>;
    write(text: string): Promise<void>;
    contents(): Promise<string>;
    protected openContextMenu(): Promise<TheiaMenu>;
    protected waitForInputArea(): Promise<ElementHandle<SVGElement | HTMLElement>>;
    protected waitForVisibleView(): Promise<ElementHandle<SVGElement | HTMLElement>>;
}
//# sourceMappingURL=theia-terminal.d.ts.map