"use strict";
// *****************************************************************************
// Copyright (C) 2025 Lonti.com Pty Ltd.
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
const frontend_application_config_provider_1 = require("@theia/core/lib/browser/frontend-application-config-provider");
const jsdom_1 = require("@theia/core/lib/browser/test/jsdom");
let disableJSDOM = (0, jsdom_1.enableJSDOM)();
frontend_application_config_provider_1.FrontendApplicationConfigProvider.set({});
const common_1 = require("@theia/core/lib/common");
const inversify_1 = require("@theia/core/shared/inversify");
const editor_api_1 = require("@theia/monaco-editor-core/esm/vs/editor/editor.api");
const chai_1 = require("chai");
const sinon = require("sinon");
const code_completion_variable_contribution_1 = require("./code-completion-variable-contribution");
const code_completion_variables_1 = require("./code-completion-variables");
disableJSDOM();
describe('CodeCompletionVariableContribution', () => {
    let contribution;
    let model;
    before(() => {
        disableJSDOM = (0, jsdom_1.enableJSDOM)();
        const container = new inversify_1.Container();
        container.bind(common_1.PreferenceService).toConstantValue({
            get: () => 1000,
        });
        container.bind(code_completion_variable_contribution_1.CodeCompletionVariableContribution).toSelf().inSingletonScope();
        contribution = container.get(code_completion_variable_contribution_1.CodeCompletionVariableContribution);
    });
    beforeEach(() => {
        model = editor_api_1.editor.createModel('//line 1\nconsole.\n//line 2', 'javascript', editor_api_1.Uri.file('/home/user/workspace/test.js'));
        sinon.stub(model, 'getLanguageId').returns('javascript');
    });
    afterEach(() => {
        model.dispose();
    });
    after(() => {
        // Disable JSDOM after all tests
        disableJSDOM();
        model.dispose();
    });
    describe('canResolve', () => {
        it('should be able to resolve the file from the CodeCompletionVariableContext', () => {
            const context = {
                model,
                position: model.getPositionAt(8),
                context: {
                    triggerKind: editor_api_1.languages.InlineCompletionTriggerKind.Automatic,
                    selectedSuggestionInfo: undefined,
                    includeInlineEdits: false,
                    includeInlineCompletions: false
                }
            };
            (0, chai_1.expect)(contribution.canResolve({ variable: code_completion_variables_1.FILE }, context)).to.equal(1);
        });
        it('should not be able to resolve the file from unknown context', () => {
            (0, chai_1.expect)(contribution.canResolve({ variable: code_completion_variables_1.FILE }, {})).to.equal(0);
        });
    });
    describe('resolve', () => {
        it('should resolve the file variable', async () => {
            const context = {
                model,
                position: model.getPositionAt(17),
                context: {
                    triggerKind: editor_api_1.languages.InlineCompletionTriggerKind.Automatic,
                    selectedSuggestionInfo: undefined,
                    includeInlineEdits: false,
                    includeInlineCompletions: false
                }
            };
            const resolved = await contribution.resolve({ variable: code_completion_variables_1.FILE }, context);
            (0, chai_1.expect)(resolved).to.deep.equal({
                variable: code_completion_variables_1.FILE,
                value: 'file:///home/user/workspace/test.js'
            });
        });
        it('should resolve the language variable', async () => {
            const context = {
                model,
                position: model.getPositionAt(17),
                context: {
                    triggerKind: editor_api_1.languages.InlineCompletionTriggerKind.Automatic,
                    selectedSuggestionInfo: undefined,
                    includeInlineEdits: false,
                    includeInlineCompletions: false
                }
            };
            const resolved = await contribution.resolve({ variable: code_completion_variables_1.LANGUAGE }, context);
            (0, chai_1.expect)(resolved).to.deep.equal({
                variable: code_completion_variables_1.LANGUAGE,
                value: 'javascript'
            });
        });
        it('should resolve the prefix variable', async () => {
            const context = {
                model,
                position: model.getPositionAt(17),
                context: {
                    triggerKind: editor_api_1.languages.InlineCompletionTriggerKind.Automatic,
                    selectedSuggestionInfo: undefined,
                    includeInlineEdits: false,
                    includeInlineCompletions: false
                }
            };
            const resolved = await contribution.resolve({ variable: code_completion_variables_1.PREFIX }, context);
            (0, chai_1.expect)(resolved).to.deep.equal({
                variable: code_completion_variables_1.PREFIX,
                value: '//line 1\nconsole.'
            });
        });
        it('should resolve the suffix variable', async () => {
            const context = {
                model,
                position: model.getPositionAt(17),
                context: {
                    triggerKind: editor_api_1.languages.InlineCompletionTriggerKind.Automatic,
                    selectedSuggestionInfo: undefined,
                    includeInlineEdits: false,
                    includeInlineCompletions: false
                }
            };
            const resolved = await contribution.resolve({ variable: code_completion_variables_1.SUFFIX }, context);
            (0, chai_1.expect)(resolved).to.deep.equal({
                variable: code_completion_variables_1.SUFFIX,
                value: '\n//line 2'
            });
        });
    });
});
//# sourceMappingURL=code-completion-variable-contribution.spec.js.map