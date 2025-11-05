"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryWidgetManager = void 0;
const tslib_1 = require("tslib");
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
const core_1 = require("@theia/core");
const browser_1 = require("@theia/core/lib/browser");
const inversify_1 = require("@theia/core/shared/inversify");
const memory_diff_table_widget_1 = require("../diff-widget/memory-diff-table-widget");
const memory_widget_1 = require("../memory-widget/memory-widget");
const register_widget_types_1 = require("../register-widget/register-widget-types");
const nls_1 = require("@theia/core/lib/common/nls");
const memory_editable_table_widget_1 = require("../editable-widget/memory-editable-table-widget");
let MemoryWidgetManager = class MemoryWidgetManager {
    constructor() {
        this.createdWidgetCount = 0;
        this.widgetDisplayId = 0;
        this.toDispose = new core_1.DisposableCollection();
        this.onNewWidgetCreated = new core_1.Emitter();
        this.onDidCreateNewWidget = this.onNewWidgetCreated.event;
        this.onSelectedWidgetChanged = new core_1.Emitter();
        this.onDidChangeSelectedWidget = this.onSelectedWidgetChanged.event;
        this.onChangedEmitter = new core_1.Emitter();
        this.onChanged = this.onChangedEmitter.event;
        this._availableWidgets = new Map();
        this._canCompare = false;
    }
    get availableWidgets() {
        return Array.from(this._availableWidgets.values());
    }
    get canCompare() {
        return this._canCompare;
    }
    init() {
        this.toDispose.pushAll([
            this.shell.onDidChangeActiveWidget(({ newValue }) => {
                if (newValue instanceof memory_widget_1.MemoryWidget) {
                    this._focusedWidget = newValue;
                }
            }),
            this.widgetManager.onDidCreateWidget(e => {
                const { widget } = e;
                if (widget instanceof memory_widget_1.MemoryWidget) {
                    this._availableWidgets.set(widget.id, widget);
                    this.toDispose.push(widget.onDidDispose(() => {
                        this._availableWidgets.delete(widget.id);
                        if (widget === this._focusedWidget) {
                            this.focusedWidget = undefined;
                        }
                        this.onChangedEmitter.fire();
                    }));
                }
            }),
            this.onChanged(() => this.setCanCompare()),
            this.onNewWidgetCreated,
            this.onChangedEmitter,
            this.onSelectedWidgetChanged,
        ]);
    }
    get focusedWidget() {
        var _a;
        return (_a = this._focusedWidget) !== null && _a !== void 0 ? _a : this._availableWidgets.values().next().value;
    }
    set focusedWidget(title) {
        this._focusedWidget = title;
        this.onSelectedWidgetChanged.fire(title);
    }
    setCanCompare() {
        this._canCompare = this.availableWidgets.filter(widget => !register_widget_types_1.RegisterWidget.is(widget) && !memory_diff_table_widget_1.MemoryDiffWidget.is(widget)).length > 1;
    }
    async createNewMemoryWidget(kind = 'memory') {
        this.widgetDisplayId = this._availableWidgets.size !== 0 ? this.widgetDisplayId + 1 : 1;
        const widget = await this.getWidgetOfKind(kind);
        this._availableWidgets.set(widget.id, widget);
        widget.title.changed.connect(() => this.onChangedEmitter.fire());
        widget.activate();
        this.fireNewWidget(widget);
        return widget;
    }
    getWidgetOfKind(kind) {
        const widgetId = this.getWidgetIdForKind(kind);
        const options = this.getWidgetOptionsForId(widgetId);
        return this.widgetManager.getOrCreateWidget(widgetId, options);
    }
    getWidgetIdForKind(kind) {
        switch (kind) {
            case 'register':
            case register_widget_types_1.RegisterWidget.ID:
                return register_widget_types_1.RegisterWidget.ID;
            case 'writable':
            case memory_editable_table_widget_1.EditableMemoryWidget.ID:
                return memory_editable_table_widget_1.EditableMemoryWidget.ID;
            default:
                return memory_widget_1.MemoryWidget.ID;
        }
    }
    getWidgetOptionsForId(widgetId) {
        return { identifier: this.createdWidgetCount += 1, displayId: this.widgetDisplayId };
    }
    dispose() {
        this.toDispose.dispose();
    }
    fireNewWidget(widget) {
        this.onNewWidgetCreated.fire(widget);
        this.onChangedEmitter.fire();
    }
    async doDiff(options) {
        if (options.beforeBytes.length === 0) {
            // eslint-disable-next-line max-len
            const beforeBytesMessage = nls_1.nls.localize('theia/memory-inspector/utils/bytesMessage', 'You must load memory in both widgets you would like to compare. {0} has no memory loaded.', options.titles[0]);
            this.messageService.warn(beforeBytesMessage);
            return undefined;
        }
        else if (options.afterBytes.length === 0) {
            // eslint-disable-next-line max-len
            const afterBytesMessage = nls_1.nls.localize('theia/memory-inspector/utils/afterBytes', 'You must load memory in both widgets you would like to compare. {0} has no memory loaded.', options.titles[1]);
            this.messageService.warn(afterBytesMessage);
            return undefined;
        }
        const fullOptions = { ...options, dynamic: false, identifier: options.titles.join('-') };
        const existingWidget = this._availableWidgets.get(memory_widget_1.MemoryWidget.getIdentifier(fullOptions.identifier.toString()));
        if (existingWidget && existingWidget.tableWidget instanceof memory_diff_table_widget_1.MemoryDiffTableWidget) {
            existingWidget.tableWidget.updateDiffData(options);
        }
        const widget = existingWidget !== null && existingWidget !== void 0 ? existingWidget : await this.widgetManager
            .getOrCreateWidget(memory_diff_table_widget_1.MemoryDiffWidget.ID, { ...options, dynamic: false, identifier: options.titles.join('-') });
        const tabBar = this.shell.getTabBarFor(widget);
        if (!tabBar) {
            // The widget is not attached yet, so add it to the shell
            const widgetArgs = {
                area: 'main',
            };
            await this.shell.addWidget(widget, widgetArgs);
        }
        await this.shell.activateWidget(widget.id);
        return widget;
    }
};
exports.MemoryWidgetManager = MemoryWidgetManager;
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_1.WidgetManager),
    tslib_1.__metadata("design:type", browser_1.WidgetManager)
], MemoryWidgetManager.prototype, "widgetManager", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_1.ApplicationShell),
    tslib_1.__metadata("design:type", browser_1.ApplicationShell)
], MemoryWidgetManager.prototype, "shell", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.MessageService),
    tslib_1.__metadata("design:type", core_1.MessageService)
], MemoryWidgetManager.prototype, "messageService", void 0);
tslib_1.__decorate([
    (0, inversify_1.postConstruct)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], MemoryWidgetManager.prototype, "init", null);
exports.MemoryWidgetManager = MemoryWidgetManager = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], MemoryWidgetManager);
//# sourceMappingURL=memory-widget-manager.js.map