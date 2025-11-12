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
var MemoryOptionsWidget_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryOptionsWidget = exports.AUTO_UPDATE_TOGGLE_ID = exports.ASCII_TOGGLE_ID = exports.ENDIAN_SELECT_ID = exports.BYTES_PER_GROUP_FIELD_ID = exports.BYTES_PER_ROW_FIELD_ID = exports.LOCATION_OFFSET_FIELD_ID = exports.LENGTH_FIELD_ID = exports.LOCATION_FIELD_ID = exports.EMPTY_MEMORY = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@theia/core");
const browser_1 = require("@theia/core/lib/browser");
const promise_util_1 = require("@theia/core/lib/common/promise-util");
const inversify_1 = require("@theia/core/shared/inversify");
const React = tslib_1.__importStar(require("@theia/core/shared/react"));
const debug_session_1 = require("@theia/debug/lib/browser/debug-session");
const debug_session_manager_1 = require("@theia/debug/lib/browser/debug-session-manager");
const long_1 = tslib_1.__importDefault(require("long"));
const memory_provider_service_1 = require("../memory-provider/memory-provider-service");
const memory_recents_1 = require("../utils/memory-recents");
const memory_widget_components_1 = require("../utils/memory-widget-components");
const memory_widget_utils_1 = require("../utils/memory-widget-utils");
const multi_select_bar_1 = require("../utils/multi-select-bar");
const debounce = require("@theia/core/shared/lodash.debounce");
exports.EMPTY_MEMORY = (0, core_1.deepFreeze)({
    bytes: new Uint8Array(),
    address: new long_1.default(0, 0, true),
});
exports.LOCATION_FIELD_ID = 't-mv-location';
exports.LENGTH_FIELD_ID = 't-mv-length';
exports.LOCATION_OFFSET_FIELD_ID = 't-mv-location-offset';
exports.BYTES_PER_ROW_FIELD_ID = 't-mv-bytesrow';
exports.BYTES_PER_GROUP_FIELD_ID = 't-mv-bytesgroup';
exports.ENDIAN_SELECT_ID = 't-mv-endiannesss';
exports.ASCII_TOGGLE_ID = 't-mv-ascii-toggle';
exports.AUTO_UPDATE_TOGGLE_ID = 't-mv-auto-update-toggle';
let MemoryOptionsWidget = MemoryOptionsWidget_1 = class MemoryOptionsWidget extends browser_1.ReactWidget {
    constructor() {
        super(...arguments);
        this.iconClass = 'memory-view-icon';
        this.lockIconClass = 'memory-lock-icon';
        this.additionalColumnSelectLabel = core_1.nls.localize('theia/memory-inspector/extraColumn', 'Extra Column');
        this.sessionListeners = new core_1.DisposableCollection();
        this.onOptionsChangedEmitter = new core_1.Emitter();
        this.onOptionsChanged = this.onOptionsChangedEmitter.event;
        this.onMemoryChangedEmitter = new core_1.Emitter();
        this.onMemoryChanged = this.onMemoryChangedEmitter.event;
        this.memoryReadResult = exports.EMPTY_MEMORY;
        this.columnsDisplayed = {
            address: {
                label: core_1.nls.localizeByDefault('Address'),
                doRender: true
            },
            data: {
                label: core_1.nls.localize('theia/memory-inspector/data', 'Data'),
                doRender: true
            },
            variables: {
                label: core_1.nls.localizeByDefault('Variables'),
                doRender: true
            },
            ascii: {
                label: core_1.nls.localize('theia/memory-inspector/ascii', 'ASCII'),
                doRender: false
            },
        };
        this.byteSize = 8;
        this.bytesPerGroup = 1;
        this.groupsPerRow = 4;
        this.variables = [];
        this.endianness = memory_widget_utils_1.Interfaces.Endianness.Little;
        this.memoryReadError = core_1.nls.localize('theia/memory-inspector/memory/readError/noContents', 'No memory contents currently available.');
        this.address = 0;
        this.offset = 0;
        this.readLength = 256;
        this.doDisplaySettings = false;
        this.doUpdateAutomatically = true;
        this.showMemoryError = false;
        this.errorTimeout = undefined;
        this.recentLocations = new memory_recents_1.Recents();
        this.showTitleEditIcon = false;
        this.isTitleEditable = false;
        this.handleColumnSelectionChange = (columnLabel, doShow) => this.doHandleColumnSelectionChange(columnLabel, doShow);
        this.toggleAutoUpdate = (e) => {
            var _a;
            if (e.nativeEvent.type === 'click') {
                e.currentTarget.blur();
            }
            if ('key' in e && ((_a = browser_1.KeyCode.createKeyCode(e.nativeEvent).key) === null || _a === void 0 ? void 0 : _a.keyCode) === browser_1.Key.TAB.keyCode) {
                return;
            }
            this.doUpdateAutomatically = !this.doUpdateAutomatically;
            if (this.doUpdateAutomatically) {
                this.title.iconClass = this.iconClass;
            }
            else {
                this.title.iconClass = this.lockIconClass;
            }
            this.fireDidChangeOptions();
        };
        this.onByteSizeChange = (event) => {
            this.byteSize = parseInt(event.target.value);
            this.fireDidChangeOptions(event.target.id);
        };
        this.toggleDoShowSettings = (e) => {
            var _a;
            if (!('key' in e) || ((_a = browser_1.KeyCode.createKeyCode(e.nativeEvent).key) === null || _a === void 0 ? void 0 : _a.keyCode) === browser_1.Key.TAB.keyCode) {
                this.doDisplaySettings = !this.doDisplaySettings;
                this.update();
            }
        };
        this.assignLocationRef = location => {
            this.addressField = location !== null && location !== void 0 ? location : undefined;
        };
        this.assignReadLengthRef = readLength => {
            this.readLengthField = readLength !== null && readLength !== void 0 ? readLength : undefined;
        };
        this.assignOffsetRef = offset => {
            this.offsetField = offset !== null && offset !== void 0 ? offset : undefined;
        };
        this.setAddressFromSelect = (e) => {
            if (this.addressField) {
                this.addressField.value = e.target.value;
            }
        };
        this.activateHeaderInputField = (e) => {
            var _a, _b;
            if (!this.isTitleEditable) {
                const isMouseDown = !('key' in e);
                const isActivationKey = 'key' in e && (((_a = browser_1.KeyCode.createKeyCode(e.nativeEvent).key) === null || _a === void 0 ? void 0 : _a.keyCode) === browser_1.Key.SPACE.keyCode
                    || ((_b = browser_1.KeyCode.createKeyCode(e.nativeEvent).key) === null || _b === void 0 ? void 0 : _b.keyCode) === browser_1.Key.ENTER.keyCode);
                if (isMouseDown || isActivationKey) {
                    if (isMouseDown) {
                        e.currentTarget.blur();
                    }
                    this.isTitleEditable = true;
                    this.update();
                }
            }
        };
        this.saveHeaderInputValue = (e) => {
            const isMouseDown = !('key' in e);
            const isSaveKey = 'key' in e && e.key === 'Enter';
            const isCancelKey = 'key' in e && e.key === 'Escape';
            e.stopPropagation();
            if (isMouseDown || isSaveKey || isCancelKey) {
                this.updateHeader(isCancelKey);
            }
        };
        this.assignHeaderInputRef = (element) => {
            if (element) {
                this.headerInputField = element;
                element.focus();
            }
        };
        this.doShowMemoryErrors = (doClearError = false) => {
            if (this.errorTimeout !== undefined) {
                clearTimeout(this.errorTimeout);
            }
            if (doClearError) {
                this.showMemoryError = false;
                this.update();
                this.errorTimeout = undefined;
                return;
            }
            this.showMemoryError = true;
            this.update();
            this.errorTimeout = setTimeout(() => {
                this.showMemoryError = false;
                this.update();
                this.errorTimeout = undefined;
            }, memory_widget_utils_1.Constants.ERROR_TIMEOUT);
        };
        this.doRefresh = (event) => {
            if ('key' in event && event.key !== 'Enter') {
                return;
            }
            this.updateMemoryView();
        };
        this.updateMemoryView = debounce(this.doUpdateMemoryView.bind(this), memory_widget_utils_1.Constants.DEBOUNCE_TIME, { trailing: true });
        // Callbacks for when the various view parameters change.
        /**
         * Handle bytes per row changed event.
         */
        this.onGroupsPerRowChange = (event) => {
            const { value, id } = event.target;
            this.groupsPerRow = parseInt(value);
            this.fireDidChangeOptions(id);
        };
        /**
         * Handle bytes per group changed event.
         */
        this.onBytesPerGroupChange = (event) => {
            const { value, id } = event.target;
            this.bytesPerGroup = parseInt(value);
            this.fireDidChangeOptions(id);
        };
        /**
         * Handle endianness changed event.
         */
        this.onEndiannessChange = (event) => {
            const { value, id } = event.target;
            if (value !== memory_widget_utils_1.Interfaces.Endianness.Big && value !== memory_widget_utils_1.Interfaces.Endianness.Little) {
                return;
            }
            this.endianness = value;
            this.fireDidChangeOptions(id);
        };
    }
    get memory() {
        return {
            ...this.memoryReadResult,
            variables: this.variables,
        };
    }
    get options() {
        return this.storeState();
    }
    init() {
        this.addClass(MemoryOptionsWidget_1.ID);
        this.title.label = core_1.nls.localize('theia/memory-inspector/memory', 'Memory ({0})', this.memoryWidgetOptions.displayId);
        this.title.caption = core_1.nls.localize('theia/memory-inspector/memory', 'Memory ({0})', this.memoryWidgetOptions.displayId);
        this.title.iconClass = this.iconClass;
        this.title.closable = true;
        if (this.memoryWidgetOptions.dynamic !== false) {
            this.toDispose.push(this.sessionManager.onDidChangeActiveDebugSession(({ current }) => {
                this.setUpListeners(current);
            }));
            this.toDispose.push(this.sessionManager.onDidCreateDebugSession(current => {
                this.setUpListeners(current);
            }));
            this.setUpListeners(this.sessionManager.currentSession);
        }
        this.toDispose.push(this.onOptionsChanged(() => this.update()));
        this.update();
    }
    async setAddressAndGo(newAddress, newOffset, newLength, direction) {
        let doUpdate = false;
        const originalValues = {
            offset: '',
            length: '',
        };
        if (this.addressField) {
            this.addressField.value = newAddress;
            doUpdate = true;
        }
        if (this.offsetField && newOffset !== undefined) {
            originalValues.offset = this.offsetField.value;
            this.offsetField.value = newOffset.toString();
            doUpdate = true;
        }
        if (this.readLengthField && newLength !== undefined) {
            originalValues.length = this.readLengthField.value;
            this.readLengthField.value = newLength.toString();
            doUpdate = true;
        }
        if (doUpdate && this.readLengthField && this.offsetField) {
            this.pinnedMemoryReadResult = new promise_util_1.Deferred();
            this.updateMemoryView();
            const result = await this.pinnedMemoryReadResult.promise;
            if (result === false) {
                // Memory request errored
                this.readLengthField.value = originalValues.length;
                this.offsetField.value = originalValues.offset;
            }
            if (result) {
                // Memory request returned some memory
                const resultLength = result.bytes.length * 8 / this.byteSize;
                const lengthFieldValue = parseInt(this.readLengthField.value);
                if (lengthFieldValue !== resultLength) {
                    this.memoryReadError = core_1.nls.localize('theia/memory-inspector/memory/readError/bounds', 'Memory bounds exceeded, result will be truncated.');
                    this.doShowMemoryErrors();
                    this.readLengthField.value = resultLength.toString();
                    if (direction === 'above') {
                        this.offsetField.value = `${parseInt(originalValues.offset) - (resultLength - parseInt(originalValues.length))}`;
                    }
                    this.update();
                }
            }
        }
        return undefined;
    }
    setUpListeners(session) {
        this.sessionListeners.dispose();
        this.sessionListeners = new core_1.DisposableCollection(core_1.Disposable.create(() => this.handleActiveSessionChange()));
        if (session) {
            this.sessionListeners.push(session.onDidChange(() => this.handleSessionChange()));
        }
    }
    handleActiveSessionChange() {
        const isDynamic = this.memoryWidgetOptions.dynamic !== false;
        if (isDynamic && this.doUpdateAutomatically) {
            this.memoryReadResult = exports.EMPTY_MEMORY;
            this.fireDidChangeMemory();
        }
    }
    handleSessionChange() {
        var _a, _b;
        const isStopped = ((_a = this.sessionManager.currentSession) === null || _a === void 0 ? void 0 : _a.state) === debug_session_1.DebugState.Stopped;
        const isReadyForQuery = !!((_b = this.sessionManager.currentSession) === null || _b === void 0 ? void 0 : _b.currentFrame);
        const isDynamic = this.memoryWidgetOptions.dynamic !== false;
        if (isStopped && isReadyForQuery && isDynamic && this.doUpdateAutomatically && this.memoryReadResult !== exports.EMPTY_MEMORY) {
            this.updateMemoryView();
        }
    }
    onActivateRequest(msg) {
        super.onActivateRequest(msg);
        this.acceptFocus();
    }
    acceptFocus() {
        if (this.doUpdateAutomatically) {
            if (this.addressField) {
                this.addressField.focus();
                this.addressField.select();
            }
        }
        else {
            const settingsCog = this.node.querySelector('.toggle-settings-click-zone');
            settingsCog === null || settingsCog === void 0 ? void 0 : settingsCog.focus();
        }
    }
    doHandleColumnSelectionChange(columnLabel, doShow) {
        if (columnLabel in this.columnsDisplayed) {
            this.columnsDisplayed[columnLabel].doRender = doShow;
            this.fireDidChangeOptions(exports.ASCII_TOGGLE_ID);
        }
    }
    onAfterAttach(msg) {
        super.onAfterAttach(msg);
        if (this.memoryWidgetOptions.dynamic !== false) {
            if (this.addressField) {
                this.addressField.value = this.address.toString();
            }
        }
    }
    render() {
        return (React.createElement("div", { className: 't-mv-container' }, this.renderInputContainer()));
    }
    renderInputContainer() {
        return (React.createElement("div", { className: 't-mv-settings-container' },
            React.createElement("div", { className: 't-mv-wrapper' },
                this.renderToolbar(),
                this.renderMemoryLocationGroup(),
                this.doDisplaySettings && (React.createElement("div", { className: 't-mv-toggle-settings-wrapper' }, this.renderByteDisplayGroup())))));
    }
    renderByteDisplayGroup() {
        return (React.createElement("div", { className: 't-mv-group settings-group' },
            React.createElement(memory_widget_components_1.MWSelect, { id: 'byte-size-select', label: core_1.nls.localize('theia/memory-inspector/byteSize', 'Byte Size'), value: this.byteSize.toString(), onChange: this.onByteSizeChange, options: ['8', '16', '32', '64'] }),
            React.createElement(memory_widget_components_1.MWSelect, { id: exports.BYTES_PER_GROUP_FIELD_ID, label: core_1.nls.localize('theia/memory-inspector/bytesPerGroup', 'Bytes Per Group'), value: this.bytesPerGroup.toString(), onChange: this.onBytesPerGroupChange, options: ['1', '2', '4', '8', '16'] }),
            React.createElement(memory_widget_components_1.MWSelect, { id: exports.BYTES_PER_ROW_FIELD_ID, label: core_1.nls.localize('theia/memory-inspector/groupsPerRow', 'Groups Per Row'), value: this.groupsPerRow.toString(), onChange: this.onGroupsPerRowChange, options: ['1', '2', '4', '8', '16', '32'] }),
            React.createElement(memory_widget_components_1.MWSelect, { id: exports.ENDIAN_SELECT_ID, label: core_1.nls.localize('theia/memory-inspector/endianness', 'Endianness'), value: this.endianness, onChange: this.onEndiannessChange, options: [memory_widget_utils_1.Interfaces.Endianness.Little, memory_widget_utils_1.Interfaces.Endianness.Big] }),
            React.createElement(multi_select_bar_1.MWMultiSelect, { id: exports.ASCII_TOGGLE_ID, label: core_1.nls.localize('theia/memory-inspector/columns', 'Columns'), items: this.getOptionalColumns(), onSelectionChanged: this.handleColumnSelectionChange })));
    }
    getObligatoryColumnIds() {
        return ['address', 'data'];
    }
    getOptionalColumns() {
        const obligatoryColumns = new Set(this.getObligatoryColumnIds());
        return Object.entries(this.columnsDisplayed)
            .reduce((accumulated, [id, { doRender, label }]) => {
            if (!obligatoryColumns.has(id)) {
                accumulated.push({ id, label, defaultChecked: doRender });
            }
            return accumulated;
        }, []);
    }
    renderMemoryLocationGroup() {
        return (React.createElement(React.Fragment, null,
            React.createElement("div", { className: 't-mv-group view-group' },
                React.createElement(memory_widget_components_1.MWInputWithSelect, { id: exports.LOCATION_FIELD_ID, label: core_1.nls.localizeByDefault('Address'), title: core_1.nls.localize('theia/memory-inspector/addressTooltip', 'Memory location to display, an address or expression evaluating to an address'), defaultValue: `${this.address}`, onSelectChange: this.setAddressFromSelect, passRef: this.assignLocationRef, onKeyDown: this.doRefresh, options: [...this.recentLocations.values], disabled: !this.doUpdateAutomatically }),
                React.createElement(memory_widget_components_1.MWInput, { id: exports.LOCATION_OFFSET_FIELD_ID, label: core_1.nls.localize('theia/memory-inspector/offset', 'Offset'), title: core_1.nls.localize('theia/memory-inspector/offsetTooltip', 'Offset to be added to the current memory location, when navigating'), defaultValue: '0', passRef: this.assignOffsetRef, onKeyDown: this.doRefresh, disabled: !this.doUpdateAutomatically }),
                React.createElement(memory_widget_components_1.MWInput, { id: exports.LENGTH_FIELD_ID, label: core_1.nls.localize('theia/memory-inspector/length', 'Length'), title: core_1.nls.localize('theia/memory-inspector/lengthTooltip', 'Number of bytes to fetch, in decimal or hexadecimal'), defaultValue: this.readLength.toString(), passRef: this.assignReadLengthRef, onChange: memory_widget_utils_1.Utils.validateNumericalInputs, onKeyDown: this.doRefresh, disabled: !this.doUpdateAutomatically }),
                React.createElement("button", { type: 'button', className: 'theia-button main view-group-go-button', onClick: this.doRefresh, disabled: !this.doUpdateAutomatically, title: core_1.nls.localizeByDefault('Go') }, core_1.nls.localizeByDefault('Go'))),
            React.createElement("div", { className: `t-mv-memory-fetch-error${this.showMemoryError ? ' show' : ' hide'}` }, this.memoryReadError)));
    }
    updateHeader(isCancelKey) {
        if (!isCancelKey && this.headerInputField) {
            this.title.label = this.headerInputField.value;
            this.title.caption = this.headerInputField.value;
        }
        this.isTitleEditable = false;
        this.update();
    }
    renderToolbar() {
        return (React.createElement("div", { className: 'memory-widget-toolbar' },
            this.renderLockIcon(),
            this.renderEditableTitleField(),
            this.renderSettingsContainer()));
    }
    renderSettingsContainer() {
        return React.createElement("div", { className: 'toggle-settings-container' },
            React.createElement("div", { className: 'toggle-settings-click-zone no-select', tabIndex: 0, "aria-label": this.doDisplaySettings ?
                    core_1.nls.localize('theia/memory-inspector/memory/hideSettings', 'Hide Settings Panel') :
                    core_1.nls.localize('theia/memory-inspector/memory/showSettings', 'Show Settings Panel'), role: 'button', onClick: this.toggleDoShowSettings, onKeyDown: this.toggleDoShowSettings, title: this.doDisplaySettings ?
                    core_1.nls.localize('theia/memory-inspector/memory/hideSettings', 'Hide Settings Panel') :
                    core_1.nls.localize('theia/memory-inspector/memory/showSettings', 'Show Settings Panel') },
                React.createElement("i", { className: 'codicon codicon-settings-gear' }),
                React.createElement("span", null, this.doDisplaySettings ?
                    core_1.nls.localize('theia/memory-inspector/closeSettings', 'Close Settings') :
                    core_1.nls.localizeByDefault('Settings'))));
    }
    renderLockIcon() {
        return this.memoryWidgetOptions.dynamic !== false && (React.createElement("div", { className: 'memory-widget-auto-updates-container' },
            React.createElement("div", { className: `fa fa-${this.doUpdateAutomatically ? 'unlock' : 'lock'}`, id: exports.AUTO_UPDATE_TOGGLE_ID, title: this.doUpdateAutomatically ?
                    core_1.nls.localize('theia/memory-inspector/memory/freeze', 'Freeze Memory View') :
                    core_1.nls.localize('theia/memory-inspector/memory/unfreeze', 'Unfreeze Memory View'), onClick: this.toggleAutoUpdate, onKeyDown: this.toggleAutoUpdate, role: 'button', tabIndex: 0 })));
    }
    renderEditableTitleField() {
        return (React.createElement("div", { className: 'memory-widget-header-click-zone', tabIndex: 0, onClick: this.activateHeaderInputField, onKeyDown: this.activateHeaderInputField, role: 'button' },
            !this.isTitleEditable
                ? (React.createElement("h2", { className: `${MemoryOptionsWidget_1.WIDGET_H2_CLASS}${!this.doUpdateAutomatically ? ' disabled' : ''} no-select` }, this.title.label))
                : React.createElement("input", { className: 'theia-input', type: 'text', defaultValue: this.title.label, onKeyDown: this.saveHeaderInputValue, spellCheck: false, ref: this.assignHeaderInputRef }),
            !this.isTitleEditable && (React.createElement("div", { className: `fa fa-pencil${this.showTitleEditIcon ? ' show' : ' hide'}` })),
            this.isTitleEditable && (React.createElement("div", { className: 'fa fa-save', onClick: this.saveHeaderInputValue, onKeyDown: this.saveHeaderInputValue, role: 'button', tabIndex: 0, title: core_1.nls.localizeByDefault('Save') }))));
    }
    storeState() {
        var _a, _b, _c, _d, _e, _f;
        return {
            address: (_b = (_a = this.addressField) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : this.address,
            offset: (_d = parseInt(`${(_c = this.offsetField) === null || _c === void 0 ? void 0 : _c.value}`)) !== null && _d !== void 0 ? _d : this.offset,
            length: (_f = parseInt(`${(_e = this.readLengthField) === null || _e === void 0 ? void 0 : _e.value}`)) !== null && _f !== void 0 ? _f : this.readLength,
            byteSize: this.byteSize,
            bytesPerGroup: this.bytesPerGroup,
            groupsPerRow: this.groupsPerRow,
            endianness: this.endianness,
            doDisplaySettings: this.doDisplaySettings,
            columnsDisplayed: this.columnsDisplayed,
            recentLocationsArray: this.recentLocations.values,
            isFrozen: !this.doUpdateAutomatically,
            doUpdateAutomatically: this.doUpdateAutomatically,
        };
    }
    restoreState(oldState) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        this.address = (_a = oldState.address) !== null && _a !== void 0 ? _a : this.address;
        this.offset = (_b = oldState.offset) !== null && _b !== void 0 ? _b : this.offset;
        this.readLength = (_c = oldState.length) !== null && _c !== void 0 ? _c : this.readLength;
        this.byteSize = (_d = oldState.byteSize) !== null && _d !== void 0 ? _d : this.byteSize;
        this.bytesPerGroup = (_e = oldState.bytesPerGroup) !== null && _e !== void 0 ? _e : this.bytesPerGroup;
        this.groupsPerRow = (_f = oldState.groupsPerRow) !== null && _f !== void 0 ? _f : this.groupsPerRow;
        this.endianness = (_g = oldState.endianness) !== null && _g !== void 0 ? _g : this.endianness;
        this.recentLocations = (_h = new memory_recents_1.Recents(oldState.recentLocationsArray)) !== null && _h !== void 0 ? _h : this.recentLocations;
        this.doDisplaySettings = !!oldState.doDisplaySettings;
        if (oldState.columnsDisplayed) {
            this.columnsDisplayed = oldState.columnsDisplayed;
        }
    }
    fetchNewMemory() {
        this.updateMemoryView();
    }
    async doUpdateMemoryView() {
        var _a, _b;
        if (!(this.addressField && this.readLengthField)) {
            return;
        }
        if (((_a = this.addressField) === null || _a === void 0 ? void 0 : _a.value.trim().length) === 0) {
            this.memoryReadError = core_1.nls.localize('theia/memory-inspector/memory/addressField/memoryReadError', 'Enter an address or expression in the Location field.');
            this.doShowMemoryErrors();
            return;
        }
        if (this.readLengthField.value.trim().length === 0) {
            this.memoryReadError = core_1.nls.localize('theia/memory-inspector/memory/readLength/memoryReadError', 'Enter a length (decimal or hexadecimal number) in the Length field.');
            this.doShowMemoryErrors();
            return;
        }
        const startAddress = this.addressField.value;
        const locationOffset = parseInt(`${(_b = this.offsetField) === null || _b === void 0 ? void 0 : _b.value}`) || 0;
        const readLength = parseInt(this.readLengthField.value);
        try {
            this.memoryReadResult = await this.getMemory(startAddress, readLength, locationOffset);
            this.fireDidChangeMemory();
            if (this.pinnedMemoryReadResult) {
                this.pinnedMemoryReadResult.resolve(this.memoryReadResult);
            }
            this.doShowMemoryErrors(true);
        }
        catch (err) {
            this.memoryReadError = this.getUserError(err);
            console.error('Failed to read memory', err);
            this.doShowMemoryErrors();
            if (this.pinnedMemoryReadResult) {
                this.pinnedMemoryReadResult.resolve(this.memoryReadResult);
            }
        }
        finally {
            this.pinnedMemoryReadResult = undefined;
            this.update();
        }
    }
    getUserError(err) {
        return err instanceof Error ? err.message : core_1.nls.localize('theia/memory-inspector/memory/userError', 'There was an error fetching memory.');
    }
    async getMemory(memoryReference, count, offset) {
        const result = await this.retrieveMemory(memoryReference, count, offset);
        try {
            this.variables = await this.memoryProvider.getLocals();
        }
        catch {
            this.variables = [];
        }
        this.recentLocations.add(memoryReference);
        this.updateDefaults(memoryReference, count, offset);
        return result;
    }
    async retrieveMemory(memoryReference, count, offset) {
        return this.memoryProvider.readMemory({ memoryReference, count, offset });
    }
    // TODO: This may not be necessary if we change how state is stored (currently in the text fields themselves.)
    updateDefaults(address, readLength, offset) {
        this.address = address;
        this.readLength = readLength;
        this.offset = offset;
    }
    fireDidChangeOptions(targetId) {
        this.onOptionsChangedEmitter.fire(targetId);
    }
    fireDidChangeMemory() {
        this.onMemoryChangedEmitter.fire(this.memoryReadResult);
    }
};
exports.MemoryOptionsWidget = MemoryOptionsWidget;
MemoryOptionsWidget.ID = 'memory-view-options-widget';
MemoryOptionsWidget.LABEL = core_1.nls.localize('theia/memory-inspector/memoryTitle', 'Memory');
MemoryOptionsWidget.WIDGET_H2_CLASS = 'memory-widget-header';
MemoryOptionsWidget.WIDGET_HEADER_INPUT_CLASS = 'memory-widget-header-input';
tslib_1.__decorate([
    (0, inversify_1.inject)(memory_provider_service_1.MemoryProviderService),
    tslib_1.__metadata("design:type", memory_provider_service_1.MemoryProviderService)
], MemoryOptionsWidget.prototype, "memoryProvider", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(debug_session_manager_1.DebugSessionManager),
    tslib_1.__metadata("design:type", debug_session_manager_1.DebugSessionManager)
], MemoryOptionsWidget.prototype, "sessionManager", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(memory_widget_utils_1.MemoryWidgetOptions),
    tslib_1.__metadata("design:type", Object)
], MemoryOptionsWidget.prototype, "memoryWidgetOptions", void 0);
tslib_1.__decorate([
    (0, inversify_1.postConstruct)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], MemoryOptionsWidget.prototype, "init", null);
exports.MemoryOptionsWidget = MemoryOptionsWidget = MemoryOptionsWidget_1 = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], MemoryOptionsWidget);
//# sourceMappingURL=memory-options-widget.js.map