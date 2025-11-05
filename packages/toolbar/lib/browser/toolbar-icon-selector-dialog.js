"use strict";
// *****************************************************************************
// Copyright (C) 2022 Ericsson and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// This Source Code may also be made available under the following Secondary
// Licenses when the conditions for such availability set forth in the Eclipse
// Public License v. 2.0 are satisfied: GNU General Public License, version 2
// with the GNU Classpath Exception which is available at
// https://www.gnu.org/software/classpath/license.html.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************
var ToolbarIconSelectorDialog_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.bindToolbarIconDialog = exports.ICON_DIALOG_PADDING = exports.ICON_DIALOG_WIDTH = exports.ToolbarIconSelectorDialog = exports.CodiconIcons = exports.FontAwesomeIcons = exports.ToolbarCommand = exports.ToolbarIconDialogFactory = void 0;
const tslib_1 = require("tslib");
const React = require("@theia/core/shared/react");
const client_1 = require("@theia/core/shared/react-dom/client");
const inversify_1 = require("@theia/core/shared/inversify");
const debounce = require("@theia/core/shared/lodash.debounce");
const react_dialog_1 = require("@theia/core/lib/browser/dialogs/react-dialog");
const browser_1 = require("@theia/core/lib/browser");
const core_1 = require("@theia/core");
const file_service_1 = require("@theia/filesystem/lib/browser/file-service");
const promise_util_1 = require("@theia/core/lib/common/promise-util");
const fuzzy_search_1 = require("@theia/core/lib/browser/tree/fuzzy-search");
const codicons_1 = require("./codicons");
const font_awesome_icons_1 = require("./font-awesome-icons");
const toolbar_interfaces_1 = require("./toolbar-interfaces");
const toolbar_constants_1 = require("./toolbar-constants");
exports.ToolbarIconDialogFactory = Symbol('ToolbarIconDialogFactory');
exports.ToolbarCommand = Symbol('ToolbarCommand');
exports.FontAwesomeIcons = Symbol('FontAwesomeIcons');
exports.CodiconIcons = Symbol('CodiconIcons');
const FIFTY_MS = 50;
let ToolbarIconSelectorDialog = ToolbarIconSelectorDialog_1 = class ToolbarIconSelectorDialog extends react_dialog_1.ReactDialog {
    constructor(props) {
        super(props);
        this.props = props;
        this.deferredScrollContainer = new promise_util_1.Deferred();
        this.scrollOptions = { ...browser_1.DEFAULT_SCROLL_OPTIONS };
        this.activeIconPrefix = toolbar_interfaces_1.IconSet.CODICON;
        this.iconSets = new Map();
        this.filteredIcons = [];
        this.doShowFilterPlaceholder = false;
        this.debounceHandleSearch = debounce(this.doHandleSearch.bind(this), FIFTY_MS, { trailing: true });
        this.assignScrollContainerRef = (element) => this.doAssignScrollContainerRef(element);
        this.assignFilterRef = (element) => this.doAssignFilterRef(element);
        this.handleSelectOnChange = async (e) => this.doHandleSelectOnChange(e);
        this.handleOnIconClick = (e) => this.doHandleOnIconClick(e);
        this.handleOnIconBlur = (e) => this.doHandleOnIconBlur(e);
        this.doAccept = (e) => {
            const dataId = e.currentTarget.getAttribute('data-id');
            if (dataId === 'default-accept') {
                this.selectedIcon = this.toolbarCommand.iconClass;
            }
            this.accept();
        };
        this.doClose = () => {
            this.selectedIcon = undefined;
            this.close();
        };
        this.controlPanelRoot = (0, client_1.createRoot)(this.controlPanel);
        this.toDispose.push(core_1.Disposable.create(() => this.controlPanelRoot.unmount()));
    }
    onUpdateRequest(msg) {
        super.onUpdateRequest(msg);
        this.controlPanelRoot.render(this.renderControls());
    }
    init() {
        this.node.id = ToolbarIconSelectorDialog_1.ID;
        this.iconSets.set(toolbar_interfaces_1.IconSet.FA, this.faIcons);
        this.iconSets.set(toolbar_interfaces_1.IconSet.CODICON, this.codiconIcons);
        this.activeIconPrefix = toolbar_interfaces_1.IconSet.CODICON;
        const initialIcons = this.iconSets.get(this.activeIconPrefix);
        if (initialIcons) {
            this.filteredIcons = initialIcons;
        }
    }
    async getScrollContainer() {
        return this.deferredScrollContainer.promise;
    }
    doAssignScrollContainerRef(element) {
        this.deferredScrollContainer.resolve(element);
    }
    doAssignFilterRef(element) {
        this.filterRef = element;
    }
    get value() {
        return this.selectedIcon;
    }
    async doHandleSelectOnChange(e) {
        const { value } = e.target;
        this.activeIconPrefix = value;
        this.filteredIcons = [];
        await this.doHandleSearch();
        this.update();
    }
    renderIconSelectorOptions() {
        return (React.createElement("div", { className: 'icon-selector-options' },
            React.createElement("div", { className: 'icon-set-selector-wrapper' },
                core_1.nls.localize('theia/toolbar/iconSet', 'Icon Set'),
                ': ',
                React.createElement("select", { className: 'toolbar-icon-select theia-select', onChange: this.handleSelectOnChange, defaultValue: toolbar_interfaces_1.IconSet.CODICON },
                    React.createElement("option", { key: toolbar_interfaces_1.IconSet.CODICON, value: toolbar_interfaces_1.IconSet.CODICON }, "Codicon"),
                    React.createElement("option", { key: toolbar_interfaces_1.IconSet.FA, value: toolbar_interfaces_1.IconSet.FA }, "Font Awesome"))),
            React.createElement("div", { className: 'icon-fuzzy-filter' },
                React.createElement("input", { ref: this.assignFilterRef, placeholder: core_1.nls.localize('theia/toolbar/filterIcons', 'Filter Icons'), type: 'text', className: 'icon-filter-input theia-input', onChange: this.debounceHandleSearch, spellCheck: false }))));
    }
    renderIconGrid() {
        var _a;
        return (React.createElement("div", { className: 'toolbar-scroll-container', ref: this.assignScrollContainerRef },
            React.createElement("div", { className: `toolbar-icon-dialog-content ${this.doShowFilterPlaceholder ? '' : 'grid'}` }, !this.doShowFilterPlaceholder ? (_a = this.filteredIcons) === null || _a === void 0 ? void 0 : _a.map(icon => (React.createElement("div", { className: 'icon-wrapper', key: icon, role: 'button', onClick: this.handleOnIconClick, onBlur: this.handleOnIconBlur, tabIndex: 0, "data-id": `${this.activeIconPrefix} ${icon}`, title: icon, onKeyPress: this.handleOnIconClick },
                React.createElement("div", { className: `${this.activeIconPrefix} ${icon}` }))))
                : React.createElement("div", { className: 'search-placeholder' }, core_1.nls.localizeByDefault('No results found')))));
    }
    render() {
        return (React.createElement(React.Fragment, null,
            this.renderIconSelectorOptions(),
            this.renderIconGrid()));
    }
    async doHandleSearch() {
        const query = this.filterRef.value;
        const pattern = query;
        const items = this.iconSets.get(this.activeIconPrefix);
        if (items) {
            if (pattern.length) {
                const transform = (item) => item;
                const filterResults = await this.fuzzySearch.filter({ pattern, items, transform });
                this.filteredIcons = filterResults.map(result => result.item);
                if (!this.filteredIcons.length) {
                    this.doShowFilterPlaceholder = true;
                }
                else {
                    this.doShowFilterPlaceholder = false;
                }
            }
            else {
                this.doShowFilterPlaceholder = false;
                this.filteredIcons = items;
            }
            this.update();
        }
    }
    doHandleOnIconClick(e) {
        e.currentTarget.classList.add('selected');
        if (toolbar_constants_1.ReactKeyboardEvent.is(e) && e.key !== 'Enter') {
            return;
        }
        const iconId = e.currentTarget.getAttribute('data-id');
        if (iconId) {
            this.selectedIcon = iconId;
            this.update();
        }
    }
    doHandleOnIconBlur(e) {
        e.currentTarget.classList.remove('selected');
    }
    renderControls() {
        return (React.createElement("div", { className: 'toolbar-icon-controls' },
            React.createElement("div", null, this.toolbarCommand.iconClass
                && (React.createElement("button", { type: 'button', className: 'theia-button main default-button', "data-id": 'default-accept', onClick: this.doAccept },
                    React.createElement("span", null, `${core_1.nls.localize('theia/toolbar/useDefaultIcon', 'Use Default Icon')}:`),
                    React.createElement("div", { className: `toolbar-default-icon ${this.toolbarCommand.iconClass}` })))),
            React.createElement("div", null,
                React.createElement("button", { type: 'button', disabled: !this.selectedIcon, className: 'theia-button main', onClick: this.doAccept }, core_1.nls.localize('theia/toolbar/selectIcon', 'Select Icon')),
                React.createElement("button", { type: 'button', className: 'theia-button secondary', onClick: this.doClose }, browser_1.Dialog.CANCEL))));
    }
};
exports.ToolbarIconSelectorDialog = ToolbarIconSelectorDialog;
ToolbarIconSelectorDialog.ID = 'toolbar-icon-selector-dialog';
tslib_1.__decorate([
    (0, inversify_1.inject)(exports.ToolbarCommand),
    tslib_1.__metadata("design:type", Object)
], ToolbarIconSelectorDialog.prototype, "toolbarCommand", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(file_service_1.FileService),
    tslib_1.__metadata("design:type", file_service_1.FileService)
], ToolbarIconSelectorDialog.prototype, "fileService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(exports.FontAwesomeIcons),
    tslib_1.__metadata("design:type", Array)
], ToolbarIconSelectorDialog.prototype, "faIcons", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(exports.CodiconIcons),
    tslib_1.__metadata("design:type", Array)
], ToolbarIconSelectorDialog.prototype, "codiconIcons", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(fuzzy_search_1.FuzzySearch),
    tslib_1.__metadata("design:type", fuzzy_search_1.FuzzySearch)
], ToolbarIconSelectorDialog.prototype, "fuzzySearch", void 0);
tslib_1.__decorate([
    (0, inversify_1.postConstruct)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], ToolbarIconSelectorDialog.prototype, "init", null);
