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
exports.RegisterOptionsWidget = exports.REGISTER_PRE_SETS_ID = exports.REGISTER_RADIX_ID = exports.REGISTER_FIELD_ID = exports.EMPTY_REGISTERS = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@theia/core");
const inversify_1 = require("@theia/core/shared/inversify");
const React = tslib_1.__importStar(require("@theia/core/shared/react"));
const debug_session_1 = require("@theia/debug/lib/browser/debug-session");
const memory_options_widget_1 = require("../memory-widget/memory-options-widget");
const memory_widget_components_1 = require("../utils/memory-widget-components");
const memory_widget_utils_1 = require("../utils/memory-widget-utils");
const memory_widget_variable_utils_1 = require("../utils/memory-widget-variable-utils");
const multi_select_bar_1 = require("../utils/multi-select-bar");
const register_filter_service_1 = require("./register-filter-service");
const debounce = require("@theia/core/shared/lodash.debounce");
exports.EMPTY_REGISTERS = {
    threadId: undefined,
    registers: [],
};
exports.REGISTER_FIELD_ID = 't-mv-register';
exports.REGISTER_RADIX_ID = 't-mv-radix';
exports.REGISTER_PRE_SETS_ID = 't-mv-pre-set';
let RegisterOptionsWidget = class RegisterOptionsWidget extends memory_options_widget_1.MemoryOptionsWidget {
    constructor() {
        super(...arguments);
        this.iconClass = 'register-view-icon';
        this.lockIconClass = 'register-lock-icon';
        this.LABEL_PREFIX = core_1.nls.localize('theia/memory-inspector/register', 'Register');
        this.onRegisterChangedEmitter = new core_1.Emitter();
        this.onRegisterChanged = this.onRegisterChangedEmitter.event;
        this.registerReadResult = exports.EMPTY_REGISTERS;
        this.registerDisplaySet = new Set();
        this.registerDisplayAll = true;
        this.registerFilterUpdate = false;
        this.registerReadError = core_1.nls.localize('theia/memory-inspector/register/readError', 'No Registers currently available.');
        this.showRegisterError = false;
        this.noRadixColumnDisplayed = this.noRadixDisplayed();
        this.columnsDisplayed = {
            register: {
                label: core_1.nls.localize('theia/memory-inspector/register', 'Register'),
                doRender: true
            },
            hexadecimal: {
                label: core_1.nls.localize('theia/memory-inspector/hexadecimal', 'Hexadecimal'),
                doRender: true
            },
            decimal: {
                label: core_1.nls.localize('theia/memory-inspector/decimal', 'Decimal'),
                doRender: false
            },
            octal: {
                label: core_1.nls.localize('theia/memory-inspector/octal', 'Octal'),
                doRender: false
            },
            binary: {
                label: core_1.nls.localize('theia/memory-inspector/binary', 'Binary'),
                doRender: false
            },
        };
        this.assignRegisterRef = reg => {
            this.registerField = reg !== null && reg !== void 0 ? reg : undefined;
        };
        this.setRegFilterFromSelect = (e) => {
            if (this.registerField) {
                this.registerField.value = e.target.value;
            }
        };
        this.updateRegisterView = debounce(this.doUpdateRegisterView.bind(this), memory_widget_utils_1.Constants.DEBOUNCE_TIME, { trailing: true });
        this.doRefresh = (event) => {
            if ('key' in event && event.key !== 'Enter') {
                return;
            }
            this.registerFilterUpdate = true;
            this.updateRegisterView();
        };
        this.doShowRegisterErrors = (doClearError = false) => {
            if (this.errorTimeout !== undefined) {
                clearTimeout(this.errorTimeout);
            }
            if (doClearError) {
                this.showRegisterError = false;
                this.update();
                this.errorTimeout = undefined;
                return;
            }
            this.showRegisterError = true;
            this.update();
            this.errorTimeout = setTimeout(() => {
                this.showRegisterError = false;
                this.update();
                this.errorTimeout = undefined;
            }, memory_widget_utils_1.Constants.ERROR_TIMEOUT);
        };
    }
    get registers() {
        return {
            ...this.registerReadResult,
        };
    }
    get options() {
        return this.storeState();
    }
    displayReg(element) {
        return this.registerDisplayAll ||
            this.registerDisplaySet.has(element);
    }
    handleRadixRendering(regVal, radix, _regName) {
        // check if too big for integer
        const bInt = BigInt(regVal);
        return bInt.toString(radix);
    }
    init() {
        this.addClass(memory_options_widget_1.MemoryOptionsWidget.ID);
        this.addClass('reg-options-widget');
        this.title.label = `${this.LABEL_PREFIX} (${this.memoryWidgetOptions.identifier})`;
        this.title.caption = `${this.LABEL_PREFIX} (${this.memoryWidgetOptions.identifier})`;
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
    setRegAndUpdate(regName) {
        this.handleRegFromDebugWidgetSelection(regName);
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
            this.registerReadResult = exports.EMPTY_REGISTERS;
            this.fireDidChangeRegister();
        }
    }
    handleSessionChange() {
        var _a, _b;
        const debugState = (_a = this.sessionManager.currentSession) === null || _a === void 0 ? void 0 : _a.state;
        if (debugState === debug_session_1.DebugState.Inactive) {
            this.registerReadResult = exports.EMPTY_REGISTERS;
            this.fireDidChangeRegister();
        }
        else if (debugState === debug_session_1.DebugState.Stopped) {
            const isReadyForQuery = !!((_b = this.sessionManager.currentSession) === null || _b === void 0 ? void 0 : _b.currentFrame);
            const isDynamic = this.memoryWidgetOptions.dynamic !== false;
            if (isReadyForQuery && isDynamic && this.doUpdateAutomatically && this.registerReadResult !== exports.EMPTY_REGISTERS) {
                this.updateRegisterView();
            }
        }
    }
    acceptFocus() {
        if (this.doUpdateAutomatically) {
            if (this.registerField) {
                this.registerField.focus();
                this.registerField.select();
            }
        }
        else {
            const multiSelectBar = this.node.querySelector('.multi-select-bar');
            multiSelectBar === null || multiSelectBar === void 0 ? void 0 : multiSelectBar.focus();
        }
    }
    radixDisplayed() {
        const { register, ...radices } = this.columnsDisplayed;
        for (const val of Object.values(radices)) {
            if (val['doRender']) {
                return true;
            }
        }
        return false;
    }
    noRadixDisplayed() {
        return !this.radixDisplayed();
    }
    renderRegisterFieldGroup() {
        return (React.createElement(React.Fragment, null,
            React.createElement("div", { className: 't-mv-group view-group' },
                React.createElement(memory_widget_components_1.MWInputWithSelect, { id: exports.REGISTER_FIELD_ID, label: core_1.nls.localize('theia/memory-inspector/registers', 'Registers'), placeholder: core_1.nls.localize('theia/memory-inspector/register-widget/filter-placeholder', 'Filter (starts with)'), onSelectChange: this.setRegFilterFromSelect, passRef: this.assignRegisterRef, onKeyDown: this.doRefresh, options: [...this.recentLocations.values], disabled: !this.doUpdateAutomatically }),
                React.createElement(multi_select_bar_1.MWMultiSelect, { id: memory_options_widget_1.ASCII_TOGGLE_ID, label: core_1.nls.localize('theia/memory-inspector/columns', 'Columns'), items: this.getOptionalColumns().map(column => ({ ...column, label: column.label.slice(0, 3) })), onSelectionChanged: this.handleColumnSelectionChange }),
                React.createElement("button", { type: 'button', className: 'theia-button main view-group-go-button', onClick: this.doRefresh, disabled: !this.doUpdateAutomatically }, core_1.nls.localizeByDefault('Go'))),
            React.createElement("div", { className: `t-mv-memory-fetch-error${this.showRegisterError ? ' show' : ' hide'}` }, this.registerReadError)));
    }
    doHandleColumnSelectionChange(columnLabel, doShow) {
        const trueColumnLabel = Object.keys(this.columnsDisplayed).find(key => key.startsWith(columnLabel));
        if (trueColumnLabel) {
            super.doHandleColumnSelectionChange(trueColumnLabel, doShow);
        }
    }
    getObligatoryColumnIds() {
        return ['register'];
    }
    renderInputContainer() {
        return (React.createElement("div", { className: 't-mv-settings-container' },
            React.createElement("div", { className: 't-mv-wrapper' },
                this.renderToolbar(),
                this.renderRegisterFieldGroup())));
    }
    handleRegFromDebugWidgetSelection(regName) {
        this.registerDisplaySet.clear();
        if (this.registerField) {
            this.registerField.value = regName;
            this.registerDisplayAll = false;
        }
        this.doUpdateRegisterView();
    }
    renderToolbar() {
        return (React.createElement("div", { className: 'memory-widget-toolbar' },
            this.memoryWidgetOptions.dynamic !== false && (React.createElement("div", { className: 'memory-widget-auto-updates-container' },
                React.createElement("div", { className: `fa fa-${this.doUpdateAutomatically ? 'unlock' : 'lock'}`, id: memory_options_widget_1.AUTO_UPDATE_TOGGLE_ID, title: this.doUpdateAutomatically ?
                        core_1.nls.localize('theia/memory-inspector/register/freeze', 'Freeze memory view') :
                        core_1.nls.localize('theia/memory-inspector/register/unfreeze', 'Unfreeze memory view'), onClick: this.toggleAutoUpdate, onKeyDown: this.toggleAutoUpdate, role: 'button', tabIndex: 0 }))),
            this.renderEditableTitleField()));
    }
    validateInputRegs(input) {
        var _a;
        // identify sequences of alphanumeric characters
        const searchTexts = (_a = input.match(/\w+/g)) !== null && _a !== void 0 ? _a : [];
        if (searchTexts.length !== 0) {
            this.registerDisplayAll = false;
            this.registerDisplaySet.clear();
            this.recentLocations.add(input);
            for (const { name } of this.registerReadResult.registers) {
                if (searchTexts.some(x => name.startsWith(x))) {
                    this.registerDisplaySet.add(name);
                }
            }
        }
        else {
            this.registerDisplayAll = true;
            this.registerDisplaySet.clear();
        }
    }
    async doUpdateRegisterView() {
        var _a;
        try {
            if (!this.registerReadResult.registers || this.registerReadResult.threadId !== ((_a = this.sessionManager.currentThread) === null || _a === void 0 ? void 0 : _a.id)) {
                this.registerReadResult = await this.getRegisters();
            }
            this.updateRegDisplayFilter();
            this.fireDidChangeRegister();
            this.doShowRegisterErrors(true);
        }
        catch (err) {
            this.registerReadError = core_1.nls.localize('theia/memory-inspector/registerReadError', 'There was an error fetching registers.');
            console.error('Failed to read registers', err);
            this.doShowRegisterErrors();
        }
        finally {
            this.registerFilterUpdate = false;
            this.update();
        }
    }
    updateRegDisplayFilter() {
        if (this.registerField) {
            if (this.registerField.value.length === 0) {
                this.registerDisplayAll = true;
            }
            else {
                this.validateInputRegs(this.registerField.value);
            }
        }
    }
    async getRegisters() {
        var _a, _b;
        const regResult = await (0, memory_widget_variable_utils_1.getRegisters)(this.sessionManager.currentSession);
        const threadResult = (_b = (_a = this.sessionManager.currentSession) === null || _a === void 0 ? void 0 : _a.currentThread) === null || _b === void 0 ? void 0 : _b.id;
        return { threadId: threadResult, registers: regResult };
    }
    fireDidChangeRegister() {
        this.onRegisterChangedEmitter.fire([this.registerReadResult, this.registerFilterUpdate]);
    }
    storeState() {
        var _a, _b;
        return {
            ...super.storeState(),
            reg: (_b = (_a = this.registerField) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : this.reg,
            noRadixColumnDisplayed: this.noRadixDisplayed(),
        };
    }
    restoreState(oldState) {
        var _a;
        this.reg = (_a = oldState.reg) !== null && _a !== void 0 ? _a : this.reg;
        this.noRadixColumnDisplayed = oldState.noRadixColumnDisplayed;
    }
};
exports.RegisterOptionsWidget = RegisterOptionsWidget;
tslib_1.__decorate([
    (0, inversify_1.inject)(memory_widget_utils_1.RegisterWidgetOptions),
    tslib_1.__metadata("design:type", Object)
], RegisterOptionsWidget.prototype, "memoryWidgetOptions", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(register_filter_service_1.RegisterFilterService),
    tslib_1.__metadata("design:type", Object)
], RegisterOptionsWidget.prototype, "filterService", void 0);
tslib_1.__decorate([
    (0, inversify_1.postConstruct)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], RegisterOptionsWidget.prototype, "init", null);
exports.RegisterOptionsWidget = RegisterOptionsWidget = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], RegisterOptionsWidget);
//# sourceMappingURL=register-options-widget.js.map