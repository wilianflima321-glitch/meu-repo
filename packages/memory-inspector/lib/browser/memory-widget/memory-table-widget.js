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
var MemoryTableWidget_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryTableWidget = exports.MemoryTable = void 0;
const tslib_1 = require("tslib");
const browser_1 = require("@theia/core/lib/browser");
const theming_1 = require("@theia/core/lib/browser/theming");
const promise_util_1 = require("@theia/core/lib/common/promise-util");
const inversify_1 = require("@theia/core/shared/inversify");
const React = tslib_1.__importStar(require("@theia/core/shared/react"));
const util_1 = require("../../common/util");
const memory_provider_service_1 = require("../memory-provider/memory-provider-service");
const memory_hover_renderer_1 = require("../utils/memory-hover-renderer");
const memory_widget_components_1 = require("../utils/memory-widget-components");
const memory_widget_utils_1 = require("../utils/memory-widget-utils");
const memory_widget_variable_utils_1 = require("../utils/memory-widget-variable-utils");
const memory_options_widget_1 = require("./memory-options-widget");
const debounce = require("@theia/core/shared/lodash.debounce");
/* eslint-disable @typescript-eslint/no-explicit-any */
var MemoryTable;
(function (MemoryTable) {
    MemoryTable.ROW_CLASS = 't-mv-view-row';
    MemoryTable.ROW_DIVIDER_CLASS = 't-mv-view-row-highlight';
    MemoryTable.ADDRESS_DATA_CLASS = 't-mv-view-address';
    MemoryTable.MEMORY_DATA_CLASS = 't-mv-view-data';
    MemoryTable.EXTRA_COLUMN_DATA_CLASS = 't-mv-view-code';
    MemoryTable.GROUP_SPAN_CLASS = 'byte-group';
    MemoryTable.BYTE_SPAN_CLASS = 'single-byte';
    MemoryTable.EIGHT_BIT_SPAN_CLASS = 'eight-bits';
    MemoryTable.HEADER_LABEL_CONTAINER_CLASS = 't-mv-header-label-container';
    MemoryTable.HEADER_LABEL_CLASS = 't-mv-header-label';
    MemoryTable.VARIABLE_LABEL_CLASS = 't-mv-variable-label';
    MemoryTable.HEADER_ROW_CLASS = 't-mv-header';
})(MemoryTable || (exports.MemoryTable = MemoryTable = {}));
let MemoryTableWidget = MemoryTableWidget_1 = class MemoryTableWidget extends browser_1.ReactWidget {
    constructor() {
        super(...arguments);
        this.deferredScrollContainer = new promise_util_1.Deferred();
        this.updateColumnWidths = debounce(this.doUpdateColumnWidths.bind(this), memory_widget_utils_1.Constants.DEBOUNCE_TIME);
        this.assignScrollContainerRef = (element) => {
            this.deferredScrollContainer.resolve(element);
        };
        this.loadMoreMemory = async (options) => {
            const { direction, numBytes } = options;
            const { address, offset, length } = this.optionsWidget.options;
            let newOffset = 0;
            const newLength = length + numBytes;
            if (direction === 'above') {
                newOffset = offset - numBytes;
            }
            await this.optionsWidget.setAddressAndGo(`${address}`, newOffset, newLength, direction);
        };
        this.handleTableMouseMove = (e) => {
            const { target } = e; // react events can't be put into the debouncer
            this.debounceHandleMouseTableMove(target);
        };
        this.debounceHandleMouseTableMove = debounce(this.doHandleTableMouseMove.bind(this), memory_widget_utils_1.Constants.DEBOUNCE_TIME, { trailing: true });
        this.handleTableRightClick = (e) => this.doHandleTableRightClick(e);
    }
    init() {
        this.doInit();
    }
    async doInit() {
        this.id = MemoryTableWidget_1.ID;
        this.addClass(MemoryTableWidget_1.ID);
        this.scrollOptions = { ...this.scrollOptions, suppressScrollX: false };
        this.toDispose.push(this.optionsWidget.onOptionsChanged(optionId => this.handleOptionChange(optionId)));
        this.toDispose.push(this.optionsWidget.onMemoryChanged(e => this.handleMemoryChange(e)));
        this.toDispose.push(this.themeService.onDidColorThemeChange(e => this.handleThemeChange(e)));
        this.getStateAndUpdate();
    }
    handleOptionChange(_id) {
        this.getStateAndUpdate();
        return Promise.resolve();
    }
    update() {
        super.update();
        this.updateColumnWidths();
    }
    onResize(msg) {
        this.updateColumnWidths();
        super.onResize(msg);
    }
    doUpdateColumnWidths() {
        setTimeout(() => {
            const firstTR = this.node.querySelector('tr');
            const header = this.node.querySelector(`.${MemoryTable.HEADER_ROW_CLASS}`);
            if (firstTR && header) {
                const allTDs = Array.from(firstTR.querySelectorAll('td'));
                const allSizes = allTDs.map(td => `minmax(max-content, ${td.clientWidth}px)`);
                header.style.gridTemplateColumns = allSizes.join(' ');
            }
        });
    }
    areSameRegion(a, b) {
        return a.address.equals(b === null || b === void 0 ? void 0 : b.address) && a.bytes.length === (b === null || b === void 0 ? void 0 : b.bytes.length);
    }
    handleMemoryChange(newMemory) {
        if (this.areSameRegion(this.memory, newMemory)) {
            this.previousBytes = this.memory.bytes;
        }
        else {
            this.previousBytes = undefined;
        }
        this.getStateAndUpdate();
    }
    handleThemeChange(_themeChange) {
        this.getStateAndUpdate();
    }
    getState() {
        this.options = this.optionsWidget.options;
        this.memory = this.optionsWidget.memory;
        const isHighContrast = this.themeService.getCurrentTheme().type === 'hc';
        this.variableFinder = this.optionsWidget.options.columnsDisplayed.variables.doRender
            ? new memory_widget_variable_utils_1.VariableFinder(this.memory.variables, isHighContrast)
            : undefined;
    }
    getStateAndUpdate() {
        this.getState();
        this.update();
        this.scrollIntoViewIfNecessary();
    }
    scrollIntoViewIfNecessary() {
        return new Promise(resolve => setTimeout(() => {
            this.deferredScrollContainer.promise.then(scrollContainer => {
                var _a;
                const table = scrollContainer.querySelector('table');
                if (table && scrollContainer.scrollTop > table.clientHeight) {
                    const valueToGetInWindow = table.clientHeight - this.node.clientHeight;
                    const scrollHere = Math.max(valueToGetInWindow, 0);
                    scrollContainer.scrollTo(scrollContainer.scrollLeft, scrollHere);
                }
                (_a = this.scrollBar) === null || _a === void 0 ? void 0 : _a.update();
                resolve();
            });
        }));
    }
    getWrapperHandlers() {
        return { onMouseMove: this.handleTableMouseMove };
    }
    async getScrollContainer() {
        return this.deferredScrollContainer.promise;
    }
    render() {
        const rows = this.getTableRows();
        const { onClick, onContextMenu, onFocus, onBlur, onKeyDown, onMouseMove } = this.getWrapperHandlers();
        const headers = Object.entries(this.options.columnsDisplayed)
            .filter(([, { doRender }]) => doRender)
            .map(([id, { label }]) => ({ label, id }));
        return (React.createElement("div", { className: this.getWrapperClass(), onClick: onClick, onContextMenu: onContextMenu, onFocus: onFocus, onBlur: onBlur, onKeyDown: onKeyDown, onMouseMove: onMouseMove, role: 'textbox', tabIndex: 0 },
            React.createElement("div", { className: this.getTableHeaderClass(), style: this.getTableHeaderStyle(headers.length) }, this.getTableHeaders(headers)),
            React.createElement("div", { className: 't-mv-view-container', style: { position: 'relative' }, ref: this.assignScrollContainerRef },
                this.getBeforeTableContent(),
                React.createElement("table", { className: 't-mv-view' },
                    React.createElement("tbody", null, rows)),
                this.getAfterTableContent()),
            this.getTableFooter()));
    }
    getWrapperClass() {
        return `t-mv-memory-container${this.options.isFrozen ? ' frozen' : ''}`;
    }
    getTableHeaderClass() {
        return MemoryTable.HEADER_ROW_CLASS + ' no-select';
    }
    getTableHeaderStyle(numLabels) {
        const safePercentage = Math.floor(100 / numLabels);
        const gridTemplateColumns = ` ${safePercentage}% `.repeat(numLabels);
        return { gridTemplateColumns };
    }
    getTableHeaders(labels) {
        return labels.map(label => this.getTableHeader(label));
    }
    getTableHeader({ label, id }) {
        return (React.createElement("div", { key: id, className: MemoryTable.HEADER_LABEL_CONTAINER_CLASS },
            React.createElement("span", { className: 't-mv-header-label' }, label)));
    }
    getBeforeTableContent() {
        return (!!this.memory.bytes.length && (React.createElement(memory_widget_components_1.MWMoreMemorySelect, { options: [128, 256, 512], direction: 'above', handler: this.loadMoreMemory })));
    }
    getAfterTableContent() {
        return (!!this.memory.bytes.length && (React.createElement(memory_widget_components_1.MWMoreMemorySelect, { options: [128, 256, 512], direction: 'below', handler: this.loadMoreMemory })));
    }
    getTableFooter() {
        return undefined;
    }
    getTableRows() {
        return [...this.renderRows()];
    }
    *renderRows(iteratee = this.memory.bytes) {
        const bytesPerRow = this.options.bytesPerGroup * this.options.groupsPerRow;
        let rowsYielded = 0;
        let groups = [];
        let ascii = '';
        let variables = [];
        let isRowHighlighted = false;
        for (const { node, index, ascii: groupAscii, variables: groupVariables, isHighlighted = false } of this.renderGroups(iteratee)) {
            groups.push(node);
            ascii += groupAscii;
            variables.push(...groupVariables);
            isRowHighlighted = isRowHighlighted || isHighlighted;
            if (groups.length === this.options.groupsPerRow || index === iteratee.length - 1) {
                const rowAddress = this.memory.address.add(bytesPerRow * rowsYielded);
                const options = {
                    address: `0x${rowAddress.toString(16)}`,
                    doShowDivider: (rowsYielded % 4) === 3,
                    isHighlighted: isRowHighlighted,
                    ascii,
                    groups,
                    variables,
                    index,
                };
                yield this.renderRow(options);
                ascii = '';
                variables = [];
                groups = [];
                rowsYielded += 1;
                isRowHighlighted = false;
            }
        }
    }
    renderRow(options, getRowAttributes = this.getRowAttributes.bind(this)) {
        const { address, groups } = options;
        const { className, style, title } = getRowAttributes(options);
        return (React.createElement("tr", { 
            // Add a marker to help visual navigation when scrolling
            className: className, style: style, title: title, key: address },
            React.createElement("td", { className: MemoryTable.ADDRESS_DATA_CLASS }, address),
            React.createElement("td", { className: MemoryTable.MEMORY_DATA_CLASS }, groups),
            this.getExtraColumn(options)));
    }
    getRowAttributes(options) {
        let className = MemoryTable.ROW_CLASS;
        if (options.doShowDivider) {
            className += ` ${MemoryTable.ROW_DIVIDER_CLASS}`;
        }
        return { className };
    }
    getExtraColumn(options) {
        const { variables } = options;
        const additionalColumns = [];
        if (this.options.columnsDisplayed.variables.doRender) {
            additionalColumns.push(React.createElement("td", { className: MemoryTable.EXTRA_COLUMN_DATA_CLASS, key: 'variables' }, !!(variables === null || variables === void 0 ? void 0 : variables.length) && (React.createElement("span", { className: 'variable-container' }, variables.map(({ name, color }) => (React.createElement("span", { key: name, className: MemoryTable.VARIABLE_LABEL_CLASS, style: { color } }, name)))))));
        }
        if (this.options.columnsDisplayed.ascii.doRender) {
            const asciiColumn = this.options.columnsDisplayed.ascii.doRender && React.createElement("td", { className: MemoryTable.EXTRA_COLUMN_DATA_CLASS, key: 'ascii' }, options.ascii);
            additionalColumns.push(asciiColumn);
        }
        return additionalColumns;
    }
    *renderGroups(iteratee = this.memory.bytes) {
        let bytesInGroup = [];
        let ascii = '';
        let variables = [];
        let isGroupHighlighted = false;
        for (const { node, index, ascii: byteAscii, variables: byteVariables, isHighlighted = false } of this.renderBytes(iteratee)) {
            this.buildGroupByEndianness(bytesInGroup, node);
            ascii += byteAscii;
            variables.push(...byteVariables);
            isGroupHighlighted = isGroupHighlighted || isHighlighted;
            if (bytesInGroup.length === this.options.bytesPerGroup || index === iteratee.length - 1) {
                const itemID = this.memory.address.add(index);
                yield {
                    node: React.createElement("span", { className: 'byte-group', key: itemID.toString(16) }, bytesInGroup),
                    ascii,
                    index,
                    variables,
                    isHighlighted: isGroupHighlighted,
                };
                bytesInGroup = [];
                ascii = '';
                variables = [];
                isGroupHighlighted = false;
            }
        }
    }
    buildGroupByEndianness(oldBytes, newByte) {
        if (this.options.endianness === memory_widget_utils_1.Interfaces.Endianness.Big) {
            oldBytes.push(newByte);
        }
        else {
            oldBytes.unshift(newByte);
        }
    }
    *renderBytes(iteratee = this.memory.bytes) {
        const itemsPerByte = this.options.byteSize / 8;
        let currentByte = 0;
        let chunksInByte = [];
        let variables = [];
        let isByteHighlighted = false;
        for (const { node, content, index, variable, isHighlighted = false } of this.renderArrayItems(iteratee)) {
            chunksInByte.push(node);
            const numericalValue = parseInt(content, 16);
            currentByte = (currentByte << 8) + numericalValue;
            isByteHighlighted = isByteHighlighted || isHighlighted;
            if (variable === null || variable === void 0 ? void 0 : variable.firstAppearance) {
                variables.push(variable);
            }
            if (chunksInByte.length === itemsPerByte || index === iteratee.length - 1) {
                const itemID = this.memory.address.add(index);
                const ascii = this.getASCIIForSingleByte(currentByte);
                yield {
                    node: React.createElement("span", { className: 'single-byte', key: itemID.toString(16) }, chunksInByte),
                    ascii,
                    index,
                    variables,
                    isHighlighted: isByteHighlighted,
                };
                currentByte = 0;
                chunksInByte = [];
                variables = [];
                isByteHighlighted = false;
            }
        }
    }
    getASCIIForSingleByte(byte) {
        return typeof byte === 'undefined'
            ? ' ' : memory_widget_utils_1.Utils.isPrintableAsAscii(byte) ? String.fromCharCode(byte) : '.';
    }
    *renderArrayItems(iteratee = this.memory.bytes, getBitAttributes = this.getBitAttributes.bind(this)) {
        const { address } = this.memory;
        for (let i = 0; i < iteratee.length; i += 1) {
            const itemID = address.add(i).toString(16);
            const { content = '', className, style, variable, title, isHighlighted } = getBitAttributes(i, iteratee);
            const node = (React.createElement("span", { style: style, key: itemID, className: className, "data-id": itemID, title: title }, content));
            yield {
                node,
                content,
                index: i,
                variable,
                isHighlighted,
            };
        }
    }
    getBitAttributes(arrayOffset, iteratee) {
        var _a;
        const itemAddress = this.memory.address.add(arrayOffset * 8 / this.options.byteSize);
        const classNames = [MemoryTable.EIGHT_BIT_SPAN_CLASS];
        const isChanged = this.previousBytes && iteratee[arrayOffset] !== this.previousBytes[arrayOffset];
        const variable = (_a = this.variableFinder) === null || _a === void 0 ? void 0 : _a.getVariableForAddress(itemAddress);
        if (!this.options.isFrozen) {
            if (isChanged) {
                classNames.push('changed');
            }
        }
        return {
            className: classNames.join(' '),
            variable,
            style: { color: variable === null || variable === void 0 ? void 0 : variable.color },
            content: iteratee[arrayOffset].toString(16).padStart(2, '0')
        };
    }
    doHandleTableMouseMove(targetSpan) {
        const target = targetSpan instanceof HTMLElement && targetSpan;
        if (target) {
            const { x, y } = target.getBoundingClientRect();
            const anchor = { x: Math.round(x), y: Math.round(y + target.clientHeight) };
            if (target.classList.contains(MemoryTable.EIGHT_BIT_SPAN_CLASS)) {
                const properties = this.getHoverForChunk(target);
                this.hoverRenderer.render(this.node, anchor, properties);
            }
            else if (target.classList.contains(MemoryTable.VARIABLE_LABEL_CLASS)) {
                const properties = this.getHoverForVariable(target);
                this.hoverRenderer.render(this.node, anchor, properties);
            }
            else {
                this.hoverRenderer.hide();
            }
        }
        else {
            this.hoverRenderer.hide();
        }
    }
    getHoverForChunk(span) {
        var _a;
        if (span.classList.contains(MemoryTable.EIGHT_BIT_SPAN_CLASS)) {
            const parentByteContainer = span.parentElement;
            if (parentByteContainer === null || parentByteContainer === void 0 ? void 0 : parentByteContainer.textContent) {
                const hex = (_a = parentByteContainer.textContent) !== null && _a !== void 0 ? _a : '';
                const decimal = parseInt(hex, 16);
                const binary = this.getPaddedBinary(decimal);
                const UTF8 = String.fromCodePoint(decimal);
                return { hex, binary, decimal, UTF8 };
            }
        }
        return undefined;
    }
    getPaddedBinary(decimal) {
        const paddedBinary = decimal.toString(2).padStart(this.options.byteSize, '0');
        let paddedAndSpacedBinary = '';
        for (let i = 8; i <= paddedBinary.length; i += 8) {
            paddedAndSpacedBinary += ` ${paddedBinary.slice(i - 8, i)}`;
        }
        return paddedAndSpacedBinary.trim();
    }
    getHoverForVariable(span) {
        var _a, _b;
        const variable = (_a = this.variableFinder) === null || _a === void 0 ? void 0 : _a.searchForVariable((_b = span.textContent) !== null && _b !== void 0 ? _b : '');
        if (variable === null || variable === void 0 ? void 0 : variable.type) {
            return { type: variable.type };
        }
        return undefined;
    }
    doHandleTableRightClick(event) {
        var _a;
        event.preventDefault();
        const target = event.target;
        if ((_a = target.classList) === null || _a === void 0 ? void 0 : _a.contains('eight-bits')) {
            const { right, top } = target.getBoundingClientRect();
            this.update();
            event.stopPropagation();
            this.contextMenuRenderer.render({
                menuPath: MemoryTableWidget_1.CONTEXT_MENU,
                anchor: { x: right, y: top },
                args: this.getContextMenuArgs(event),
                context: target
            });
        }
    }
    getContextMenuArgs(event) {
        var _a;
        const args = [this];
        const id = event.target.getAttribute('data-id');
        if (id) {
            const location = (0, util_1.hexStrToUnsignedLong)(id);
            args.push(location);
            const offset = this.memory.address.multiply(-1).add(location);
            const cellAddress = this.memory.address.add(offset.multiply(8 / this.options.byteSize));
            const variableAtLocation = (_a = this.variableFinder) === null || _a === void 0 ? void 0 : _a.searchForVariable(cellAddress);
            args.push(variableAtLocation);
        }
        return args;
    }
};
exports.MemoryTableWidget = MemoryTableWidget;
MemoryTableWidget.CONTEXT_MENU = ['memory.view.context.menu'];
MemoryTableWidget.ID = 'memory-table-widget';
tslib_1.__decorate([
    (0, inversify_1.inject)(theming_1.ThemeService),
    tslib_1.__metadata("design:type", theming_1.ThemeService)
], MemoryTableWidget.prototype, "themeService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(memory_options_widget_1.MemoryOptionsWidget),
    tslib_1.__metadata("design:type", memory_options_widget_1.MemoryOptionsWidget)
], MemoryTableWidget.prototype, "optionsWidget", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(memory_provider_service_1.MemoryProviderService),
    tslib_1.__metadata("design:type", memory_provider_service_1.MemoryProviderService)
], MemoryTableWidget.prototype, "memoryProvider", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(memory_hover_renderer_1.MemoryHoverRendererService),
    tslib_1.__metadata("design:type", memory_hover_renderer_1.MemoryHoverRendererService)
], MemoryTableWidget.prototype, "hoverRenderer", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_1.ContextMenuRenderer),
    tslib_1.__metadata("design:type", browser_1.ContextMenuRenderer)
], MemoryTableWidget.prototype, "contextMenuRenderer", void 0);
tslib_1.__decorate([
    (0, inversify_1.postConstruct)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], MemoryTableWidget.prototype, "init", null);
exports.MemoryTableWidget = MemoryTableWidget = MemoryTableWidget_1 = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], MemoryTableWidget);
//# sourceMappingURL=memory-table-widget.js.map