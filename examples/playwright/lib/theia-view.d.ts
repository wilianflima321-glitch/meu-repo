import { ElementHandle } from '@playwright/test';
import { TheiaApp } from './theia-app';
import { TheiaMenu } from './theia-menu';
import { TheiaPageObject } from './theia-page-object';
export interface TheiaViewData {
    tabSelector: string;
    viewSelector: string;
    viewName?: string;
}
export declare class TheiaView extends TheiaPageObject {
    protected readonly data: TheiaViewData;
    constructor(data: TheiaViewData, app: TheiaApp);
    get tabSelector(): string;
    get viewSelector(): string;
    get name(): string | undefined;
    open(): Promise<TheiaView>;
    focus(): Promise<void>;
    activate(): Promise<void>;
    waitForVisible(): Promise<void>;
    isTabVisible(): Promise<boolean>;
    isDisplayed(): Promise<boolean>;
    isActive(): Promise<boolean>;
    isClosable(): Promise<boolean>;
    close(waitForClosed?: boolean): Promise<void>;
    protected waitUntilClosed(): Promise<void>;
    title(): Promise<string | undefined>;
    isInSidePanel(): Promise<boolean>;
    side(): Promise<'left' | 'right' | 'bottom' | 'main'>;
    openContextMenuOnTab(): Promise<TheiaMenu>;
    protected viewElement(): Promise<ElementHandle<SVGElement | HTMLElement> | null>;
    protected tabElement(): Promise<ElementHandle<SVGElement | HTMLElement> | null>;
}
//# sourceMappingURL=theia-view.d.ts.map