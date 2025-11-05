"use strict";
// *****************************************************************************
// Copyright (C) 2025 EclipseSource GmbH.
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
exports.AIChatTreeInputWidget = exports.AIChatTreeInputFactory = exports.AIChatTreeInputArgs = exports.AIChatTreeInputConfiguration = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const chat_input_widget_1 = require("../chat-input-widget");
const core_1 = require("@theia/core");
const chat_view_language_contribution_1 = require("../chat-view-language-contribution");
const browser_1 = require("@theia/core/lib/browser");
exports.AIChatTreeInputConfiguration = Symbol('AIChatTreeInputConfiguration');
exports.AIChatTreeInputArgs = Symbol('AIChatTreeInputArgs');
exports.AIChatTreeInputFactory = Symbol('AIChatTreeInputFactory');
let AIChatTreeInputWidget = class AIChatTreeInputWidget extends chat_input_widget_1.AIChatInputWidget {
    get requestNode() {
        return this.args.node;
    }
    get request() {
        return this.requestNode.request;
    }
    init() {
        super.init();
        this.updateBranch();
        const request = this.requestNode.request;
        this.toDispose.push(request.session.onDidChange(() => {
            this.updateBranch();
        }));
        this.addKeyListener(this.node, browser_1.Key.ESCAPE, () => {
            this.request.cancelEdit();
        });
        this.editorReady.promise.then(() => {
            if (this.editorRef) {
                this.editorRef.focus();
            }
        });
    }
    updateBranch() {
        var _a;
        this.branch = (_a = this.args.branch) !== null && _a !== void 0 ? _a : this.requestNode.branch;
    }
    getResourceUri() {
        return new core_1.URI(`ai-chat:/${this.requestNode.id}-input.${chat_view_language_contribution_1.CHAT_VIEW_LANGUAGE_EXTENSION}`);
    }
    addContext(variable) {
        this.request.editContextManager.addVariables(variable);
    }
    getContext() {
        return this.request.editContextManager.getVariables();
    }
    deleteContextElement(index) {
        this.request.editContextManager.deleteVariables(index);
    }
};
exports.AIChatTreeInputWidget = AIChatTreeInputWidget;
AIChatTreeInputWidget.ID = 'chat-tree-input-widget';
tslib_1.__decorate([
    (0, inversify_1.inject)(exports.AIChatTreeInputArgs),
    tslib_1.__metadata("design:type", Object)
], AIChatTreeInputWidget.prototype, "args", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(exports.AIChatTreeInputConfiguration),
    (0, inversify_1.optional)(),
    tslib_1.__metadata("design:type", Object)
], AIChatTreeInputWidget.prototype, "configuration", void 0);
tslib_1.__decorate([
    (0, inversify_1.postConstruct)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], AIChatTreeInputWidget.prototype, "init", null);
exports.AIChatTreeInputWidget = AIChatTreeInputWidget = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], AIChatTreeInputWidget);
//# sourceMappingURL=chat-view-tree-input-widget.js.map