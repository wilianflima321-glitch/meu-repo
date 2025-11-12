import { ElementHandle } from '@playwright/test';
import { TheiaApp } from './theia-app';
import { TheiaMenu } from './theia-menu';
export declare class TheiaTreeNode {
    protected elementHandle: ElementHandle<SVGElement | HTMLElement>;
    protected app: TheiaApp;
    labelElementCssClass: string;
    nodeSegmentLabelCssClass: string;
    expansionToggleCssClass: string;
    collapsedCssClass: string;
    constructor(elementHandle: ElementHandle<SVGElement | HTMLElement>, app: TheiaApp);
    label(): Promise<string | null>;
    isCollapsed(): Promise<boolean>;
    isExpandable(): Promise<boolean>;
    expand(): Promise<void>;
    collapse(): Promise<void>;
    openContextMenu(): Promise<TheiaMenu>;
    openContextMenuOnSegment(nodeSegmentLabel: string): Promise<TheiaMenu>;
}
//# sourceMappingURL=theia-tree-node.d.ts.map