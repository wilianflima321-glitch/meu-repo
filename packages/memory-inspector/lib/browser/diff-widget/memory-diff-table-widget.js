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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryDiffTableWidget = exports.MemoryDiffWidget = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const React = tslib_1.__importStar(require("@theia/core/shared/react"));
const long_1 = tslib_1.__importDefault(require("long"));
const memory_table_widget_1 = require("../memory-widget/memory-table-widget");
const memory_widget_utils_1 = require("../utils/memory-widget-utils");
const memory_widget_variable_utils_1 = require("../utils/memory-widget-variable-utils");
const memory_diff_options_widget_1 = require("./memory-diff-options-widget");
const memory_diff_widget_types_1 = require("./memory-diff-widget-types");
var MemoryDiffWidget;
(function (MemoryDiffWidget) {
    MemoryDiffWidget.ID = 'memory.diff.view';
    MemoryDiffWidget.is = (widget) => widget.optionsWidget instanceof memory_diff_options_widget_1.MemoryDiffOptionsWidget;
})(MemoryDiffWidget || (exports.MemoryDiffWidget = MemoryDiffWidget = {}));
let MemoryDiffTableWidget = class MemoryDiffTableWidget extends memory_table_widget_1.MemoryTableWidget {
    constructor() {
        super(...arguments);
        this.diffedSpanCounter = 0;
        this.isHighContrast = false;
    }
    updateDiffData(newDiffData) {
        this.optionsWidget.updateDiffData(newDiffData);
        this.diffData = { ...this.diffData, ...newDiffData };
        this.getStateAndUpdate();
    }
    getState() {
        this.options = this.optionsWidget.options;
        this.isHighContrast = this.themeService.getCurrentTheme().type === 'hc';
        this.beforeVariableFinder = new memory_widget_variable_utils_1.VariableFinder(this.diffData.beforeVariables, this.isHighContrast);
        this.afterVariableFinder = new memory_widget_variable_utils_1.VariableFinder(this.diffData.afterVariables, this.isHighContrast);
        this.memory = { bytes: this.diffData.beforeBytes, address: new long_1.default(0), variables: this.diffData.beforeVariables };
        this.offsetData = this.getOffsetData();
    }
    getOffsetData() {
        const offsetData = {
            before: {
                leading: this.options.beforeOffset * this.options.byteSize / 8,
                trailing: 0,
            },
            after: {
                leading: this.options.afterOffset * this.options.byteSize / 8,
                trailing: 0,
            },
        };
        this.setTrailing(offsetData);
        return offsetData;
    }
    setTrailing(offsetData) {
        const totalBeforeLength = this.diffData.beforeBytes.length - offsetData.before.leading;
        const totalAfterLength = this.diffData.afterBytes.length - offsetData.after.leading;
        const totalDifference = totalBeforeLength - totalAfterLength;
        const realDifference = Math.abs(totalDifference);
        const beforeShorter = totalDifference < 0;
        if (beforeShorter) {
            offsetData.before.trailing = realDifference;
        }
        else {
            offsetData.after.trailing = realDifference;
        }
    }
    /* eslint-enable no-param-reassign */
    getWrapperClass() {
        return `${super.getWrapperClass()} diff-table`;
    }
    getTableHeaderClass() {
        return `${super.getTableHeaderClass()} diff-table`;
    }
    *renderRows() {
        const bytesPerRow = this.options.bytesPerGroup * this.options.groupsPerRow;
        const oldGroupIterator = this.renderGroups(this.diffData.beforeBytes);
        const changeGroupIterator = this.renderGroups(this.diffData.afterBytes);
        let rowsYielded = 0;
        let before = this.getNewRowData();
        let after = this.getNewRowData();
        let isModified = false;
        for (const oldGroup of oldGroupIterator) {
            const nextChanged = changeGroupIterator.next();
            isModified = isModified || !!oldGroup.isHighlighted;
            this.aggregate(before, oldGroup);
            this.aggregate(after, nextChanged.value);
            if (before.groups.length === this.options.groupsPerRow || oldGroup.index === this.diffData.beforeBytes.length - 1) {
                const beforeID = this.diffData.beforeAddress.add(this.options.beforeOffset + (bytesPerRow * rowsYielded));
                const afterID = this.diffData.afterAddress.add(this.options.afterOffset + (bytesPerRow * rowsYielded));
                const beforeAddress = `0x${beforeID.toString(16)}`;
                const afterAddress = `0x${afterID.toString(16)}`;
                const doShowDivider = (rowsYielded % 4) === 3;
                yield this.renderSingleRow({ beforeAddress, afterAddress, doShowDivider, before, after, isModified });
                rowsYielded += 1;
                isModified = false;
                before = this.getNewRowData();
                after = this.getNewRowData();
            }
        }
    }
    renderSingleRow(options, getRowAttributes = this.getRowAttributes.bind(this)) {
        const { beforeAddress, afterAddress, before, after, isModified, doShowDivider } = options;
        const { className } = getRowAttributes({ doShowDivider });
        return (React.createElement("tr", { key: beforeAddress, className: className },
            React.createElement("td", { className: memory_table_widget_1.MemoryTable.ADDRESS_DATA_CLASS }, beforeAddress),
            React.createElement("td", { className: this.getDataCellClass('before', isModified) }, before.groups),
            React.createElement("td", { className: memory_table_widget_1.MemoryTable.ADDRESS_DATA_CLASS }, afterAddress),
            React.createElement("td", { className: this.getDataCellClass('after', isModified) }, after.groups),
            this.getExtraColumn({
                variables: before.variables.slice(),
                ascii: before.ascii,
                afterVariables: after.variables.slice(),
                afterAscii: after.ascii,
            })));
    }
    getExtraColumn(options) {
        const additionalColumns = [];
        if (this.options.columnsDisplayed.variables.doRender) {
            additionalColumns.push(this.getDiffedVariables(options));
        }
        if (this.options.columnsDisplayed.ascii.doRender) {
            additionalColumns.push(this.getDiffedAscii(options));
        }
        return additionalColumns;
    }
    getDiffedAscii(options) {
        const { ascii: beforeAscii, afterAscii } = options;
        const highContrastClass = this.isHighContrast ? ' hc' : '';
        if (beforeAscii === afterAscii) {
            return super.getExtraColumn({ ascii: beforeAscii });
        }
        const EMPTY_TEXT = {
            before: '',
            after: '',
        };
        let currentText = { ...EMPTY_TEXT };
        const beforeSpans = [];
        const afterSpans = [];
        let lastWasSame = true;
        for (let i = 0; i < beforeAscii.length; i += 1) {
            const beforeLetter = beforeAscii[i];
            const afterLetter = afterAscii[i];
            const thisIsSame = beforeLetter === afterLetter;
            if (thisIsSame !== lastWasSame) {
                lastWasSame = thisIsSame;
                this.addTextBits(beforeSpans, afterSpans, currentText);
                currentText = { ...EMPTY_TEXT };
            }
            currentText.before += beforeLetter;
            currentText.after += afterLetter;
        }
        this.addTextBits(beforeSpans, afterSpans, currentText);
        return (React.createElement("td", { key: 'ascii', className: memory_table_widget_1.MemoryTable.EXTRA_COLUMN_DATA_CLASS },
            React.createElement("span", { className: `different t-mv-diffed-ascii before${highContrastClass}` }, beforeSpans),
            React.createElement("span", { className: `different t-mv-diffed-ascii after${highContrastClass}` }, afterSpans)));
    }
    addTextBits(beforeSpans, afterSpans, texts) {
        const [newBeforeSpans, newAfterSpans] = this.getAsciiSpan(texts);
        beforeSpans.push(newBeforeSpans);
        afterSpans.push(newAfterSpans);
    }
    getAsciiSpan({ before, after }) {
        if (!before) {
            return [undefined, undefined];
        }
        const differentClass = before === after ? '' : 'different';
        const highContrastClass = this.isHighContrast ? ' hc' : '';
        // use non-breaking spaces so they show up in the diff.
        return [
            React.createElement("span", { key: before + after + (this.diffedSpanCounter += 1), className: `before ${differentClass}${highContrastClass}` }, before.replace(/ /g, '\xa0')),
            React.createElement("span", { key: before + after + (this.diffedSpanCounter += 1), className: `after ${differentClass}${highContrastClass}` }, after.replace(/ /g, '\xa0')),
        ];
    }
    getDiffedVariables(options) {
        const { variables: beforeVariables, afterVariables } = options;
        const variableSpans = [];
        let areDifferent = false;
        for (const beforeVariable of beforeVariables) {
            const placeInAfterVariables = afterVariables.findIndex(afterVariable => afterVariable.name === beforeVariable.name);
            if (placeInAfterVariables > -1) {
                afterVariables.splice(placeInAfterVariables, 1);
                variableSpans.push(this.getVariableSpan(beforeVariable, memory_diff_widget_types_1.DiffLabels.Before, false));
            }
            else {
                areDifferent = true;
                variableSpans.push(this.getVariableSpan(beforeVariable, memory_diff_widget_types_1.DiffLabels.Before, true));
            }
        }
        for (const afterVariable of afterVariables) {
            variableSpans.push(this.getVariableSpan(afterVariable, memory_diff_widget_types_1.DiffLabels.After, true));
        }
        return React.createElement("td", { key: 'variables', className: `${memory_table_widget_1.MemoryTable.EXTRA_COLUMN_DATA_CLASS}${areDifferent ? ' different' : ''}` }, variableSpans);
    }
    getVariableSpan({ name, color }, origin, isChanged) {
        return (React.createElement("span", { key: name, className: `t-mv-variable-label ${origin} ${isChanged ? ' different' : ''}`, style: { color } }, name));
    }
    getDataCellClass(modifier, isModified) {
        const highContrastClass = this.isHighContrast ? 'hc' : '';
        let base = `${memory_table_widget_1.MemoryTable.MEMORY_DATA_CLASS} ${modifier} ${highContrastClass}`;
        if (isModified) {
            base += ' different';
        }
        return base;
    }
    getNewRowData() {
        return {
            groups: [],
            variables: [],
            ascii: '',
        };
    }
    aggregate(container, newData) {
        if (newData) {
            container.groups.push(newData.node);
            container.variables.push(...newData.variables);
            container.ascii += newData.ascii;
        }
    }
    *renderArrayItems(iteratee = this.memory.bytes, getBitAttributes = this.getBitAttributes.bind(this)) {
        let ignoredItems = 0;
        const iterateeOffsetData = iteratee.label === memory_diff_widget_types_1.DiffLabels.Before ? this.offsetData.before : this.offsetData.after;
        for (const item of super.renderArrayItems(iteratee, getBitAttributes)) {
            if (ignoredItems < iterateeOffsetData.leading) {
                ignoredItems += 1;
                continue;
            }
            yield item;
        }
        for (let i = 0; i < iterateeOffsetData.trailing; i += 1) {
            yield this.getDummySpan(i);
        }
    }
    getDummySpan(key) {
        const node = React.createElement("span", { key: key }, '\xa0'.repeat(2));
        return {
            node,
            content: '',
            index: -1 * key,
        };
    }
    getBitAttributes(arrayOffset, iteratee) {
        var _a;
        const isHighlighted = this.getHighlightStatus(arrayOffset, iteratee);
        const content = iteratee[arrayOffset].toString(16).padStart(2, '0');
        let className = `${memory_table_widget_1.MemoryTable.EIGHT_BIT_SPAN_CLASS} ${(_a = iteratee.label) !== null && _a !== void 0 ? _a : ''}`;
        const highContrastClass = this.isHighContrast ? 'hc' : '';
        if (isHighlighted) {
            className += ` different ${highContrastClass}`;
        }
        const isBeforeChunk = iteratee.label === memory_diff_widget_types_1.DiffLabels.Before;
        const baseAddress = isBeforeChunk ? this.diffData.beforeAddress : this.diffData.afterAddress;
        const itemAddress = baseAddress.add(arrayOffset * 8 / this.options.byteSize);
        const variable = isBeforeChunk
            ? this.beforeVariableFinder.getVariableForAddress(itemAddress)
            : this.afterVariableFinder.getVariableForAddress(itemAddress);
        return { className, content, isHighlighted, variable, style: { color: variable === null || variable === void 0 ? void 0 : variable.color } };
    }
    getHighlightStatus(arrayOffset, iteratee) {
        const source = iteratee.label === memory_diff_widget_types_1.DiffLabels.Before ? memory_diff_widget_types_1.DiffLabels.Before : memory_diff_widget_types_1.DiffLabels.After;
        const targetArray = source === memory_diff_widget_types_1.DiffLabels.Before ? this.diffData.afterBytes : this.diffData.beforeBytes;
        const sourceValue = iteratee[arrayOffset];
        const targetIndex = this.translateBetweenShiftedArrays(arrayOffset, source);
        const targetValue = targetArray[targetIndex];
        return sourceValue !== undefined &&
            targetValue !== undefined &&
            sourceValue !== targetValue;
    }
    translateBetweenShiftedArrays(sourceIndex, source) {
        const sourceOffsets = source === memory_diff_widget_types_1.DiffLabels.Before ? this.offsetData.before : this.offsetData.after;
        const targetOffsets = source === memory_diff_widget_types_1.DiffLabels.Before ? this.offsetData.after : this.offsetData.before;
        return sourceIndex - sourceOffsets.leading + targetOffsets.leading;
    }
    getHoverForVariable(span) {
        var _a, _b;
        const name = (_a = span.textContent) !== null && _a !== void 0 ? _a : '';
        const variable = (_b = this.beforeVariableFinder.searchForVariable(name)) !== null && _b !== void 0 ? _b : this.afterVariableFinder.searchForVariable(name);
        if (variable === null || variable === void 0 ? void 0 : variable.type) {
            return { type: variable.type };
        }
        return undefined;
    }
};
exports.MemoryDiffTableWidget = MemoryDiffTableWidget;
tslib_1.__decorate([
    (0, inversify_1.inject)(memory_widget_utils_1.MemoryDiffWidgetData),
    tslib_1.__metadata("design:type", Object)
], MemoryDiffTableWidget.prototype, "diffData", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(memory_diff_options_widget_1.MemoryDiffOptionsWidget),
    tslib_1.__metadata("design:type", memory_diff_options_widget_1.MemoryDiffOptionsWidget)
], MemoryDiffTableWidget.prototype, "optionsWidget", void 0);
exports.MemoryDiffTableWidget = MemoryDiffTableWidget = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], MemoryDiffTableWidget);
//# sourceMappingURL=memory-diff-table-widget.js.map