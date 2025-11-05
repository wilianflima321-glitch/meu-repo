"use strict";
// *****************************************************************************
// Copyright (C) 2023 EclipseSource and others.
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
exports.TheiaOutputViewChannel = void 0;
const theia_page_object_1 = require("./theia-page-object");
const util_1 = require("./util");
const theia_monaco_editor_1 = require("./theia-monaco-editor");
class TheiaOutputViewChannel extends theia_page_object_1.TheiaPageObject {
    constructor(data, outputView) {
        super(outputView.app);
        this.data = data;
        this.outputView = outputView;
        this.monacoEditor = new theia_monaco_editor_1.TheiaMonacoEditor(this.page.locator(this.viewSelector), outputView.app);
    }
    get viewSelector() {
        return this.data.viewSelector;
    }
    get dataUri() {
        return this.data.dataUri;
    }
    get channelName() {
        return this.data.channelName;
    }
    async waitForVisible() {
        await this.page.waitForSelector(this.viewSelector, { state: 'visible' });
    }
    async isDisplayed() {
        return (0, util_1.isElementVisible)(this.viewElement());
    }
    viewElement() {
        return this.page.$(this.viewSelector);
    }
    async numberOfLines() {
        await this.waitForVisible();
        return this.monacoEditor.numberOfLines();
    }
    async maxSeverityOfLineByLineNumber(lineNumber) {
        await this.waitForVisible();
        const lineElement = await (await this.monacoEditor.line(lineNumber)).elementHandle();
        const contents = await (lineElement === null || lineElement === void 0 ? void 0 : lineElement.$$('span > span.mtk1'));
        if (!contents || contents.length < 1) {
            throw new Error(`Could not find contents of line number ${lineNumber}!`);
        }
        const severityClassNames = await Promise.all(contents.map(async (content) => { var _a; return (_a = (await content.getAttribute('class'))) === null || _a === void 0 ? void 0 : _a.split(' ')[1]; }));
        if (severityClassNames.includes('theia-output-error')) {
            return 'error';
        }
        else if (severityClassNames.includes('theia-output-warning')) {
            return 'warning';
        }
        return 'info';
    }
    async textContentOfLineByLineNumber(lineNumber) {
        return this.monacoEditor.textContentOfLineByLineNumber(lineNumber);
    }
}
exports.TheiaOutputViewChannel = TheiaOutputViewChannel;
//# sourceMappingURL=theia-output-channel.js.map