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
var MemoryDiffSelectWidget_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryDiffSelectWidget = void 0;
const tslib_1 = require("tslib");
const browser_1 = require("@theia/core/lib/browser");
const inversify_1 = require("@theia/core/shared/inversify");
const React = tslib_1.__importStar(require("@theia/core/shared/react"));
const register_widget_types_1 = require("../register-widget/register-widget-types");
const memory_widget_components_1 = require("../utils/memory-widget-components");
const memory_widget_manager_1 = require("../utils/memory-widget-manager");
const memory_diff_table_widget_1 = require("./memory-diff-table-widget");
const nls_1 = require("@theia/core/lib/common/nls");
let MemoryDiffSelectWidget = MemoryDiffSelectWidget_1 = class MemoryDiffSelectWidget extends browser_1.ReactWidget {
    constructor() {
        super(...arguments);
        this.beforeWidgetLabel = '';
        this.afterWidgetLabel = '';
        this.labelToWidgetMap = new Map();
        this.assignBaseValue = (e) => {
            this.beforeWidgetLabel = e.target.value;
            this.update();
        };
        this.assignLaterValue = (e) => {
            this.afterWidgetLabel = e.target.value;
            this.update();
        };
        this.diffIfEnter = (e) => {
            var _a;
            if (((_a = browser_1.KeyCode.createKeyCode(e.nativeEvent).key) === null || _a === void 0 ? void 0 : _a.keyCode) === browser_1.Key.ENTER.keyCode) {
                this.doDiff();
            }
        };
        this.diff = () => this.doDiff();
    }
    init() {
        this.addClass(MemoryDiffSelectWidget_1.DIFF_SELECT_CLASS);
        this.id = MemoryDiffSelectWidget_1.DIFF_SELECT_CLASS;
        this.updateWidgetMap();
        this.update();
        this.toDispose.push(this.memoryWidgetManager.onChanged(() => this.updateWidgetMap()));
        this.scrollOptions = { ...this.scrollOptions, suppressScrollX: false };
        this.hide();
    }
    onActivateRequest(msg) {
        var _a;
        super.onActivateRequest(msg);
        (_a = this.node.querySelector('select')) === null || _a === void 0 ? void 0 : _a.focus();
    }
    render() {
        const optionLabels = [...this.labelToWidgetMap.keys()];
        const currentBase = this.getBeforeLabel(optionLabels);
        const currentChanged = this.getAfterLabel(optionLabels, currentBase);
        return optionLabels.length > 1 && (React.createElement("div", { className: 'memory-diff-select-wrapper' },
            React.createElement("div", { className: 'diff-select-input-wrapper' },
                React.createElement("div", { className: 't-mv-diff-select-widget-options-wrapper' },
                    React.createElement(memory_widget_components_1.MWSelect, { id: 'diff-selector-before', label: 'compare', value: currentBase, options: optionLabels, onChange: this.assignBaseValue })),
                React.createElement("div", { className: 't-mv-diff-select-widget-options-wrapper' },
                    React.createElement(memory_widget_components_1.MWSelect, { id: 'diff-selector-after', label: 'with', value: currentChanged, options: optionLabels.filter(label => label !== currentBase), onChange: this.assignLaterValue, onKeyDown: this.diffIfEnter }))),
            React.createElement("button", { type: 'button', className: 'theia-button main memory-diff-select-go', title: nls_1.nls.localizeByDefault('Go'), onClick: this.diff }, nls_1.nls.localizeByDefault('Go'))));
    }
    updateWidgetMap() {
        const widgets = this.memoryWidgetManager.availableWidgets.filter(widget => !memory_diff_table_widget_1.MemoryDiffWidget.is(widget) && !register_widget_types_1.RegisterWidget.is(widget));
        this.labelToWidgetMap = new Map(widgets.map((widget) => [widget.title.label, widget]));
        this.update();
    }
    getBeforeLabel(optionLabels = [...this.labelToWidgetMap.keys()]) {
        return this.labelToWidgetMap.has(this.beforeWidgetLabel) && this.beforeWidgetLabel || optionLabels[0];
    }
    getAfterLabel(optionLabels, beforeWidgetLabel = this.getBeforeLabel(optionLabels)) {
        var _a;
        return (_a = (this.afterWidgetLabel && this.afterWidgetLabel !== beforeWidgetLabel
            ? this.afterWidgetLabel
            : optionLabels.find(label => label !== beforeWidgetLabel))) !== null && _a !== void 0 ? _a : '';
    }
    doDiff() {
        const labels = [...this.labelToWidgetMap.keys()];
        const baseLabel = this.getBeforeLabel(labels);
        const changedLabel = this.getAfterLabel(labels, baseLabel);
        const baseWidget = this.labelToWidgetMap.get(baseLabel);
        const changedWidget = this.labelToWidgetMap.get(changedLabel);
        if (baseWidget && changedWidget) {
            const memoryAndAddresses = this.getMemoryArrays(baseWidget, changedWidget);
            this.memoryWidgetManager.doDiff({ ...memoryAndAddresses, titles: [baseLabel, changedLabel] });
        }
    }
    getMemoryArrays(beforeWidget, afterWidget) {
        const { memory: beforeMemory } = beforeWidget.optionsWidget;
        const { memory: afterMemory } = afterWidget.optionsWidget;
        return {
            beforeBytes: beforeMemory.bytes,
            afterBytes: afterMemory.bytes,
            beforeAddress: beforeMemory.address,
            afterAddress: afterMemory.address,
            beforeVariables: beforeMemory.variables,
            afterVariables: afterMemory.variables,
        };
    }
};
exports.MemoryDiffSelectWidget = MemoryDiffSelectWidget;
MemoryDiffSelectWidget.DIFF_SELECT_CLASS = 'memory-diff-select';
tslib_1.__decorate([
    (0, inversify_1.inject)(memory_widget_manager_1.MemoryWidgetManager),
    tslib_1.__metadata("design:type", memory_widget_manager_1.MemoryWidgetManager)
], MemoryDiffSelectWidget.prototype, "memoryWidgetManager", void 0);
tslib_1.__decorate([
    (0, inversify_1.postConstruct)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], MemoryDiffSelectWidget.prototype, "init", null);
exports.MemoryDiffSelectWidget = MemoryDiffSelectWidget = MemoryDiffSelectWidget_1 = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], MemoryDiffSelectWidget);
//# sourceMappingURL=memory-diff-select-widget.js.map