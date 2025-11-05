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
exports.TheiaTreeNode = void 0;
const theia_context_menu_1 = require("./theia-context-menu");
class TheiaTreeNode {
    constructor(elementHandle, app) {
        this.elementHandle = elementHandle;
        this.app = app;
        this.labelElementCssClass = '.theia-TreeNodeSegmentGrow';
        this.nodeSegmentLabelCssClass = '.theia-tree-compressed-label-part';
        this.expansionToggleCssClass = '.theia-ExpansionToggle';
        this.collapsedCssClass = '.theia-mod-collapsed';
    }
    async label() {
        const labelNode = await this.elementHandle.$(this.labelElementCssClass);
        if (!labelNode) {
            throw new Error('Cannot read label of ' + this.elementHandle);
        }
        return labelNode.textContent();
    }
    async isCollapsed() {
        return !!await this.elementHandle.$(this.collapsedCssClass);
    }
    async isExpandable() {
        return !!await this.elementHandle.$(this.expansionToggleCssClass);
    }
    async expand() {
        if (!await this.isCollapsed()) {
            return;
        }
        const expansionToggle = await this.elementHandle.waitForSelector(this.expansionToggleCssClass);
        await expansionToggle.click();
        await this.elementHandle.waitForSelector(`${this.expansionToggleCssClass}:not(${this.collapsedCssClass})`);
    }
    async collapse() {
        if (await this.isCollapsed()) {
            return;
        }
        const expansionToggle = await this.elementHandle.waitForSelector(this.expansionToggleCssClass);
        await expansionToggle.click();
        await this.elementHandle.waitForSelector(`${this.expansionToggleCssClass}${this.collapsedCssClass}`);
    }
    async openContextMenu() {
        return theia_context_menu_1.TheiaContextMenu.open(this.app, () => this.elementHandle.waitForSelector(this.labelElementCssClass));
    }
    async openContextMenuOnSegment(nodeSegmentLabel) {
        const treeNodeLabel = await this.elementHandle.waitForSelector(this.labelElementCssClass);
        const treeNodeLabelSegments = await treeNodeLabel.$$(`span${this.nodeSegmentLabelCssClass}`);
        for (const segmentLabel of treeNodeLabelSegments) {
            if (await segmentLabel.textContent() === nodeSegmentLabel) {
                return theia_context_menu_1.TheiaContextMenu.open(this.app, () => Promise.resolve(segmentLabel));
            }
        }
        throw new Error('Could not find tree node segment label "' + nodeSegmentLabel + '"');
    }
}
exports.TheiaTreeNode = TheiaTreeNode;
//# sourceMappingURL=theia-tree-node.js.map