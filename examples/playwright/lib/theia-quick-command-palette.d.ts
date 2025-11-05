import { ElementHandle } from '@playwright/test';
import { TheiaPageObject } from './theia-page-object';
export declare class TheiaQuickCommandPalette extends TheiaPageObject {
    selector: string;
    open(): Promise<void>;
    hide(): Promise<void>;
    isOpen(): Promise<boolean>;
    trigger(...commandName: string[]): Promise<void>;
    protected triggerSingleCommand(commandName: string): Promise<void>;
    type(value: string, confirm?: boolean): Promise<void>;
    protected selectedCommand(): Promise<ElementHandle<SVGElement | HTMLElement> | null>;
    visibleItems(): Promise<ElementHandle<SVGElement | HTMLElement>[]>;
}
//# sourceMappingURL=theia-quick-command-palette.d.ts.map