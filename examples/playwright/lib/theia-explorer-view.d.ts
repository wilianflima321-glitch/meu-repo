import { ElementHandle } from '@playwright/test';
import { TheiaApp } from './theia-app';
import { TheiaMenuItem } from './theia-menu-item';
import { TheiaTreeNode } from './theia-tree-node';
import { TheiaView } from './theia-view';
export declare class TheiaExplorerFileStatNode extends TheiaTreeNode {
    protected elementHandle: ElementHandle<SVGElement | HTMLElement>;
    protected explorerView: TheiaExplorerView;
    constructor(elementHandle: ElementHandle<SVGElement | HTMLElement>, explorerView: TheiaExplorerView);
    absolutePath(): Promise<string | null>;
    isFile(): Promise<boolean>;
    isFolder(): Promise<boolean>;
    getMenuItemByNamePath(names: string[], nodeSegmentLabel?: string): Promise<TheiaMenuItem>;
}
export type TheiaExplorerFileStatNodePredicate = (node: TheiaExplorerFileStatNode) => Promise<boolean>;
export declare const DOT_FILES_FILTER: TheiaExplorerFileStatNodePredicate;
export declare class TheiaExplorerView extends TheiaView {
    constructor(app: TheiaApp);
    activate(): Promise<void>;
    refresh(): Promise<void>;
    collapseAll(): Promise<void>;
    protected clickButton(id: string): Promise<void>;
    visibleFileStatNodes(filterPredicate?: TheiaExplorerFileStatNodePredicate): Promise<TheiaExplorerFileStatNode[]>;
    getFileStatNodeByLabel(label: string, compact?: boolean): Promise<TheiaExplorerFileStatNode>;
    fileStatNode(filePath: string, compact?: boolean): Promise<TheiaExplorerFileStatNode | undefined>;
    protected fileStatNodeBySegments(...pathFragments: string[]): Promise<TheiaExplorerFileStatNode | undefined>;
    protected compactFileStatNode(path: string): Promise<TheiaExplorerFileStatNode | undefined>;
    selectTreeNode(filePath: string): Promise<void>;
    isTreeNodeSelected(filePath: string): Promise<boolean>;
    protected treeNodeSelector(filePath: string): string;
    protected treeNodeId(filePath: string): string;
    clickContextMenuItem(file: string, path: string[], nodeSegmentLabel?: string): Promise<void>;
    protected existsNode(path: string, isDirectory: boolean, compact?: boolean): Promise<boolean>;
    existsFileNode(path: string): Promise<boolean>;
    existsDirectoryNode(path: string, compact?: boolean): Promise<boolean>;
    waitForTreeNodeVisible(path: string): Promise<void>;
    getNumberOfVisibleNodes(): Promise<number>;
    deleteNode(path: string, confirm?: boolean, nodeSegmentLabel?: string): Promise<void>;
    renameNode(path: string, newName: string, confirm?: boolean, nodeSegmentLabel?: string): Promise<void>;
    waitForVisible(): Promise<void>;
    /**
     * Waits until some non-dot file nodes are visible
     */
    waitForVisibleFileNodes(): Promise<void>;
    waitForFileNodesToIncrease(numberBefore: number): Promise<void>;
    waitForFileNodesToDecrease(numberBefore: number): Promise<void>;
}
//# sourceMappingURL=theia-explorer-view.d.ts.map