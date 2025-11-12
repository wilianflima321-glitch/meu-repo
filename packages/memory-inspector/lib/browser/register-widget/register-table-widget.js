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
exports.RegisterTableWidget = exports.RegisterTable = void 0;
const tslib_1 = require("tslib");
const browser_1 = require("@theia/core/lib/browser");
const inversify_1 = require("@theia/core/shared/inversify");
const React = tslib_1.__importStar(require("@theia/core/shared/react"));
const memory_options_widget_1 = require("../memory-widget/memory-options-widget");
const memory_table_widget_1 = require("../memory-widget/memory-table-widget");
const register_options_widget_1 = require("./register-options-widget");
var RegisterTable;
(function (RegisterTable) {
    RegisterTable.ROW_CLASS = 't-mv-view-row';
    RegisterTable.ROW_DIVIDER_CLASS = 't-mv-view-row-highlight';
    RegisterTable.REGISTER_NAME_CLASS = 't-mv-view-address';
    RegisterTable.REGISTER_DATA_CLASS = 't-mv-view-data';
    RegisterTable.EXTRA_COLUMN_DATA_CLASS = 't-mv-view-code';
    RegisterTable.HEADER_ROW_CLASS = 't-mv-header';
})(RegisterTable || (exports.RegisterTable = RegisterTable = {}));
class RegisterTableWidget extends memory_table_widget_1.MemoryTableWidget {
    constructor() {
        super(...arguments);
        this.registerNotSaved = '<not saved>';
        this.memory = { ...memory_options_widget_1.EMPTY_MEMORY, variables: [] };
        this.handleRowKeyDown = (event) => {
            var _a;
            const keyCode = (_a = browser_1.KeyCode.createKeyCode(event.nativeEvent).key) === null || _a === void 0 ? void 0 : _a.keyCode;
            switch (keyCode) {
                case browser_1.Key.ENTER.keyCode:
                    this.openDebugVariableByCurrentTarget(event);
                    break;
                default:
                    break;
            }
        };
        this.openDebugVariableByCurrentTarget = (event) => {
            this.openDebugVariableByDataId(event.currentTarget);
        };
    }
    async doInit() {
        this.id = RegisterTableWidget.ID;
        this.addClass(RegisterTableWidget.ID);
        this.scrollOptions = { ...this.scrollOptions, suppressScrollX: false };
        this.toDispose.push(this.optionsWidget.onOptionsChanged(optionId => this.handleOptionChange(optionId)));
        this.toDispose.push(this.optionsWidget.onRegisterChanged(e => this.handleRegisterChange(e)));
        this.toDispose.push(this.themeService.onDidColorThemeChange(e => this.handleThemeChange(e)));
        this.getStateAndUpdate();
    }
    handleSetValue(dVar) {
        if (dVar) {
            dVar.open();
        }
    }
    handleRegisterChange(newRegister) {
        const regResult = newRegister[0];
        const updatePrevRegs = !newRegister[1];
        if (this.registers.threadId !== regResult.threadId) {
            // if not same thread Id, dont highlighting register changes
            this.previousRegisters = undefined;
        }
        else {
            if (updatePrevRegs) {
                this.previousRegisters = this.registers;
            }
        }
        this.getStateAndUpdate();
    }
    getState() {
        this.options = this.optionsWidget.options;
        this.registers = this.optionsWidget.registers;
    }
    getTableRows() {
        return [...this.renderRegRows()];
    }
    *renderRegRows(result = this.registers) {
        let rowsYielded = 0;
        // For each row...
        for (const reg of result.registers) {
            if (this.optionsWidget.displayReg(reg.name)) {
                const notSaved = reg.value === this.registerNotSaved;
                const isChanged = this.previousRegisters && reg.value !== this.getPrevRegVal(reg.name, this.previousRegisters);
                const options = {
                    regName: reg.name,
                    regVal: reg.value,
                    hexadecimal: notSaved ? reg.value : this.optionsWidget.handleRadixRendering(reg.value, 16, reg.name),
                    decimal: notSaved ? reg.value : this.optionsWidget.handleRadixRendering(reg.value, 10),
                    octal: notSaved ? reg.value : this.optionsWidget.handleRadixRendering(reg.value, 8),
                    binary: notSaved ? reg.value : this.optionsWidget.handleRadixRendering(reg.value, 2, reg.name),
                    doShowDivider: (rowsYielded % 4) === 3,
                    isChanged,
                };
                yield this.renderRegRow(options);
                rowsYielded += 1;
            }
        }
    }
    getPrevRegVal(regName, inRegs) {
        var _a;
        return (_a = inRegs.registers.find(element => element.name === regName)) === null || _a === void 0 ? void 0 : _a.value;
    }
    renderRegRow(options, getRowAttributes = this.getRowAttributes.bind(this)) {
        var _a;
        const { regName } = options;
        const { className, style, title } = getRowAttributes(options);
        return (React.createElement("tr", { 
            // Add a marker to help visual navigation when scrolling
            className: className, style: style, title: title, key: regName, "data-id": regName, "data-value": (_a = options.decimal) !== null && _a !== void 0 ? _a : 'none', tabIndex: 0, onKeyDown: this.handleRowKeyDown, onContextMenu: this.options.isFrozen ? undefined : this.handleTableRightClick, onDoubleClick: this.options.isFrozen ? undefined : this.openDebugVariableByCurrentTarget },
            React.createElement("td", { className: RegisterTable.REGISTER_NAME_CLASS }, regName),
            this.getExtraRegColumn(options)));
    }
    getRowAttributes(options) {
        let className = RegisterTable.ROW_CLASS;
        if (options.doShowDivider) {
            className += ` ${RegisterTable.ROW_DIVIDER_CLASS}`;
        }
        if (options.isChanged) {
            // use the eight-bits change CSS class
            className += ' eight-bits changed';
        }
        return { className };
    }
    getExtraRegColumn(options) {
        const additionalColumns = [];
        if (this.options.columnsDisplayed.hexadecimal.doRender) {
            additionalColumns.push(React.createElement("td", { className: RegisterTable.EXTRA_COLUMN_DATA_CLASS, key: 'hexadecimal' }, options.hexadecimal));
        }
        if (this.options.columnsDisplayed.decimal.doRender) {
            additionalColumns.push(React.createElement("td", { className: RegisterTable.EXTRA_COLUMN_DATA_CLASS, key: 'decimal' }, options.decimal));
        }
        if (this.options.columnsDisplayed.octal.doRender) {
            additionalColumns.push(React.createElement("td", { className: RegisterTable.EXTRA_COLUMN_DATA_CLASS, key: 'octal' }, options.octal));
        }
        if (this.options.columnsDisplayed.binary.doRender) {
            additionalColumns.push(React.createElement("td", { className: RegisterTable.EXTRA_COLUMN_DATA_CLASS, key: 'binary' }, options.binary));
        }
        return additionalColumns;
    }
    getWrapperHandlers() {
        return this.options.isFrozen || this.options.noRadixColumnDisplayed
            ? super.getWrapperHandlers()
            : {
                onMouseMove: this.handleTableMouseMove,
                onContextMenu: this.handleTableRightClick,
            };
    }
    doHandleTableMouseMove(targetElement) {
        var _a;
        const tempTarget = targetElement;
        const target = ((_a = tempTarget.parentElement) === null || _a === void 0 ? void 0 : _a.tagName) === 'TR' ? tempTarget.parentElement : tempTarget;
        if (target.tagName === 'TR') {
            const { x, y } = target.getBoundingClientRect();
            const anchor = { x: Math.round(x), y: Math.round(y + target.clientHeight) };
            const value = Number(target.getAttribute('data-value'));
            if (!isNaN(value)) {
                const register = target.getAttribute('data-id');
                const properties = {
                    register,
                    hex: `0x${value.toString(16)}`,
                    binary: `0b${value.toString(2)}`,
                    decimal: value.toString(10),
                    octal: `0o${value.toString(8)}`,
                };
                return this.hoverRenderer.render(this.node, anchor, properties);
            }
        }
        return this.hoverRenderer.hide();
    }
    openDebugVariableByDataId(element) {
        const registerName = element.getAttribute('data-id');
        if (registerName) {
            this.openDebugVariableByName(registerName);
        }
    }
    openDebugVariableByName(registerName) {
        const debugVariable = this.registers.registers.find(element => element.name === registerName);
        this.handleSetValue(debugVariable);
    }
    doHandleTableRightClick(event) {
        event.preventDefault();
        const curTarget = event.currentTarget;
        if (curTarget.tagName === 'TR') {
            this.update();
            event.stopPropagation();
            this.contextMenuRenderer.render({
                menuPath: RegisterTableWidget.CONTEXT_MENU,
                anchor: event.nativeEvent,
                args: this.getContextMenuArgs(event),
                context: curTarget
            });
        }
    }
    getContextMenuArgs(event) {
        const args = [this];
        const regName = event.currentTarget.getAttribute('data-id');
        if (regName) {
            const dVar = this.registers.registers.find(element => element.name === regName);
            args.push(dVar);
        }
        return args;
    }
}
exports.RegisterTableWidget = RegisterTableWidget;
RegisterTableWidget.CONTEXT_MENU = ['register.view.context.menu'];
RegisterTableWidget.ID = 'register-table-widget';
tslib_1.__decorate([
    (0, inversify_1.inject)(register_options_widget_1.RegisterOptionsWidget),
    tslib_1.__metadata("design:type", register_options_widget_1.RegisterOptionsWidget)
], RegisterTableWidget.prototype, "optionsWidget", void 0);
//# sourceMappingURL=register-table-widget.js.map