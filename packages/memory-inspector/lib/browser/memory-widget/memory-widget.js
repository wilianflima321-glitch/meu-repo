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
var MemoryWidget_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryWidget = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@theia/core");
const browser_1 = require("@theia/core/lib/browser");
const inversify_1 = require("@theia/core/shared/inversify");
const memory_widget_utils_1 = require("../utils/memory-widget-utils");
const memory_options_widget_1 = require("./memory-options-widget");
const memory_table_widget_1 = require("./memory-table-widget");
let MemoryWidget = MemoryWidget_1 = class MemoryWidget extends browser_1.BaseWidget {
    static createWidget(parent, optionsWidget, tableWidget, optionSymbol = memory_widget_utils_1.MemoryWidgetOptions, options) {
        const child = MemoryWidget_1.createContainer(parent, optionsWidget, tableWidget, optionSymbol, options);
        return child.get(MemoryWidget_1);
    }
    static createContainer(parent, optionsWidget, tableWidget, optionSymbol = memory_widget_utils_1.MemoryWidgetOptions, options) {
        const child = new inversify_1.Container({ defaultScope: 'Singleton' });
        child.parent = parent;
        child.bind(optionsWidget).toSelf();
        child.bind(tableWidget).toSelf();
        child.bind(memory_widget_utils_1.MemoryWidgetOptions).toConstantValue(options);
        if (optionsWidget !== memory_options_widget_1.MemoryOptionsWidget) {
            child.bind(memory_options_widget_1.MemoryOptionsWidget).toService(optionsWidget);
        }
        if (tableWidget !== memory_table_widget_1.MemoryTableWidget) {
            child.bind(memory_table_widget_1.MemoryTableWidget).toService(tableWidget);
        }
        if (optionSymbol !== memory_widget_utils_1.MemoryWidgetOptions) {
            child.bind(optionSymbol).toConstantValue(options);
        }
        child.bind(MemoryWidget_1).toSelf();
        return child;
    }
    static getIdentifier(optionsWidgetID) {
        return `${MemoryWidget_1.ID}-${optionsWidgetID}`;
    }
    init() {
        this.doInit();
    }
    async doInit() {
        this.id = MemoryWidget_1.getIdentifier(this.memoryWidgetOptions.identifier.toString());
        this.addClass(MemoryWidget_1.ID);
        this.title.label = this.optionsWidget.title.label;
        this.title.caption = this.optionsWidget.title.caption;
        this.title.iconClass = this.optionsWidget.title.iconClass;
        this.title.closable = this.optionsWidget.title.closable;
        const layout = this.layout = new browser_1.PanelLayout();
        layout.addWidget(this.optionsWidget);
        layout.addWidget(this.tableWidget);
        this.toDispose.pushAll([
            this.layout,
            this.optionsWidget,
            this.tableWidget,
        ]);
        this.optionsWidget.title.changed.connect(title => {
            this.title.label = title.label;
            this.title.caption = title.caption;
            this.title.iconClass = title.iconClass;
        });
    }
    onActivateRequest() {
        this.optionsWidget.activate();
    }
};
exports.MemoryWidget = MemoryWidget;
MemoryWidget.ID = 'memory-view-wrapper';
MemoryWidget.LABEL = core_1.nls.localize('theia/memory-inspector/memoryTitle', 'Memory');
tslib_1.__decorate([
    (0, inversify_1.inject)(memory_widget_utils_1.MemoryWidgetOptions),
    tslib_1.__metadata("design:type", Object)
], MemoryWidget.prototype, "memoryWidgetOptions", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(memory_options_widget_1.MemoryOptionsWidget),
    tslib_1.__metadata("design:type", Object)
], MemoryWidget.prototype, "optionsWidget", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(memory_table_widget_1.MemoryTableWidget),
    tslib_1.__metadata("design:type", Object)
], MemoryWidget.prototype, "tableWidget", void 0);
tslib_1.__decorate([
    (0, inversify_1.postConstruct)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], MemoryWidget.prototype, "init", null);
exports.MemoryWidget = MemoryWidget = MemoryWidget_1 = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], MemoryWidget);
//# sourceMappingURL=memory-widget.js.map