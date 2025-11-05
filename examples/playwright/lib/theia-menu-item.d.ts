import { ElementHandle } from '@playwright/test';
export declare class TheiaMenuItem {
    protected element: ElementHandle<SVGElement | HTMLElement>;
    constructor(element: ElementHandle<SVGElement | HTMLElement>);
    protected labelElementHandle(): Promise<ElementHandle<SVGElement | HTMLElement>>;
    protected shortCutElementHandle(): Promise<ElementHandle<SVGElement | HTMLElement>>;
    protected isHidden(): Promise<boolean>;
    label(): Promise<string | undefined>;
    shortCut(): Promise<string | undefined>;
    hasSubmenu(): Promise<boolean>;
    isEnabled(): Promise<boolean>;
    click(): Promise<void>;
    hover(): Promise<void>;
}
//# sourceMappingURL=theia-menu-item.d.ts.map