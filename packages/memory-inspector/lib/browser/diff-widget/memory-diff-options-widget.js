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
var MemoryDiffOptionsWidget_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryDiffOptionsWidget = void 0;
const tslib_1 = require("tslib");
const browser_1 = require("@theia/core/lib/browser");
const inversify_1 = require("@theia/core/shared/inversify");
const React = tslib_1.__importStar(require("@theia/core/shared/react"));
const memory_options_widget_1 = require("../memory-widget/memory-options-widget");
const memory_widget_components_1 = require("../utils/memory-widget-components");
const memory_widget_utils_1 = require("../utils/memory-widget-utils");
const memory_diff_widget_types_1 = require("./memory-diff-widget-types");
const nls_1 = require("@theia/core/lib/common/nls");
let MemoryDiffOptionsWidget = MemoryDiffOptionsWidget_1 = class MemoryDiffOptionsWidget extends memory_options_widget_1.MemoryOptionsWidget {
    constructor() {
        super(...arguments);
        this.doRefresh = (event) => {
            var _a;
            if ('key' in event && ((_a = browser_1.KeyCode.createKeyCode(event.nativeEvent).key) === null || _a === void 0 ? void 0 : _a.keyCode) !== browser_1.Key.ENTER.keyCode) {
                return;
            }
            this.fireDidChangeOptions();
        };
    }
    get options() {
        return this.storeState();
    }
    updateDiffData(newDiffData) {
        this.memoryWidgetOptions = { ...this.memoryWidgetOptions, ...newDiffData };
        this.init();
    }
    init() {
        this.addClass(memory_options_widget_1.MemoryOptionsWidget.ID);
        this.addClass('diff-options-widget');
        const { identifier, beforeBytes, afterBytes } = this.memoryWidgetOptions;
        this.id = `${MemoryDiffOptionsWidget_1.ID}-${identifier}`;
        this.title.label = nls_1.nls.localize('theia/memory-inspector/diff/label', 'Diff: {0}', identifier);
        this.title.caption = this.title.label;
        this.title.iconClass = this.iconClass;
        this.title.closable = true;
        this.toDispose.push(this.onOptionsChanged(() => this.update()));
        beforeBytes.label = memory_diff_widget_types_1.DiffLabels.Before;
        afterBytes.label = memory_diff_widget_types_1.DiffLabels.After;
        this.columnsDisplayed = {
            beforeAddress: {
                label: nls_1.nls.localizeByDefault('Address'),
                doRender: true
            },
            beforeData: {
                label: this.memoryWidgetOptions.titles[0],
                doRender: true
            },
            afterAddress: {
                label: nls_1.nls.localizeByDefault('Address'),
                doRender: true
            },
            afterData: {
                label: this.memoryWidgetOptions.titles[1],
                doRender: true
            },
            variables: {
                label: nls_1.nls.localizeByDefault('Variables'),
                doRender: false
            },
            ascii: {
                label: nls_1.nls.localize('theia/memory-inspector/ascii', 'ASCII'),
                doRender: false
            },
        };
        this.update();
    }
    acceptFocus() {
        const settingsCog = this.node.querySelector('.toggle-settings-click-zone');
        settingsCog === null || settingsCog === void 0 ? void 0 : settingsCog.focus();
    }
    renderMemoryLocationGroup() {
        const { titles: [beforeTitle, afterTitle] } = this.memoryWidgetOptions;
        return (React.createElement("div", { className: 't-mv-group view-group' },
            React.createElement(memory_widget_components_1.MWInput, { id: memory_options_widget_1.LOCATION_OFFSET_FIELD_ID, label: nls_1.nls.localize('theia/memory-inspector/diff-widget/offset-label', '{0} Offset', beforeTitle), title: nls_1.nls.localize('theia/memory-inspector/diff-widget/offset-title', 'Bytes to offset the memory from {0}', beforeTitle), defaultValue: '0', passRef: this.assignOffsetRef, onChange: memory_widget_utils_1.Utils.validateNumericalInputs, onKeyDown: this.doRefresh }),
            React.createElement(memory_widget_components_1.MWInput, { id: memory_options_widget_1.LENGTH_FIELD_ID, label: nls_1.nls.localize('theia/memory-inspector/diff-widget/offset-label', '{0} Offset', afterTitle), title: nls_1.nls.localize('theia/memory-inspector/diff-widget/offset-title', 'Bytes to offset the memory from {0}', afterTitle), defaultValue: '0', passRef: this.assignReadLengthRef, onChange: memory_widget_utils_1.Utils.validateNumericalInputs, onKeyDown: this.doRefresh }),
            React.createElement("button", { type: 'button', className: 'theia-button main view-group-go-button', title: nls_1.nls.localizeByDefault('Go'), onClick: this.doRefresh }, nls_1.nls.localizeByDefault('Go'))));
    }
    getObligatoryColumnIds() {
        return ['beforeAddress', 'beforeData', 'afterAddress', 'afterData'];
    }
    storeState() {
        var _a, _b, _c, _d;
        return {
            ...super.storeState(),
            // prefix a 0. It'll do nothing if it's a number, but if it's an empty string or garbage, it'll make parseInt return 0.
            beforeOffset: parseInt(`0${(_b = (_a = this.offsetField) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : 0}`),
            afterOffset: parseInt(`0${(_d = (_c = this.readLengthField) === null || _c === void 0 ? void 0 : _c.value) !== null && _d !== void 0 ? _d : 0}`),
        };
    }
};
exports.MemoryDiffOptionsWidget = MemoryDiffOptionsWidget;
tslib_1.__decorate([
    (0, inversify_1.inject)(memory_widget_utils_1.MemoryDiffWidgetData),
    tslib_1.__metadata("design:type", Object)
], MemoryDiffOptionsWidget.prototype, "memoryWidgetOptions", void 0);
tslib_1.__decorate([
    (0, inversify_1.postConstruct)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], MemoryDiffOptionsWidget.prototype, "init", null);
exports.MemoryDiffOptionsWidget = MemoryDiffOptionsWidget = MemoryDiffOptionsWidget_1 = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], MemoryDiffOptionsWidget);
//# sourceMappingURL=memory-diff-options-widget.js.map