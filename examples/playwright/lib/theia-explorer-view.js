"use strict";
// *****************************************************************************
// Copyright (C) 2021 logi.cals GmbH, EclipseSource and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// This Source Code may also be made available under the following Secondary
// Licenses when the conditions for such availability set forth in the Eclipse
// Public License v. 2.0 are satisfied: GNU General Public License, version 2
// with the GNU Classpath Exception which is available at
// https://www.gnu.org/software/classpath/license.html.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************
Object.defineProperty(exports, "__esModule", { value: true });
exports.TheiaExplorerView = exports.DOT_FILES_FILTER = exports.TheiaExplorerFileStatNode = void 0;
const theia_dialog_1 = require("./theia-dialog");
const theia_rename_dialog_1 = require("./theia-rename-dialog");
const theia_tree_node_1 = require("./theia-tree-node");
const theia_view_1 = require("./theia-view");
const util_1 = require("./util");
const TheiaExplorerViewData = {
    tabSelector: '#shell-tab-explorer-view-container',
    viewSelector: '#explorer-view-container--files',
    viewName: 'Explorer'
};
class TheiaExplorerFileStatNode extends theia_tree_node_1.TheiaTreeNode {
    constructor(elementHandle, explorerView) {
        super(elementHandle, explorerView.app);
        this.elementHandle = elementHandle;
        this.explorerView = explorerView;
    }
    async absolutePath() {
        return this.elementHandle.getAttribute('title');
    }
    async isFile() {
        return !await this.isFolder();
    }
    async isFolder() {
        return (0, util_1.elementContainsClass)(this.elementHandle, 'theia-DirNode');
    }
    async getMenuItemByNamePath(names, nodeSegmentLabel) {
        const contextMenu = nodeSegmentLabel ? await this.openContextMenuOnSegment(nodeSegmentLabel) : await this.openContextMenu();
        const menuItem = await contextMenu.menuItemByNamePath(...names);
        if (!menuItem) {
            throw Error('MenuItem could not be retrieved by path');
        }
        return menuItem;
    }
}
exports.TheiaExplorerFileStatNode = TheiaExplorerFileStatNode;
const DOT_FILES_FILTER = async (node) => {
    const label = await node.label();
    return label ? !label.startsWith('.') : true;
};
exports.DOT_FILES_FILTER = DOT_FILES_FILTER;
class TheiaExplorerView extends theia_view_1.TheiaView {
    constructor(app) {
        super(TheiaExplorerViewData, app);
    }
    async activate() {
        await super.activate();
        const viewElement = await this.viewElement();
        await (viewElement === null || viewElement === void 0 ? void 0 : viewElement.waitForSelector('.theia-TreeContainer'));
    }
    async refresh() {
        await this.clickButton('navigator.refresh');
    }
    async collapseAll() {
        await this.clickButton('navigator.collapse.all');
    }
    async clickButton(id) {
        await this.activate();
        const viewElement = await this.viewElement();
        await (viewElement === null || viewElement === void 0 ? void 0 : viewElement.hover());
        const button = await (viewElement === null || viewElement === void 0 ? void 0 : viewElement.waitForSelector(`#${(0, util_1.normalizeId)(id)}`));
        await (button === null || button === void 0 ? void 0 : button.click());
    }
    async visibleFileStatNodes(filterPredicate = (_ => Promise.resolve(true))) {
        const viewElement = await this.viewElement();
        const handles = await (viewElement === null || viewElement === void 0 ? void 0 : viewElement.$$('.theia-FileStatNode'));
        if (handles) {
            const nodes = handles.map(handle => new TheiaExplorerFileStatNode(handle, this));
            const filteredNodes = [];
            for (const node of nodes) {
                if ((await filterPredicate(node)) === true) {
                    filteredNodes.push(node);
                }
            }
            return filteredNodes;
        }
        return [];
    }
    async getFileStatNodeByLabel(label, compact = false) {
        const file = await this.fileStatNode(label, compact);
        if (!file) {
            throw Error('File stat node could not be retrieved by path fragments');
        }
        return file;
    }
    async fileStatNode(filePath, compact = false) {
        return compact ? this.compactFileStatNode(filePath) : this.fileStatNodeBySegments(...filePath.split('/'));
    }
    async fileStatNodeBySegments(...pathFragments) {
        await super.activate();
        const viewElement = await this.viewElement();
        let currentTreeNode = undefined;
        let fragmentsSoFar = '';
        for (let index = 0; index < pathFragments.length; index++) {
            const fragment = pathFragments[index];
            fragmentsSoFar += index !== 0 ? '/' : '';
            fragmentsSoFar += fragment;
            const selector = this.treeNodeSelector(fragmentsSoFar);
            const nextTreeNode = await (viewElement === null || viewElement === void 0 ? void 0 : viewElement.waitForSelector(selector, { state: 'visible' }));
            if (!nextTreeNode) {
                throw new Error(`Tree node '${selector}' not found in explorer`);
            }
            currentTreeNode = new TheiaExplorerFileStatNode(nextTreeNode, this);
            if (index < pathFragments.length - 1 && await currentTreeNode.isCollapsed()) {
                await currentTreeNode.expand();
            }
        }
        return currentTreeNode;
    }
    async compactFileStatNode(path) {
        // default setting `explorer.compactFolders=true` renders folders in a compact form - single child folders will be compressed in a combined tree element
        await super.activate();
        const viewElement = await this.viewElement();
        // check if first segment folder needs to be expanded first (if folder has never been expanded, it will not show the compact folder structure)
        await this.waitForVisibleFileNodes();
        const firstSegment = path.split('/')[0];
        const selector = this.treeNodeSelector(firstSegment);
        const folderElement = await (viewElement === null || viewElement === void 0 ? void 0 : viewElement.$(selector));
        if (folderElement && await folderElement.isVisible()) {
            const folderNode = await (viewElement === null || viewElement === void 0 ? void 0 : viewElement.waitForSelector(selector, { state: 'visible' }));
            if (!folderNode) {
                throw new Error(`Tree node '${selector}' not found in explorer`);
            }
            const folderFileStatNode = new TheiaExplorerFileStatNode(folderNode, this);
            if (await folderFileStatNode.isCollapsed()) {
                await folderFileStatNode.expand();
            }
        }
        // now get tree node via the full path
        const fullPathSelector = this.treeNodeSelector(path);
        const treeNode = await (viewElement === null || viewElement === void 0 ? void 0 : viewElement.waitForSelector(fullPathSelector, { state: 'visible' }));
        if (!treeNode) {
            throw new Error(`Tree node '${fullPathSelector}' not found in explorer`);
        }
        return new TheiaExplorerFileStatNode(treeNode, this);
    }
    async selectTreeNode(filePath) {
        await this.activate();
        const treeNode = await this.page.waitForSelector(this.treeNodeSelector(filePath));
        if (await this.isTreeNodeSelected(filePath)) {
            await treeNode.focus();
        }
        else {
            await treeNode.click({ modifiers: [util_1.OSUtil.isMacOS ? 'Meta' : 'Control'] });
            // make sure the click has been acted-upon before returning
            while (!await this.isTreeNodeSelected(filePath)) {
                console.debug('Waiting for clicked tree node to be selected: ' + filePath);
            }
        }
        await this.page.waitForSelector(this.treeNodeSelector(filePath) + '.theia-mod-selected');
    }
    async isTreeNodeSelected(filePath) {
        const treeNode = await this.page.waitForSelector(this.treeNodeSelector(filePath));
        return (0, util_1.elementContainsClass)(treeNode, 'theia-mod-selected');
    }
    treeNodeSelector(filePath) {
        return `.theia-FileStatNode:has(#${(0, util_1.normalizeId)(this.treeNodeId(filePath))})`;
    }
    treeNodeId(filePath) {
        const workspacePath = this.app.workspace.pathAsPathComponent;
        const nodeId = `${workspacePath}:${workspacePath}/${filePath}`;
        if (util_1.OSUtil.isWindows) {
            return nodeId.replace('\\', '/');
        }
        return nodeId;
    }
    async clickContextMenuItem(file, path, nodeSegmentLabel) {
        await this.activate();
        const fileStatNode = await this.fileStatNode(file, !!nodeSegmentLabel);
        if (!fileStatNode) {
            throw Error('File stat node could not be retrieved by path fragments');
        }
        const menuItem = await fileStatNode.getMenuItemByNamePath(path, nodeSegmentLabel);
        await menuItem.click();
    }
    async existsNode(path, isDirectory, compact = false) {
        const fileStatNode = await this.fileStatNode(path, compact);
        if (!fileStatNode) {
            return false;
        }
        if (isDirectory) {
            if (!await fileStatNode.isFolder()) {
                throw Error(`FileStatNode for '${path}' is not a directory!`);
            }
        }
        else {
            if (!await fileStatNode.isFile()) {
                throw Error(`FileStatNode for '${path}' is not a file!`);
            }
        }
        return true;
    }
    async existsFileNode(path) {
        return this.existsNode(path, false);
    }
    async existsDirectoryNode(path, compact = false) {
        return this.existsNode(path, true, compact);
    }
    async waitForTreeNodeVisible(path) {
        // wait for tree node to be visible, e.g. after triggering create
        const viewElement = await this.viewElement();
        await (viewElement === null || viewElement === void 0 ? void 0 : viewElement.waitForSelector(this.treeNodeSelector(path), { state: 'visible' }));
    }
    async getNumberOfVisibleNodes() {
        await this.activate();
        await this.refresh();
        const fileStatElements = await this.visibleFileStatNodes(exports.DOT_FILES_FILTER);
        return fileStatElements.length;
    }
    async deleteNode(path, confirm = true, nodeSegmentLabel) {
        await this.activate();
        await this.clickContextMenuItem(path, ['Delete'], nodeSegmentLabel);
        const confirmDialog = new theia_dialog_1.TheiaDialog(this.app);
        await confirmDialog.waitForVisible();
        confirm ? await confirmDialog.clickMainButton() : await confirmDialog.clickSecondaryButton();
        await confirmDialog.waitForClosed();
    }
    async renameNode(path, newName, confirm = true, nodeSegmentLabel) {
        await this.activate();
        await this.clickContextMenuItem(path, ['Rename'], nodeSegmentLabel);
        const renameDialog = new theia_rename_dialog_1.TheiaRenameDialog(this.app);
        await renameDialog.waitForVisible();
        await renameDialog.enterNewName(newName);
        await renameDialog.waitUntilMainButtonIsEnabled();
        confirm ? await renameDialog.confirm() : await renameDialog.close();
        await renameDialog.waitForClosed();
        await this.refresh();
    }
    async waitForVisible() {
        await super.waitForVisible();
        await this.page.waitForSelector(this.tabSelector, { state: 'visible' });
    }
    /**
     * Waits until some non-dot file nodes are visible
     */
    async waitForVisibleFileNodes() {
        while ((await this.visibleFileStatNodes(exports.DOT_FILES_FILTER)).length === 0) {
            console.debug('Awaiting for tree nodes to appear');
        }
    }
    async waitForFileNodesToIncrease(numberBefore) {
        const fileStatNodesSelector = `${this.viewSelector} .theia-FileStatNode`;
        await this.page.waitForFunction((predicate) => {
            const elements = document.querySelectorAll(predicate.selector);
            return !!elements && elements.length > predicate.numberBefore;
        }, { selector: fileStatNodesSelector, numberBefore });
    }
    async waitForFileNodesToDecrease(numberBefore) {
        const fileStatNodesSelector = `${this.viewSelector} .theia-FileStatNode`;
        await this.page.waitForFunction((predicate) => {
            const elements = document.querySelectorAll(predicate.selector);
            return !!elements && elements.length < predicate.numberBefore;
        }, { selector: fileStatNodesSelector, numberBefore });
    }
}
exports.TheiaExplorerView = TheiaExplorerView;
//# sourceMappingURL=theia-explorer-view.js.map