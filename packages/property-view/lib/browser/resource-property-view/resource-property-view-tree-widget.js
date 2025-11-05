"use strict";
// *****************************************************************************
// Copyright (C) 2020 EclipseSource and others.
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
var ResourcePropertyViewTreeWidget_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourcePropertyViewTreeWidget = void 0;
const tslib_1 = require("tslib");
const browser_1 = require("@theia/core/lib/browser");
const inversify_1 = require("@theia/core/shared/inversify");
const React = require("@theia/core/shared/react");
const resource_property_view_tree_items_1 = require("./resource-property-view-tree-items");
const nls_1 = require("@theia/core/lib/common/nls");
/**
 * This widget fetches the property data for {@link FileSelection}s and selections of {@link Navigatable}s
 * and renders that property data as a {@link TreeWidget}.
 * This widget is provided by the registered `ResourcePropertyViewWidgetProvider`.
 */
let ResourcePropertyViewTreeWidget = ResourcePropertyViewTreeWidget_1 = class ResourcePropertyViewTreeWidget extends browser_1.TreeWidget {
    constructor(props, model, contextMenuRenderer) {
        super(props, model, contextMenuRenderer);
        model.root = {
            id: resource_property_view_tree_items_1.ROOT_ID,
            name: ResourcePropertyViewTreeWidget_1.LABEL,
            parent: undefined,
            visible: false,
            children: []
        };
        this.propertiesTree = new Map();
    }
    init() {
        super.init();
        this.id = ResourcePropertyViewTreeWidget_1.ID + '-treeContainer';
        this.addClass('treeContainer');
        this.fillPropertiesTree();
    }
    updateNeeded(selection) {
        return this.currentSelection !== selection;
    }
    updatePropertyViewContent(propertyDataService, selection) {
        if (this.updateNeeded(selection)) {
            this.currentSelection = selection;
            if (propertyDataService) {
                propertyDataService.providePropertyData(selection).then((fileStatObject) => {
                    this.fillPropertiesTree(fileStatObject);
                });
            }
        }
    }
    fillPropertiesTree(fileStatObject) {
        if (fileStatObject) {
            this.propertiesTree.clear();
            const infoNode = this.createCategoryNode('info', nls_1.nls.localizeByDefault('Info'));
            this.propertiesTree.set('info', infoNode);
            infoNode.children.push(this.createResultLineNode('isDirectory', nls_1.nls.localize('theia/property-view/directory', 'Directory'), fileStatObject.isDirectory, infoNode));
            infoNode.children.push(this.createResultLineNode('isFile', nls_1.nls.localizeByDefault('File'), fileStatObject.isFile, infoNode));
            infoNode.children.push(this.createResultLineNode('isSymbolicLink', nls_1.nls.localize('theia/property-view/symbolicLink', 'Symbolic link'), fileStatObject.isSymbolicLink, infoNode));
            infoNode.children.push(this.createResultLineNode('location', nls_1.nls.localize('theia/property-view/location', 'Location'), this.getLocationString(fileStatObject), infoNode));
            infoNode.children.push(this.createResultLineNode('name', nls_1.nls.localizeByDefault('Name'), this.getFileName(fileStatObject), infoNode));
            infoNode.children.push(this.createResultLineNode('path', nls_1.nls.localizeByDefault('Path'), this.getFilePath(fileStatObject), infoNode));
            infoNode.children.push(this.createResultLineNode('lastModification', nls_1.nls.localize('theia/property-view/lastModified', 'Last modified'), this.getLastModificationString(fileStatObject), infoNode));
            infoNode.children.push(this.createResultLineNode('created', nls_1.nls.localize('theia/property-view/created', 'Created'), this.getCreationTimeString(fileStatObject), infoNode));
            infoNode.children.push(this.createResultLineNode('size', nls_1.nls.localizeByDefault('Size'), this.getSizeString(fileStatObject), infoNode));
            this.refreshModelChildren();
        }
    }
    getLocationString(fileStat) {
        return fileStat.resource.path.fsPath();
    }
    getFileName(fileStat) {
        return this.labelProvider.getName(fileStat.resource);
    }
    getFilePath(fileStat) {
        return this.labelProvider.getLongName(fileStat.resource);
    }
    getLastModificationString(fileStat) {
        return fileStat.mtime ? new Date(fileStat.mtime).toLocaleString() : '';
    }
    getCreationTimeString(fileStat) {
        return fileStat.ctime ? new Date(fileStat.ctime).toLocaleString() : '';
    }
    getSizeString(fileStat) {
        return fileStat.size ? nls_1.nls.localizeByDefault('{0}B', fileStat.size.toString()) : '';
    }
    /*
    * Creating TreeNodes
    */
    createCategoryNode(categoryId, name) {
        return {
            id: categoryId,
            parent: this.model.root,
            name,
            children: [],
            categoryId,
            selected: false,
            expanded: true
        };
    }
    createResultLineNode(id, name, property, parent) {
        return {
            id: `${parent.id}::${id}`,
            parent,
            name: name,
            property: property !== undefined ? String(property) : '',
            selected: false
        };
    }
    /**
     * Rendering
     */
    async refreshModelChildren() {
        if (resource_property_view_tree_items_1.ResourcePropertiesRoot.is(this.model.root)) {
            this.model.root.children = Array.from(this.propertiesTree.values());
            this.model.refresh();
        }
    }
    renderCaption(node, props) {
        if (resource_property_view_tree_items_1.ResourcePropertiesCategoryNode.is(node)) {
            return this.renderExpandableNode(node);
        }
        else if (resource_property_view_tree_items_1.ResourcePropertiesItemNode.is(node)) {
            return this.renderItemNode(node);
        }
        return undefined;
    }
    renderExpandableNode(node) {
        return React.createElement(React.Fragment, null,
            React.createElement("div", { className: `theia-resource-tree-node-icon ${this.toNodeIcon(node)}` }),
            React.createElement("div", { className: 'theia-resource-tree-node-name theia-TreeNodeSegment theia-TreeNodeSegmentGrow' }, this.toNodeName(node)));
    }
    renderItemNode(node) {
        return React.createElement(React.Fragment, null,
            React.createElement("div", { className: `theia-resource-tree-node-icon ${this.toNodeIcon(node)}` }),
            React.createElement("div", { className: 'theia-resource-tree-node-name theia-TreeNodeSegment theia-TreeNodeSegmentGrow' }, this.toNodeName(node)),
            React.createElement("div", { className: 'theia-resource-tree-node-property theia-TreeNodeSegment theia-TreeNodeSegmentGrow' }, this.toNodeDescription(node)));
    }
    createNodeAttributes(node, props) {
        return {
            ...super.createNodeAttributes(node, props),
            title: this.getNodeTooltip(node)
        };
    }
    getNodeTooltip(node) {
        if (resource_property_view_tree_items_1.ResourcePropertiesCategoryNode.is(node)) {
            return this.labelProvider.getName(node);
        }
        else if (resource_property_view_tree_items_1.ResourcePropertiesItemNode.is(node)) {
            return `${this.labelProvider.getName(node)}: ${this.labelProvider.getLongName(node)}`;
        }
        return undefined;
    }
};
exports.ResourcePropertyViewTreeWidget = ResourcePropertyViewTreeWidget;
ResourcePropertyViewTreeWidget.ID = 'resource-properties-tree-widget';
ResourcePropertyViewTreeWidget.LABEL = 'Resource Properties Tree';
tslib_1.__decorate([
    (0, inversify_1.postConstruct)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], ResourcePropertyViewTreeWidget.prototype, "init", null);
exports.ResourcePropertyViewTreeWidget = ResourcePropertyViewTreeWidget = ResourcePropertyViewTreeWidget_1 = tslib_1.__decorate([
    (0, inversify_1.injectable)(),
    tslib_1.__param(0, (0, inversify_1.inject)(browser_1.TreeProps)),
    tslib_1.__param(1, (0, inversify_1.inject)(browser_1.TreeModel)),
    tslib_1.__param(2, (0, inversify_1.inject)(browser_1.ContextMenuRenderer)),
    tslib_1.__metadata("design:paramtypes", [Object, Object, browser_1.ContextMenuRenderer])
], ResourcePropertyViewTreeWidget);
//# sourceMappingURL=resource-property-view-tree-widget.js.map