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
const chai_1 = require("chai");
const core_1 = require("@theia/core");
const workspace_search_provider_1 = require("./workspace-search-provider");
const inversify_1 = require("@theia/core/shared/inversify");
const search_in_workspace_service_1 = require("@theia/search-in-workspace/lib/browser/search-in-workspace-service");
const workspace_functions_1 = require("./workspace-functions");
const file_service_1 = require("@theia/filesystem/lib/browser/file-service");
const uri_1 = require("@theia/core/lib/common/uri");
describe('Workspace Search Provider Cancellation Tests', () => {
    let cancellationTokenSource;
    let mockCtx;
    let container;
    let searchService;
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
        searchService = {
            searchWithCallback: async (query, rootUris, callbacks, options) => {
                const searchId = 1;
                return searchId;
            },
            cancel: (searchId) => {
                // Mock cancellation
            }
        };
        const mockWorkspaceScope = {
            getWorkspaceRoot: async () => new uri_1.URI('file:///workspace'),
            ensureWithinWorkspace: () => { },
            resolveRelativePath: async (path) => new uri_1.URI(`file:///workspace/${path}`)
        };
        const mockPreferenceService = {
            get: () => 30
        };
        const mockFileService = {
            exists: async () => true,
            resolve: async () => ({ isDirectory: true })
        };
        // Register mocks in the container
        container.bind(search_in_workspace_service_1.SearchInWorkspaceService).toConstantValue(searchService);
        container.bind(workspace_functions_1.WorkspaceFunctionScope).toConstantValue(mockWorkspaceScope);
        container.bind(core_1.PreferenceService).toConstantValue(mockPreferenceService);
        container.bind(file_service_1.FileService).toConstantValue(mockFileService);
        container.bind(workspace_search_provider_1.WorkspaceSearchProvider).toSelf();
    });
    afterEach(() => {
        cancellationTokenSource.dispose();
    });
    it('should respect cancellation token at the beginning of the search', async () => {
        const searchProvider = container.get(workspace_search_provider_1.WorkspaceSearchProvider);
        cancellationTokenSource.cancel();
        const handler = searchProvider.getTool().handler;
        const result = await handler(JSON.stringify({ query: 'test', useRegExp: false }), mockCtx);
        const jsonResponse = JSON.parse(result);
        (0, chai_1.expect)(jsonResponse.error).to.equal('Operation cancelled by user');
    });
});
//# sourceMappingURL=workspace-search-provider.spec.js.map