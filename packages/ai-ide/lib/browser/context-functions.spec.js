"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
const jsdom_1 = require("@theia/core/lib/browser/test/jsdom");
let disableJSDOM = (0, jsdom_1.enableJSDOM)();
const frontend_application_config_provider_1 = require("@theia/core/lib/browser/frontend-application-config-provider");
frontend_application_config_provider_1.FrontendApplicationConfigProvider.set({});
const chai_1 = require("chai");
const context_functions_1 = require("./context-functions");
const core_1 = require("@theia/core");
const assert_1 = require("assert");
disableJSDOM();
describe('Context Functions Cancellation Tests', () => {
    let cancellationTokenSource;
    let mockCtx;
    before(() => {
        disableJSDOM = (0, jsdom_1.enableJSDOM)();
    });
    after(() => {
        // Disable JSDOM after all tests
        disableJSDOM();
    });
    beforeEach(() => {
        cancellationTokenSource = new core_1.CancellationTokenSource();
        const context = {
            addVariables: () => { },
            getVariables: () => mockCtx.context?.variables
        };
        mockCtx = {
            response: {
                cancellationToken: cancellationTokenSource.token
            },
            context: {
                variables: [{
                        variable: { id: 'file1', name: 'File' },
                        arg: '/path/to/file',
                        contextValue: 'file content'
                    }]
            },
            session: {
                context
            }
        };
    });
    afterEach(() => {
        cancellationTokenSource.dispose();
    });
    it('ListChatContext should respect cancellation token', async () => {
        const listChatContext = new context_functions_1.ListChatContext();
        cancellationTokenSource.cancel();
        const result = await listChatContext.getTool().handler('', mockCtx);
        if (typeof result !== 'string') {
            (0, assert_1.fail)(`Wrong tool call result type: ${result}`);
        }
        const jsonResponse = JSON.parse(result);
        (0, chai_1.expect)(jsonResponse.error).to.equal('Operation cancelled by user');
    });
    it('ResolveChatContext should respect cancellation token', async () => {
        const resolveChatContext = new context_functions_1.ResolveChatContext();
        cancellationTokenSource.cancel();
        const result = await resolveChatContext.getTool().handler('{"contextElementId":"file1/path/to/file"}', mockCtx);
        if (typeof result !== 'string') {
            (0, assert_1.fail)(`Wrong tool call result type: ${result}`);
        }
        const jsonResponse = JSON.parse(result);
        (0, chai_1.expect)(jsonResponse.error).to.equal('Operation cancelled by user');
    });
    it('AddFileToChatContext should respect cancellation token', async () => {
        const addFileToChatContext = new context_functions_1.AddFileToChatContext();
        cancellationTokenSource.cancel();
        const result = await addFileToChatContext.getTool().handler('{"filesToAdd":["/new/path/to/file"]}', mockCtx);
        if (typeof result !== 'string') {
            (0, assert_1.fail)(`Wrong tool call result type: ${result}`);
        }
        const jsonResponse = JSON.parse(result);
        (0, chai_1.expect)(jsonResponse.error).to.equal('Operation cancelled by user');
    });
});
//# sourceMappingURL=context-functions.spec.js.map