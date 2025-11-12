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
exports.MemoryEditableTableWidget = exports.EditableMemoryWidget = void 0;
const tslib_1 = require("tslib");
const browser_1 = require("@theia/core/lib/browser");
const promise_util_1 = require("@theia/core/lib/common/promise-util");
const inversify_1 = require("@theia/core/shared/inversify");
const React = tslib_1.__importStar(require("@theia/core/shared/react"));
const long_1 = tslib_1.__importDefault(require("long"));
const util_1 = require("../../common/util");
const memory_table_widget_1 = require("../memory-widget/memory-table-widget");
const memory_widget_utils_1 = require("../utils/memory-widget-utils");
const nls_1 = require("@theia/core/lib/common/nls");
var EditableMemoryWidget;
(function (EditableMemoryWidget) {
    EditableMemoryWidget.ID = 'editable.memory.widget';
})(EditableMemoryWidget || (exports.EditableMemoryWidget = EditableMemoryWidget = {}));
let MemoryEditableTableWidget = class MemoryEditableTableWidget extends memory_table_widget_1.MemoryTableWidget {
    constructor() {
        super(...arguments);
        this.pendingMemoryEdits = new Map();
        this.memoryEditsCompleted = new promise_util_1.Deferred();
        this.highlightedField = long_1.default.fromInt(-1);
        this.doShowMoreMemoryBefore = false;
        this.doShowMoreMemoryAfter = false;
        this.handleClearEditClick = () => this.clearEdits();
        this.submitMemoryEdits = async () => {
            this.memoryEditsCompleted = new promise_util_1.Deferred();
            let didUpdateMemory = false;
            for (const [key, edit] of this.createUniqueEdits()) {
                try {
                    await this.doWriteMemory(edit);
                    didUpdateMemory = true;
                    this.pendingMemoryEdits.delete(key);
                }
                catch (e) {
                    console.warn('Problem writing memory with arguments', edit, '\n', e);
                    const text = e instanceof Error ? e.message : 'Unknown error';
                    this.showWriteError(key, text);
                    break;
                }
            }
            this.memoryEditsCompleted.resolve();
            if (didUpdateMemory) {
                this.optionsWidget.fetchNewMemory();
            }
        };
        this.handleTableClick = (event) => {
            var _a, _b;
            const target = event.target;
            if ((_a = target.classList) === null || _a === void 0 ? void 0 : _a.contains('eight-bits')) {
                this.highlightedField = (0, util_1.hexStrToUnsignedLong)((_b = target.getAttribute('data-id')) !== null && _b !== void 0 ? _b : '-0x1');
                this.update();
                event.stopPropagation();
            }
        };
        this.handleTableInput = (event) => {
            var _a, _b;
            if (this.highlightedField.lessThan(0)) {
                return;
            }
            const keyCode = (_a = browser_1.KeyCode.createKeyCode(event.nativeEvent).key) === null || _a === void 0 ? void 0 : _a.keyCode;
            const initialHighlight = this.highlightedField;
            const initialHighlightIndex = initialHighlight.subtract(this.memory.address);
            if (keyCode === browser_1.Key.TAB.keyCode) {
                return;
            }
            const arrayElementsPerRow = (this.options.byteSize / 8) * this.options.bytesPerGroup * this.options.groupsPerRow;
            const isAlreadyEdited = this.pendingMemoryEdits.has(this.highlightedField.toString());
            const oldValue = (_b = this.pendingMemoryEdits.get(initialHighlight.toString())) !== null && _b !== void 0 ? _b : this.memory.bytes[initialHighlightIndex.toInt()].toString(16).padStart(2, '0');
            let possibleNewHighlight = new long_1.default(-1);
            let newValue = oldValue;
            switch (keyCode) {
                case browser_1.Key.ARROW_DOWN.keyCode:
                    possibleNewHighlight = initialHighlight.add(arrayElementsPerRow);
                    event.preventDefault();
                    event.stopPropagation();
                    break;
                case browser_1.Key.ARROW_UP.keyCode:
                    possibleNewHighlight = initialHighlight.greaterThan(arrayElementsPerRow) ? initialHighlight.subtract(arrayElementsPerRow) : possibleNewHighlight;
                    event.preventDefault();
                    event.stopPropagation();
                    break;
                case browser_1.Key.ARROW_RIGHT.keyCode:
                    possibleNewHighlight = initialHighlight.add(1);
                    event.preventDefault();
                    event.stopPropagation();
                    break;
                case browser_1.Key.ARROW_LEFT.keyCode:
                    possibleNewHighlight = initialHighlight.greaterThan(0) ? initialHighlight.subtract(1) : possibleNewHighlight;
                    break;
                case browser_1.Key.BACKSPACE.keyCode:
                    newValue = oldValue.slice(0, oldValue.length - 1);
                    break;
                case browser_1.Key.DELETE.keyCode:
                    newValue = '';
                    break;
                case browser_1.Key.ENTER.keyCode:
                    this.submitMemoryEdits();
                    break;
                case browser_1.Key.ESCAPE.keyCode:
                    if (isAlreadyEdited) {
                        this.clearEdits(this.highlightedField);
                    }
                    else {
                        this.clearEdits();
                    }
                    break;
                default: {
                    const keyValue = parseInt(browser_1.KeyCode.createKeyCode(event.nativeEvent).toString(), 16);
                    if (!Number.isNaN(keyValue)) {
                        newValue = isAlreadyEdited ? oldValue : '';
                        if (newValue.length < 2) {
                            newValue += keyValue.toString(16);
                        }
                    }
                }
            }
            if (this.isInBounds(possibleNewHighlight)) {
                this.highlightedField = possibleNewHighlight;
            }
            const valueWasChanged = newValue !== oldValue;
            if (valueWasChanged) {
                this.pendingMemoryEdits.set(this.highlightedField.toString(), newValue);
            }
            if (valueWasChanged || !this.highlightedField.equals(initialHighlight)) {
                this.update();
            }
        };
    }
    async doInit() {
        this.memoryEditsCompleted.resolve();
        await super.doInit();
        this.addClass('editable');
    }
    resetModifiedValue(valueAddress) {
        const didChange = this.pendingMemoryEdits.delete(valueAddress.toString());
        if (didChange) {
            this.update();
        }
    }
    getState() {
        super.getState();
        if (!this.isInBounds(this.highlightedField)) {
            this.highlightedField = this.memory.address;
        }
    }
    async handleMemoryChange(newMemory) {
        await this.memoryEditsCompleted.promise;
        if (newMemory.bytes.length === 0) {
            this.pendingMemoryEdits.clear();
        }
        super.handleMemoryChange(newMemory);
    }
    areSameRegion(a, b) {
        return b !== undefined && a.address.equals(b.address) && a.bytes.length === b.bytes.length;
    }
    getTableFooter() {
        var _a, _b;
        const showButtons = !!this.pendingMemoryEdits.size && !this.writeErrorInfo;
        return ((showButtons || this.writeErrorInfo) && (React.createElement("div", { className: 'memory-edit-button-container' },
            showButtons && React.createElement("button", { className: 'theia-button secondary', onClick: this.handleClearEditClick, type: 'reset', title: nls_1.nls.localize('theia/memory-inspector/editable/clear', 'Clear Changes') }, nls_1.nls.localize('theia/memory-inspector/editable/clear', 'Clear Changes')),
            showButtons && React.createElement("button", { className: 'theia-button main', onClick: this.submitMemoryEdits, type: 'submit', title: nls_1.nls.localize('theia/memory-inspector/editable/apply', 'Apply Changes') }, nls_1.nls.localize('theia/memory-inspector/editable/apply', 'Apply Changes')),
            !!this.writeErrorInfo && React.createElement("div", { className: 'memory-edit-error' },
                React.createElement("div", { className: 'memory-edit-error-location' }, `Error writing to 0x${long_1.default.fromString((_a = this.writeErrorInfo) === null || _a === void 0 ? void 0 : _a.location).toString(16)}`),
                React.createElement("div", { className: 'memory-edit-error-details' }, (_b = this.writeErrorInfo) === null || _b === void 0 ? void 0 : _b.error)))));
    }
    getBitAttributes(arrayOffset, iteratee) {
        var _a, _b, _c;
        const attributes = super.getBitAttributes(arrayOffset, iteratee);
        const classNames = (_b = (_a = attributes.className) === null || _a === void 0 ? void 0 : _a.split(' ')) !== null && _b !== void 0 ? _b : [];
        const itemID = this.memory.address.add(arrayOffset);
        const isHighlight = itemID.equals(this.highlightedField);
        const isEditPending = this.pendingMemoryEdits.has(itemID.toString());
        const padder = isHighlight && isEditPending ? '\xa0' : '0'; // non-breaking space so it doesn't look like plain whitespace.
        const stringValue = ((_c = this.pendingMemoryEdits.get(itemID.toString())) !== null && _c !== void 0 ? _c : this.memory.bytes[arrayOffset].toString(16)).padStart(2, padder);
        if (!this.options.isFrozen) {
            if (isHighlight) {
                classNames.push('highlight');
            }
            if (isEditPending) {
                classNames.push('modified');
            }
        }
        return {
            ...attributes,
            className: classNames.join(' '),
            content: stringValue
        };
    }
    getHoverForChunk(span) {
        const addressAsString = span.getAttribute('data-id');
        if (addressAsString) {
            const address = (0, util_1.hexStrToUnsignedLong)(addressAsString);
            const { value } = this.composeByte(address, true);
            const { value: inMemory } = this.composeByte(address, false);
            const oldValue = this.previousBytes && this.composeByte(address, false, this.previousBytes).value;
            const decimal = parseInt(value, 16);
            const octal = decimal.toString(8).padStart(this.options.byteSize / 8, '0');
            const UTF8 = String.fromCharCode(decimal);
            const binary = this.getPaddedBinary(decimal);
            const toSend = { hex: value, octal, binary, decimal };
            if (UTF8) {
                toSend.UTF8 = UTF8;
            }
            if (inMemory !== value) {
                toSend['Current Value'] = inMemory;
            }
            if (oldValue !== undefined && oldValue !== value) {
                toSend['Previous Value'] = oldValue;
            }
            return toSend;
        }
        return undefined;
    }
    composeByte(addressPlusArrayOffset, usePendingEdits, dataSource = this.memory.bytes) {
        let value = '';
        const offset = addressPlusArrayOffset.subtract(this.memory.address);
        const chunksPerByte = this.options.byteSize / 8;
        const startingChunkIndex = offset.subtract(offset.modulo(chunksPerByte));
        const address = this.memory.address.add(startingChunkIndex.divide(chunksPerByte));
        for (let i = 0; i < chunksPerByte; i += 1) {
            const targetOffset = startingChunkIndex.add(i);
            const targetChunk = this.getFromMapOrArray(targetOffset, usePendingEdits, dataSource);
            value += targetChunk.padStart(2, '0');
        }
        return { address, value };
    }
    getFromMapOrArray(arrayOffset, usePendingEdits, dataSource = this.memory.bytes) {
        var _a, _b;
        let value = usePendingEdits ? this.pendingMemoryEdits.get(arrayOffset.add(this.memory.address).toString()) : undefined;
        if (value === undefined) {
            value = (_b = (_a = dataSource[arrayOffset.toInt()]) === null || _a === void 0 ? void 0 : _a.toString(16)) !== null && _b !== void 0 ? _b : '';
        }
        return value;
    }
    clearEdits(address) {
        if (typeof address === 'number') {
            this.pendingMemoryEdits.delete(address);
        }
        else {
            this.pendingMemoryEdits.clear();
        }
        this.update();
    }
    createUniqueEdits() {
        const addressesSubmitted = new Set();
        const edits = [];
        for (const k of this.pendingMemoryEdits.keys()) {
            const address = long_1.default.fromString(k);
            const { address: addressToSend, value: valueToSend } = this.composeByte(address, true);
            const memoryReference = '0x' + addressToSend.toString(16);
            if (!addressesSubmitted.has(memoryReference)) {
                const data = Buffer.from(valueToSend, 'hex').toString('base64');
                edits.push([k, { memoryReference, data }]);
                addressesSubmitted.add(memoryReference);
            }
        }
        return edits;
    }
    doWriteMemory(writeMemoryArgs) {
        return this.memoryProvider.writeMemory(writeMemoryArgs);
    }
    showWriteError(location, error) {
        if (this.currentErrorTimeout !== undefined) {
            clearTimeout(this.currentErrorTimeout);
        }
        this.writeErrorInfo = { location, error };
        this.update();
        this.currentErrorTimeout = window.setTimeout(() => this.hideWriteError(), memory_widget_utils_1.Constants.ERROR_TIMEOUT);
    }
    hideWriteError() {
        this.currentErrorTimeout = undefined;
        this.writeErrorInfo = undefined;
        this.update();
    }
    getWrapperHandlers() {
        return this.options.isFrozen
            ? super.getWrapperHandlers()
            : {
                onClick: this.handleTableClick,
                onContextMenu: this.handleTableRightClick,
                onKeyDown: this.handleTableInput,
                onMouseMove: this.handleTableMouseMove,
            };
    }
    doHandleTableRightClick(event) {
        var _a, _b;
        const target = event.target;
        if ((_a = target.classList) === null || _a === void 0 ? void 0 : _a.contains('eight-bits')) {
            this.highlightedField = (0, util_1.hexStrToUnsignedLong)((_b = target.getAttribute('data-id')) !== null && _b !== void 0 ? _b : '-0x1');
        }
        super.doHandleTableRightClick(event);
    }
    isInBounds(candidateAddress) {
        const { address, bytes } = this.memory;
        return candidateAddress.greaterThanOrEqual(address) &&
            candidateAddress.lessThan(address.add(bytes.length));
    }
};
exports.MemoryEditableTableWidget = MemoryEditableTableWidget;
exports.MemoryEditableTableWidget = MemoryEditableTableWidget = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], MemoryEditableTableWidget);
//# sourceMappingURL=memory-editable-table-widget.js.map