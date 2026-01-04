export interface TooltipConfig {
    title: string;
    description: string;
    shortcut?: string;
}
export declare class TooltipService {
    private tooltips;
    private activeTooltip;
    constructor();
    private initializeTooltips;
    register(id: string, config: TooltipConfig): void;
    show(id: string, targetElement: HTMLElement): void;
    hide(): void;
    attachToElement(id: string, element: HTMLElement): void;
}
