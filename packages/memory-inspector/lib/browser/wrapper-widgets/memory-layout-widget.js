"use strict";
/********************************************************************************
 * Copyright (C) 2021 Ericsson and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
 ********************************************************************************/
var MemoryLayoutWidget_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryLayoutWidget = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@theia/core");
const browser_1 = require("@theia/core/lib/browser");
const inversify_1 = require("@theia/core/shared/inversify");
const memory_diff_select_widget_1 = require("../diff-widget/memory-diff-select-widget");
const memory_widget_1 = require("../memory-widget/memory-widget");
const memory_widget_manager_1 = require("../utils/memory-widget-manager");
const memory_dock_panel_1 = require("./memory-dock-panel");
const memory_dockpanel_placeholder_widget_1 = require("./memory-dockpanel-placeholder-widget");
let MemoryLayoutWidget = MemoryLayoutWidget_1 = class MemoryLayoutWidget extends browser_1.Panel {
    constructor() {
        super(...arguments);
        this.onDidChangeTrackableWidgetsEmitter = new core_1.Emitter();
        this.onDidChangeTrackableWidgets = this.onDidChangeTrackableWidgetsEmitter.event;
        this.toDispose = new core_1.DisposableCollection();
        this.hasGeneratedWidgetAutomatically = false;
    }
    init() {
        this.doInit();
    }
    async doInit() {
        this.id = MemoryLayoutWidget_1.ID;
        this.addClass(MemoryLayoutWidget_1.ID);
        this.title.label = MemoryLayoutWidget_1.LABEL;
        this.title.caption = MemoryLayoutWidget_1.LABEL;
        this.title.closable = true;
        this.title.iconClass = 'memory-view-icon';
        this.dockPanel = await this.widgetManager.getOrCreateWidget(memory_dock_panel_1.MemoryDockPanel.ID);
        this.addWidget(this.dockPanel);
        this.addWidget(this.diffSelectWidget);
        this.addWidget(this.placeholderWidget);
        this.toDispose.push(this.memoryWidgetManager.onDidCreateNewWidget(widget => {
            this.dockPanel.addWidget(widget);
            this.dockPanel.activateWidget(widget);
            this.onDidChangeTrackableWidgetsEmitter.fire([widget]);
        }));
        this.toDispose.push(this.memoryWidgetManager.onChanged(() => {
            if (!this.memoryWidgetManager.canCompare) {
                this.diffSelectWidget.hide();
            }
        }));
        this.dockPanel.widgetRemoved.connect(this.handleWidgetRemoved.bind(this), this);
        this.dockPanel.widgetAdded.connect(this.handleWidgetsChanged.bind(this), this);
        this.toDispose.push(this.onDidChangeTrackableWidgetsEmitter);
        this.diffSelectWidget.hide();
        this.update();
    }
    toggleComparisonVisibility() {
        if (this.diffSelectWidget.isHidden) {
            this.diffSelectWidget.show();
        }
        else {
            this.diffSelectWidget.hide();
        }
        this.update();
    }
    dispose() {
        this.toDispose.dispose();
        super.dispose();
    }
    dockPanelHoldsWidgets() {
        const iter = this.dockPanel.tabBars();
        let tabBar = iter.next();
        while (!tabBar.done) {
            if (tabBar.value.titles.length) {
                return true;
            }
            tabBar = iter.next();
        }
        return false;
    }
    handleWidgetsChanged() {
        if (this.dockPanelHoldsWidgets()) {
            this.placeholderWidget.hide();
        }
        else {
            this.placeholderWidget.show();
        }
    }
    handleWidgetRemoved(_sender, widgetRemoved) {
        if (widgetRemoved instanceof memory_widget_1.MemoryWidget) { // Sometimes it's the tabbar.
            this.handleWidgetsChanged();
            this.shell.activateWidget(this.id);
        }
    }
    async createAndFocusWidget() {
        const widget = await this.memoryWidgetManager.createNewMemoryWidget();
        widget.activate();
    }
    async onAfterShow(msg) {
        if (!this.hasGeneratedWidgetAutomatically && !this.dockPanelHoldsWidgets()) {
            await this.createAndFocusWidget();
            this.hasGeneratedWidgetAutomatically = true;
        }
        super.onAfterShow(msg);
    }
    getTrackableWidgets() {
        const childIterator = this.dockPanel.children();
        return Array.from(childIterator);
    }
    activateWidget(id) {
        const widget = this.getTrackableWidgets().find(candidateWidget => candidateWidget.id === id);
        if (widget) {
            this.dockPanel.activateWidget(widget);
        }
        return widget;
    }
    onActivateRequest(msg) {
        var _a, _b;
        const displayedWidget = (_b = (_a = this.dockPanel.currentTabBar) === null || _a === void 0 ? void 0 : _a.currentTitle) === null || _b === void 0 ? void 0 : _b.owner;
        if (displayedWidget) {
            displayedWidget.activate();
        }
        else {
            // Only happens if you remove all widgets, then close the view.
            this.node.tabIndex = -1;
            this.node.focus();
        }
        super.onActivateRequest(msg);
    }
};
exports.MemoryLayoutWidget = MemoryLayoutWidget;
MemoryLayoutWidget.ID = 'memory-layout-widget';
MemoryLayoutWidget.LABEL = core_1.nls.localize('theia/memory-inspector/memoryInspector', 'Memory Inspector');
// Necessary to inherit theia's tabbar styling
MemoryLayoutWidget.DOCK_PANEL_ID = 'theia-main-content-panel';
MemoryLayoutWidget.THEIA_TABBAR_CLASSES = ['theia-app-centers', 'theia-app-main'];
MemoryLayoutWidget.MEMORY_INSPECTOR_TABBAR_CLASS = 'memory-dock-tabbar';
MemoryLayoutWidget.DOCK_PANEL_CLASS = 'memory-dock-panel';
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_1.WidgetManager),
    tslib_1.__metadata("design:type", browser_1.WidgetManager)
], MemoryLayoutWidget.prototype, "widgetManager", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(memory_widget_manager_1.MemoryWidgetManager),
    tslib_1.__metadata("design:type", memory_widget_manager_1.MemoryWidgetManager)
], MemoryLayoutWidget.prototype, "memoryWidgetManager", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(memory_diff_select_widget_1.MemoryDiffSelectWidget),
    tslib_1.__metadata("design:type", memory_diff_select_widget_1.MemoryDiffSelectWidget)
], MemoryLayoutWidget.prototype, "diffSelectWidget", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(memory_dockpanel_placeholder_widget_1.MemoryDockpanelPlaceholder),
    tslib_1.__metadata("design:type", memory_dockpanel_placeholder_widget_1.MemoryDockpanelPlaceholder)
], MemoryLayoutWidget.prototype, "placeholderWidget", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_1.ApplicationShell),
    tslib_1.__metadata("design:type", browser_1.ApplicationShell)
], MemoryLayoutWidget.prototype, "shell", void 0);
tslib_1.__decorate([
    (0, inversify_1.postConstruct)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], MemoryLayoutWidget.prototype, "init", null);
exports.MemoryLayoutWidget = MemoryLayoutWidget = MemoryLayoutWidget_1 = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], MemoryLayoutWidget);
//# sourceMappingURL=memory-layout-widget.js.map