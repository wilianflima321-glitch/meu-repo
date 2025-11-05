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
const workspace_functions_1 = require("./workspace-functions");
const inversify_1 = require("@theia/core/shared/inversify");
const file_service_1 = require("@theia/filesystem/lib/browser/file-service");
const uri_1 = require("@theia/core/lib/common/uri");
const browser_1 = require("@theia/workspace/lib/browser");
const browser_2 = require("@theia/core/lib/browser");
const browser_3 = require("@theia/markers/lib/browser");
const monaco_text_model_service_1 = require("@theia/monaco/lib/browser/monaco-text-model-service");
const monaco_workspace_1 = require("@theia/monaco/lib/browser/monaco-workspace");
disableJSDOM();
describe('Workspace Functions Cancellation Tests', () => {
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
        // Setup mock context
        mockCtx = {
            response: {
                cancellationToken: cancellationTokenSource.token
            }
        };
        // Create a new container for each test
        container = new inversify_1.Container();
        // Mock dependencies
        const mockWorkspaceService = {
            roots: [{ resource: new uri_1.URI('file:///workspace') }]
        };
        const mockFileService = {
            exists: async () => true,
            resolve: async () => ({
                isDirectory: true,
                children: [
                    {
                        isDirectory: true,
                        resource: new uri_1.URI('file:///workspace/dir'),
                        path: { base: 'dir' }
                    }
                ],
                resource: new uri_1.URI('file:///workspace')
            }),
            read: async () => ({ value: { toString: () => 'test content' } })
        };
        const mockPreferenceService = {
            get: (_path, defaultValue) => defaultValue
        };
        const mockMonacoWorkspace = {
            // eslint-disable-next-line no-null/no-null
            getTextDocument: () => null
        };
        const mockProblemManager = {
            findMarkers: () => [],
            onDidChangeMarkers: () => ({ dispose: () => { } })
        };
        const mockMonacoTextModelService = {
            createModelReference: async () => ({
                object: {
                    lineCount: 10,
                    getText: () => 'test text'
                },
                dispose: () => { }
            })
        };
        const mockOpenerService = {
            open: async () => { }
        };
        // Register mocks in the container
        container.bind(browser_1.WorkspaceService).toConstantValue(mockWorkspaceService);
        container.bind(file_service_1.FileService).toConstantValue(mockFileService);
        container.bind(core_1.PreferenceService).toConstantValue(mockPreferenceService);
        container.bind(monaco_workspace_1.MonacoWorkspace).toConstantValue(mockMonacoWorkspace);
        container.bind(browser_3.ProblemManager).toConstantValue(mockProblemManager);
        container.bind(monaco_text_model_service_1.MonacoTextModelService).toConstantValue(mockMonacoTextModelService);
        container.bind(browser_2.OpenerService).toConstantValue(mockOpenerService);
        container.bind(workspace_functions_1.WorkspaceFunctionScope).toSelf();
        container.bind(workspace_functions_1.GetWorkspaceDirectoryStructure).toSelf();
        container.bind(workspace_functions_1.FileContentFunction).toSelf();
        container.bind(workspace_functions_1.GetWorkspaceFileList).toSelf();
        container.bind(workspace_functions_1.FileDiagnosticProvider).toSelf();
    });
    afterEach(() => {
        cancellationTokenSource.dispose();
    });
    it('GetWorkspaceDirectoryStructure should respect cancellation token', async () => {
        const getDirectoryStructure = container.get(workspace_functions_1.GetWorkspaceDirectoryStructure);
        cancellationTokenSource.cancel();
        const handler = getDirectoryStructure.getTool().handler;
        const result = await handler(JSON.stringify({}), mockCtx);
        const jsonResponse = typeof result === 'string' ? JSON.parse(result) : result;
        (0, chai_1.expect)(jsonResponse.error).to.equal('Operation cancelled by user');
    });
    it('FileContentFunction should respect cancellation token', async () => {
        const fileContentFunction = container.get(workspace_functions_1.FileContentFunction);
        cancellationTokenSource.cancel();
        const handler = fileContentFunction.getTool().handler;
        const result = await handler(JSON.stringify({ file: 'test.txt' }), mockCtx);
        const jsonResponse = JSON.parse(result);
        (0, chai_1.expect)(jsonResponse.error).to.equal('Operation cancelled by user');
    });
    it('GetWorkspaceFileList should respect cancellation token', async () => {
        const getWorkspaceFileList = container.get(workspace_functions_1.GetWorkspaceFileList);
        cancellationTokenSource.cancel();
        const handler = getWorkspaceFileList.getTool().handler;
        const result = await handler(JSON.stringify({ path: '' }), mockCtx);
        (0, chai_1.expect)(result).to.include('Operation cancelled by user');
    });
    it('GetWorkspaceFileList should check cancellation at multiple points', async () => {
        const getWorkspaceFileList = container.get(workspace_functions_1.GetWorkspaceFileList);
        // We'll let it pass the first check then cancel
        const mockFileService = container.get(file_service_1.FileService);
        const originalResolve = mockFileService.resolve;
        // Mock resolve to cancel the token after it's called
        mockFileService.resolve = async (...args) => {
            const innerResult = await originalResolve.apply(mockFileService, args);
            cancellationTokenSource.cancel();
            return innerResult;
        };
        const handler = getWorkspaceFileList.getTool().handler;
        const result = await handler(JSON.stringify({ path: '' }), mockCtx);
        (0, chai_1.expect)(result).to.include('Operation cancelled by user');
    });
    it('FileDiagnosticProvider should respect cancellation token', async () => {
        const fileDiagnosticProvider = container.get(workspace_functions_1.FileDiagnosticProvider);
        cancellationTokenSource.cancel();
        const handler = fileDiagnosticProvider.getTool().handler;
        const result = await handler(JSON.stringify({ file: 'test.txt' }), mockCtx);
        const jsonResponse = JSON.parse(result);
        (0, chai_1.expect)(jsonResponse.error).to.equal('Operation cancelled by user');
    });
});
//# sourceMappingURL=workspace-functions.spec.js.map