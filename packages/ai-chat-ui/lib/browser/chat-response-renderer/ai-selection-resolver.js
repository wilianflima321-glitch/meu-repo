"use strict";
// *****************************************************************************
// Copyright (C) 2024 EclipseSource GmbH.
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
exports.TextFragmentSelectionResolver = exports.TypeDocSymbolSelectionResolver = exports.GitHubSelectionResolver = exports.LOCATION_REGEX = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@theia/core");
const inversify_1 = require("@theia/core/shared/inversify");
const languageFeatures_1 = require("@theia/monaco-editor-core/esm/vs/editor/common/services/languageFeatures");
const standaloneServices_1 = require("@theia/monaco-editor-core/esm/vs/editor/standalone/browser/standaloneServices");
const monaco_editor_1 = require("@theia/monaco/lib/browser/monaco-editor");
const monaco_to_protocol_converter_1 = require("@theia/monaco/lib/browser/monaco-to-protocol-converter");
/** Regex to match GitHub-style position and range declaration with line (L) and column (C) */
exports.LOCATION_REGEX = /#L(\d+)?(?:C(\d+))?(?:-L(\d+)?(?:C(\d+))?)?$/;
let GitHubSelectionResolver = class GitHubSelectionResolver {
    constructor() {
        this.priority = 100;
    }
    async resolveSelection(widget, options, uri) {
        if (!uri) {
            return;
        }
        // We allow the GitHub syntax of selecting a range in markdown 'L1', 'L1-L2' 'L1-C1_L2-C2' (starting at line 1 and column 1)
        const match = uri === null || uri === void 0 ? void 0 : uri.toString().match(exports.LOCATION_REGEX);
        if (!match) {
            return;
        }
        // we need to adapt the position information from one-based (in GitHub) to zero-based (in Theia)
        const startLine = match[1] ? parseInt(match[1], 10) - 1 : undefined;
        // if no start column is given, we assume the start of the line
        const startColumn = match[2] ? parseInt(match[2], 10) - 1 : 0;
        const endLine = match[3] ? parseInt(match[3], 10) - 1 : undefined;
        // if no end column is given, we assume the end of the line
        const endColumn = match[4] ? parseInt(match[4], 10) - 1 : endLine ? widget.editor.document.getLineMaxColumn(endLine) : undefined;
        return {
            start: { line: startLine, character: startColumn },
            end: { line: endLine, character: endColumn }
        };
    }
};
exports.GitHubSelectionResolver = GitHubSelectionResolver;
exports.GitHubSelectionResolver = GitHubSelectionResolver = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], GitHubSelectionResolver);
let TypeDocSymbolSelectionResolver = class TypeDocSymbolSelectionResolver {
    constructor() {
        this.priority = 50;
    }
    async resolveSelection(widget, options, uri) {
        if (!uri) {
            return;
        }
        const editor = monaco_editor_1.MonacoEditor.get(widget);
        const monacoEditor = editor === null || editor === void 0 ? void 0 : editor.getControl();
        if (!monacoEditor) {
            return;
        }
        const symbolPath = this.findSymbolPath(uri);
        if (!symbolPath) {
            return;
        }
        const textModel = monacoEditor.getModel();
        if (!textModel) {
            return;
        }
        // try to find the symbol through the document symbol provider
        // support referencing nested symbols by separating a dot path similar to TypeDoc
        for (const provider of standaloneServices_1.StandaloneServices.get(languageFeatures_1.ILanguageFeaturesService).documentSymbolProvider.ordered(textModel)) {
            const symbols = await provider.provideDocumentSymbols(textModel, core_1.CancellationToken.None);
            const match = this.findSymbolByPath(symbols !== null && symbols !== void 0 ? symbols : [], symbolPath);
            if (match) {
                return this.m2p.asRange(match.selectionRange);
            }
        }
    }
    findSymbolPath(uri) {
        return uri.fragment.split('.');
    }
    findSymbolByPath(symbols, symbolPath) {
        if (!symbols || symbolPath.length === 0) {
            return undefined;
        }
        let matchedSymbol = undefined;
        let currentSymbols = symbols;
        for (const part of symbolPath) {
            matchedSymbol = currentSymbols.find(symbol => symbol.name === part);
            if (!matchedSymbol) {
                return undefined;
            }
            currentSymbols = matchedSymbol.children || [];
        }
        return matchedSymbol;
    }
};
exports.TypeDocSymbolSelectionResolver = TypeDocSymbolSelectionResolver;
tslib_1.__decorate([
    (0, inversify_1.inject)(monaco_to_protocol_converter_1.MonacoToProtocolConverter),
    tslib_1.__metadata("design:type", monaco_to_protocol_converter_1.MonacoToProtocolConverter)
], TypeDocSymbolSelectionResolver.prototype, "m2p", void 0);
exports.TypeDocSymbolSelectionResolver = TypeDocSymbolSelectionResolver = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], TypeDocSymbolSelectionResolver);
let TextFragmentSelectionResolver = class TextFragmentSelectionResolver {
    async resolveSelection(widget, options, uri) {
        var _a, _b, _c;
        if (!uri) {
            return;
        }
        const fragment = this.findFragment(uri);
        if (!fragment) {
            return;
        }
        const matches = (_c = (_b = (_a = widget.editor.document).findMatches) === null || _b === void 0 ? void 0 : _b.call(_a, { isRegex: false, matchCase: false, matchWholeWord: false, searchString: fragment })) !== null && _c !== void 0 ? _c : [];
        if (matches.length > 0) {
            return {
                start: {
                    line: matches[0].range.start.line - 1,
                    character: matches[0].range.start.character - 1
                },
                end: {
                    line: matches[0].range.end.line - 1,
                    character: matches[0].range.end.character - 1
                }
            };
        }
    }
    findFragment(uri) {
        return uri.fragment;
    }
};
exports.TextFragmentSelectionResolver = TextFragmentSelectionResolver;
exports.TextFragmentSelectionResolver = TextFragmentSelectionResolver = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], TextFragmentSelectionResolver);
//# sourceMappingURL=ai-selection-resolver.js.map