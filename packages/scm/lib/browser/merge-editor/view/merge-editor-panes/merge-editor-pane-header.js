"use strict";
// *****************************************************************************
// Copyright (C) 2025 1C-Soft LLC and others.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MergeEditorPaneHeader = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const React = require("@theia/core/shared/react");
const browser_1 = require("@theia/core/lib/browser");
const label_parser_1 = require("@theia/core/lib/browser/label-parser");
let MergeEditorPaneHeader = class MergeEditorPaneHeader extends browser_1.ReactWidget {
    constructor() {
        super(...arguments);
        this._description = '';
        this._detail = '';
        this.handleToolbarClick = (event) => event.nativeEvent.stopImmediatePropagation();
    }
    get description() {
        return this._description;
    }
    set description(description) {
        this._description = description;
        this.update();
    }
    get detail() {
        return this._detail;
    }
    set detail(detail) {
        this._detail = detail;
        this.update();
    }
    get toolbarItems() {
        return this._toolbarItems;
    }
    set toolbarItems(toolbarItems) {
        this._toolbarItems = toolbarItems;
        this.update();
    }
    init() {
        this.addClass('header');
        this.scrollOptions = undefined;
        this.node.tabIndex = -1;
        this.toDispose.push((0, browser_1.onDomEvent)(this.node, 'click', () => this.activate()));
        this.title.changed.connect(this.update, this);
    }
    onActivateRequest(msg) {
        var _a;
        super.onActivateRequest(msg);
        (_a = this.parent) === null || _a === void 0 ? void 0 : _a.activate();
    }
    render() {
        return (React.createElement(React.Fragment, null,
            React.createElement("span", { className: 'title' }, this.renderWithIcons(this.title.label)),
            React.createElement("span", { className: 'description' }, this.renderWithIcons(this.description)),
            React.createElement("span", { className: 'detail' }, this.renderWithIcons(this.detail)),
            React.createElement("span", { className: 'toolbar', onClick: this.handleToolbarClick }, this.toolbarItems.map(toolbarItem => this.renderToolbarItem(toolbarItem)))));
    }
    renderWithIcons(text) {
        const result = [];
        const labelParts = this.labelParser.parse(text);
        labelParts.forEach((labelPart, index) => {
            if (typeof labelPart === 'string') {
                result.push(labelPart);
            }
            else {
                result.push(React.createElement("span", { key: index, className: (0, browser_1.codicon)(labelPart.name) }));
            }
        });
        return result;
    }
    renderToolbarItem({ id, label, tooltip, className, onClick }) {
        return React.createElement("span", { key: id, title: tooltip, onClick: onClick, className: className }, label);
    }
};
exports.MergeEditorPaneHeader = MergeEditorPaneHeader;
tslib_1.__decorate([
    (0, inversify_1.inject)(label_parser_1.LabelParser),
    tslib_1.__metadata("design:type", label_parser_1.LabelParser)
], MergeEditorPaneHeader.prototype, "labelParser", void 0);
tslib_1.__decorate([
    (0, inversify_1.postConstruct)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], MergeEditorPaneHeader.prototype, "init", null);
exports.MergeEditorPaneHeader = MergeEditorPaneHeader = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], MergeEditorPaneHeader);
//# sourceMappingURL=merge-editor-pane-header.js.map