exports.ToolbarIconSelectorDialog = ToolbarIconSelectorDialog = ToolbarIconSelectorDialog_1 = tslib_1.__decorate([
    (0, inversify_1.injectable)(),
    tslib_1.__param(0, (0, inversify_1.inject)(browser_1.DialogProps)),
    tslib_1.__metadata("design:paramtypes", [browser_1.DialogProps])
], ToolbarIconSelectorDialog);
exports.ICON_DIALOG_WIDTH = 600;
exports.ICON_DIALOG_PADDING = 24;
const bindToolbarIconDialog = (bind) => {
    bind(exports.ToolbarIconDialogFactory).toFactory(ctx => (command) => {
        const child = ctx.container.createChild();
        child.bind(browser_1.DialogProps).toConstantValue({
            title: core_1.nls.localize('theia/toolbar/iconSelectDialog', "Select an Icon for '{0}'", command.label),
            maxWidth: exports.ICON_DIALOG_WIDTH + exports.ICON_DIALOG_PADDING,
        });
        child.bind(exports.FontAwesomeIcons).toConstantValue(font_awesome_icons_1.fontAwesomeIcons);
        child.bind(exports.CodiconIcons).toConstantValue(codicons_1.codicons);
        child.bind(exports.ToolbarCommand).toConstantValue(command);
        child.bind(fuzzy_search_1.FuzzySearch).toSelf().inSingletonScope();
        child.bind(ToolbarIconSelectorDialog).toSelf().inSingletonScope();
        return child.get(ToolbarIconSelectorDialog);
    });
};
exports.bindToolbarIconDialog = bindToolbarIconDialog;
//# sourceMappingURL=toolbar-icon-selector-dialog.js.map