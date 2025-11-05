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
const jsdom_1 = require("@theia/core/lib/browser/test/jsdom");
let disableJSDOM = (0, jsdom_1.enableJSDOM)();
const frontend_application_config_provider_1 = require("@theia/core/lib/browser/frontend-application-config-provider");
frontend_application_config_provider_1.FrontendApplicationConfigProvider.set({});
const chai_1 = require("chai");
const core_1 = require("@theia/core");
const file_changeset_functions_1 = require("./file-changeset-functions");
const inversify_1 = require("@theia/core/shared/inversify");
const workspace_functions_1 = require("./workspace-functions");
const file_service_1 = require("@theia/filesystem/lib/browser/file-service");
const change_set_file_element_1 = require("@theia/ai-chat/lib/browser/change-set-file-element");
const uri_1 = require("@theia/core/lib/common/uri");
disableJSDOM();
describe('File Changeset Functions Cancellation Tests', () => {
    let cancellationTokenSource;
    let mockCtx;
    let container;
    before(() => {
        disableJSDOM = (0, jsdom_1.enableJSDOM)();
    });
    after(() => {
        // Disable JSDOM after all tests
        disableJSDOM();
    });
    beforeEach(() => {
        cancellationTokenSource = new core_1.CancellationTokenSource();
        // Create a mock change set that doesn't do anything
        const mockChangeSet = {
            addElements: (...elements) => true,
            setTitle: () => { },
            removeElements: () => true,
            getElementByURI: () => undefined
        };
        // Setup mock context
        mockCtx = {
            id: 'test-request-id',
            response: {
                cancellationToken: cancellationTokenSource.token
            },
            session: {
                id: 'test-session-id',
                changeSet: mockChangeSet
            }
        };
        // Create a new container for each test
        container = new inversify_1.Container();
        // Mock dependencies
        const mockWorkspaceScope = {
            resolveRelativePath: async () => new uri_1.URI('file:///workspace/test.txt')
        };
        const mockFileService = {
            exists: async () => true,
            read: async () => ({ value: { toString: () => 'test content' } })
        };
        const mockFileChangeFactory = () => ({
            uri: new uri_1.URI('file:///workspace/test.txt'),
            type: 'modify',
            state: 'pending',
            targetState: 'new content',
            apply: async () => { },
        });
        // Register mocks in the container
        container.bind(workspace_functions_1.WorkspaceFunctionScope).toConstantValue(mockWorkspaceScope);
        container.bind(file_service_1.FileService).toConstantValue(mockFileService);
        container.bind(change_set_file_element_1.ChangeSetFileElementFactory).toConstantValue(mockFileChangeFactory);
        container.bind(file_changeset_functions_1.FileChangeSetTitleProvider).to(file_changeset_functions_1.DefaultFileChangeSetTitleProvider).inSingletonScope();
        container.bind(file_changeset_functions_1.ReplaceContentInFileFunctionHelper).toSelf();
        container.bind(file_changeset_functions_1.SuggestFileContent).toSelf();
        container.bind(file_changeset_functions_1.WriteFileContent).toSelf();
        container.bind(file_changeset_functions_1.SuggestFileReplacements).toSelf();
        container.bind(file_changeset_functions_1.WriteFileReplacements).toSelf();
        container.bind(file_changeset_functions_1.ClearFileChanges).toSelf();
        container.bind(file_changeset_functions_1.GetProposedFileState).toSelf();
    });
    afterEach(() => {
        cancellationTokenSource.dispose();
    });
    it('SuggestFileContent should respect cancellation token', async () => {
        const suggestFileContent = container.get(file_changeset_functions_1.SuggestFileContent);
        cancellationTokenSource.cancel();
        const handler = suggestFileContent.getTool().handler;
        const result = await handler(JSON.stringify({ path: 'test.txt', content: 'test content' }), mockCtx);
        const jsonResponse = typeof result === 'string' ? JSON.parse(result) : result;
        (0, chai_1.expect)(jsonResponse.error).to.equal('Operation cancelled by user');
    });
    it('WriteFileContent should respect cancellation token', async () => {
        const writeFileContent = container.get(file_changeset_functions_1.WriteFileContent);
        cancellationTokenSource.cancel();
        const handler = writeFileContent.getTool().handler;
        const result = await handler(JSON.stringify({ path: 'test.txt', content: 'test content' }), mockCtx);
        const jsonResponse = typeof result === 'string' ? JSON.parse(result) : result;
        (0, chai_1.expect)(jsonResponse.error).to.equal('Operation cancelled by user');
    });
    it('SuggestFileReplacements should respect cancellation token', async () => {
        const suggestFileReplacements = container.get(file_changeset_functions_1.SuggestFileReplacements);
        cancellationTokenSource.cancel();
        const handler = suggestFileReplacements.getTool().handler;
        const result = await handler(JSON.stringify({
            path: 'test.txt',
            replacements: [{ oldContent: 'old', newContent: 'new' }]
        }), mockCtx);
        const jsonResponse = typeof result === 'string' ? JSON.parse(result) : result;
        (0, chai_1.expect)(jsonResponse.error).to.equal('Operation cancelled by user');
    });
    it('WriteFileReplacements should respect cancellation token', async () => {
        const writeFileReplacements = container.get(file_changeset_functions_1.WriteFileReplacements);
        cancellationTokenSource.cancel();
        const handler = writeFileReplacements.getTool().handler;
        const result = await handler(JSON.stringify({
            path: 'test.txt',
            replacements: [{ oldContent: 'old', newContent: 'new' }]
        }), mockCtx);
        const jsonResponse = typeof result === 'string' ? JSON.parse(result) : result;
        (0, chai_1.expect)(jsonResponse.error).to.equal('Operation cancelled by user');
    });
    it('ClearFileChanges should respect cancellation token', async () => {
        const clearFileChanges = container.get(file_changeset_functions_1.ClearFileChanges);
        cancellationTokenSource.cancel();
        const handler = clearFileChanges.getTool().handler;
        const result = await handler(JSON.stringify({ path: 'test.txt' }), mockCtx);
        const jsonResponse = typeof result === 'string' ? JSON.parse(result) : result;
        (0, chai_1.expect)(jsonResponse.error).to.equal('Operation cancelled by user');
    });
    it('GetProposedFileState should respect cancellation token', async () => {
        const getProposedFileState = container.get(file_changeset_functions_1.GetProposedFileState);
        cancellationTokenSource.cancel();
        const handler = getProposedFileState.getTool().handler;
        const result = await handler(JSON.stringify({ path: 'test.txt' }), mockCtx);
        const jsonResponse = typeof result === 'string' ? JSON.parse(result) : result;
        (0, chai_1.expect)(jsonResponse.error).to.equal('Operation cancelled by user');
    });
    it('ReplaceContentInFileFunctionHelper should handle cancellation in common processing', async () => {
        const helper = container.get(file_changeset_functions_1.ReplaceContentInFileFunctionHelper);
        cancellationTokenSource.cancel();
        // Test the underlying helper method through the public methods
        const result = await helper.createChangesetFromToolCall(JSON.stringify({
            path: 'test.txt',
            replacements: [{ oldContent: 'old', newContent: 'new' }]
        }), mockCtx);
        const jsonResponse = typeof result === 'string' ? JSON.parse(result) : result;
        (0, chai_1.expect)(jsonResponse.error).to.equal('Operation cancelled by user');
    });
});
//# sourceMappingURL=file-changeset-functions.spec.js.map