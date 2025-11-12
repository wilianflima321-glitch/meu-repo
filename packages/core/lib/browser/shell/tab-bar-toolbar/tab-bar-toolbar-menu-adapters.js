"use strict";
// *****************************************************************************
// Copyright (C) 2022 Ericsson and others.
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
exports.ToolbarSubmenuWrapper = exports.ToolbarMenuNodeWrapper = exports.TOOLBAR_WRAPPER_ID_SUFFIX = void 0;
const React = require("react");
const tab_bar_toolbar_types_1 = require("./tab-bar-toolbar-types");
const tab_bar_toolbar_1 = require("./tab-bar-toolbar");
const widgets_1 = require("../../widgets");
const menu_1 = require("../../../common/menu");
exports.TOOLBAR_WRAPPER_ID_SUFFIX = '-as-tabbar-toolbar-item';
class AbstractToolbarMenuWrapper {
    constructor(effectiveMenuPath, commandRegistry, menuRegistry, contextKeyService, contextMenuRenderer) {
        this.effectiveMenuPath = effectiveMenuPath;
        this.commandRegistry = commandRegistry;
        this.menuRegistry = menuRegistry;
        this.contextKeyService = contextKeyService;
        this.contextMenuRenderer = contextMenuRenderer;
    }
    isEnabled() {
        if (menu_1.CommandMenu.is(this.menuNode)) {
            return this.menuNode.isEnabled(this.effectiveMenuPath);
        }
        return true;
    }
    isToggled() {
        if (menu_1.CommandMenu.is(this.menuNode) && this.menuNode.isToggled) {
            return !!this.menuNode.isToggled(this.effectiveMenuPath);
        }
        return false;
    }
    render(widget) {
        return this.renderMenuItem(widget);
    }
    toMenuNode() {
        return this.menuNode;
    }
    /**
     * Presents the menu to popup on the `event` that is the clicking of
     * a menu toolbar item.
     *
     * @param menuPath the path of the registered menu to show
     * @param event the mouse event triggering the menu
     */
    showPopupMenu(widget, menuPath, event, contextMatcher) {
        event.stopPropagation();
        event.preventDefault();
        const anchor = (0, tab_bar_toolbar_1.toAnchor)(event);
        this.contextMenuRenderer.render({
            menuPath: menuPath,
            menu: this.menuNode,
            args: [widget],
            anchor,
            context: (widget === null || widget === void 0 ? void 0 : widget.node) || event.target,
            contextKeyService: contextMatcher,
        });
    }
    /**
     * Renders a toolbar item that is a menu, presenting it as a button with a little
     * chevron decoration that pops up a floating menu when clicked.
     *
     * @param item a toolbar item that is a menu item
     * @returns the rendered toolbar item
     */
    renderMenuItem(widget) {
        const icon = this.icon || 'ellipsis';
        const contextMatcher = this.contextKeyService;
        const className = `${icon} ${widgets_1.ACTION_ITEM}`;
        if (menu_1.CompoundMenuNode.is(this.menuNode) && !this.menuNode.isEmpty(this.effectiveMenuPath, this.contextKeyService, widget.node)) {
            return React.createElement("div", { key: this.id, className: tab_bar_toolbar_1.TabBarToolbar.Styles.TAB_BAR_TOOLBAR_ITEM + ' enabled menu' },
                React.createElement("div", { className: className, title: this.tooltip || this.text, onClick: e => this.executeCommand(e) }),
                React.createElement("div", { className: widgets_1.ACTION_ITEM, onClick: event => this.showPopupMenu(widget, this.menuPath, event, contextMatcher) },
                    React.createElement("div", { className: (0, widgets_1.codicon)('chevron-down') + ' chevron' })));
        }
        else {
            return React.createElement("div", { key: this.id, className: tab_bar_toolbar_1.TabBarToolbar.Styles.TAB_BAR_TOOLBAR_ITEM + ' enabled menu' },
                React.createElement("div", { className: className, title: this.tooltip || this.text, onClick: e => this.executeCommand(e) }));
        }
    }
}
class ToolbarMenuNodeWrapper extends AbstractToolbarMenuWrapper {
    constructor(effectiveMenuPath, commandRegistry, menuRegistry, contextKeyService, contextMenuRenderer, menuNode, group, menuPath) {
        super(effectiveMenuPath, commandRegistry, menuRegistry, contextKeyService, contextMenuRenderer);
        this.menuNode = menuNode;
        this.group = group;
        this.menuPath = menuPath;
    }
    executeCommand(e) {
        if (menu_1.CommandMenu.is(this.menuNode)) {
            this.menuNode.run(this.effectiveMenuPath);
        }
    }
    isVisible(widget) {
        const menuNodeVisible = this.menuNode.isVisible(this.effectiveMenuPath, this.contextKeyService, widget.node);
        if (menu_1.CommandMenu.is(this.menuNode)) {
            return menuNodeVisible;
        }
        else if (menu_1.CompoundMenuNode.is(this.menuNode)) {
            return menuNodeVisible && !menu_1.MenuModelRegistry.isEmpty(this.menuNode);
        }
        else {
            return menuNodeVisible;
        }
    }
    get id() { return this.menuNode.id + exports.TOOLBAR_WRAPPER_ID_SUFFIX; }
    get icon() { return this.menuNode.icon; }
    get tooltip() { return this.menuNode.label; }
    get text() {
        return (this.group === tab_bar_toolbar_types_1.NAVIGATION || this.group === undefined) ? undefined : this.menuNode.label;
    }
    get onDidChange() {
        return this.menuNode.onDidChange;
    }
}
exports.ToolbarMenuNodeWrapper = ToolbarMenuNodeWrapper;
class ToolbarSubmenuWrapper extends AbstractToolbarMenuWrapper {
    constructor(effectiveMenuPath, commandRegistry, menuRegistry, contextKeyService, contextMenuRenderer, toolbarItem) {
        super(effectiveMenuPath, commandRegistry, menuRegistry, contextKeyService, contextMenuRenderer);
        this.toolbarItem = toolbarItem;
    }
    isEnabled(widget) {
        return this.toolbarItem.command ? this.commandRegistry.isEnabled(this.toolbarItem.command, widget) : !!this.toolbarItem.menuPath;
    }
    executeCommand(e, widget) {
        e.preventDefault();
        e.stopPropagation();
        if (!this.isEnabled(widget)) {
            return;
        }
        if (this.toolbarItem.command) {
            this.commandRegistry.executeCommand(this.toolbarItem.command, widget);
        }
    }
    ;
    isVisible(widget) {
        const menuNode = this.menuNode;
        if (this.toolbarItem.isVisible && !this.toolbarItem.isVisible(widget)) {
            return false;
        }
        if (!(menuNode === null || menuNode === void 0 ? void 0 : menuNode.isVisible(this.effectiveMenuPath, this.contextKeyService, widget.node, widget))) {
            return false;
        }
        if (this.toolbarItem.command) {
            return true;
        }
        if (menu_1.CompoundMenuNode.is(menuNode)) {
            return !menuNode.isEmpty(this.effectiveMenuPath, this.contextKeyService, widget.node, widget);
        }
        return true;
    }
    get id() { return this.toolbarItem.id; }
    get icon() {
        if (typeof this.toolbarItem.icon === 'function') {
            return this.toolbarItem.icon();
        }
        if (this.toolbarItem.icon) {
            return this.toolbarItem.icon;
        }
        if (this.toolbarItem.command) {
            const command = this.commandRegistry.getCommand(this.toolbarItem.command);
            return command === null || command === void 0 ? void 0 : command.iconClass;
        }
        return undefined;
    }
    get tooltip() { return this.toolbarItem.tooltip; }
    get text() { return (this.toolbarItem.group === tab_bar_toolbar_types_1.NAVIGATION || this.toolbarItem.group === undefined) ? undefined : this.toolbarItem.text; }
    get onDidChange() {
        var _a;
        return (_a = this.menuNode) === null || _a === void 0 ? void 0 : _a.onDidChange;
    }
    get menuPath() {
        return this.toolbarItem.menuPath;
    }
    get menuNode() {
        return this.menuRegistry.getMenu(this.menuPath);
    }
}
exports.ToolbarSubmenuWrapper = ToolbarSubmenuWrapper;
//# sourceMappingURL=tab-bar-toolbar-menu-adapters.js.map