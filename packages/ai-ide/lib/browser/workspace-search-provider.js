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
exports.WorkspaceSearchProvider = void 0;
const tslib_1 = require("tslib");
const preference_service_1 = require("@theia/core/lib/common/preferences/preference-service");
const inversify_1 = require("@theia/core/shared/inversify");
const file_service_1 = require("@theia/filesystem/lib/browser/file-service");
const search_in_workspace_service_1 = require("@theia/search-in-workspace/lib/browser/search-in-workspace-service");
const workspace_functions_1 = require("../common/workspace-functions");
const workspace_functions_2 = require("./workspace-functions");
const workspace_preferences_1 = require("../common/workspace-preferences");
const workspace_search_provider_util_1 = require("../common/workspace-search-provider-util");
let WorkspaceSearchProvider = class WorkspaceSearchProvider {
    searchService;
    workspaceScope;
    preferenceService;
    fileService;
    getTool() {
        return {
            id: workspace_functions_1.SEARCH_IN_WORKSPACE_FUNCTION_ID,
            name: workspace_functions_1.SEARCH_IN_WORKSPACE_FUNCTION_ID,
            description: 'Searches the content of files within the workspace for lines matching the given search term (`query`). \
            The search uses case-insensitive string matching or regular expressions (controlled by the `useRegExp` parameter). \
            It returns a list of matching files, including the file path (URI), the line number, and the full text content of each matching line. \
            Multi-word patterns must match exactly (including spaces, case-insensitively). \
            For best results, use specific search terms and consider filtering by file extensions or limiting to specific subdirectories to avoid overwhelming results. \
            For complex searches, prefer multiple simpler queries over one complex query or regular expression.',
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'The search term or regular expression pattern.',
                    },
                    useRegExp: {
                        type: 'boolean',
                        description: 'Set to true if the query is a regular expression.',
                    },
                    fileExtensions: {
                        type: 'array',
                        items: {
                            type: 'string'
                        },
                        description: 'Optional array of file extensions to search in (e.g., ["ts", "js", "py"]). If not specified, searches all files.'
                    },
                    subDirectoryPath: {
                        type: 'string',
                        description: 'Optional subdirectory path to limit search scope. Use relative paths from workspace root ' +
                            '(e.g., "packages/ai-ide/src", "packages/core/src/browser"). If not specified, searches entire workspace.'
                    }
                },
                required: ['query', 'useRegExp']
            },
            handler: (argString, ctx) => this.handleSearch(argString, ctx?.response?.cancellationToken)
        };
    }
    async determineSearchRoots(subDirectoryPath) {
        const workspaceRoot = await this.workspaceScope.getWorkspaceRoot();
        if (!subDirectoryPath) {
            return [workspaceRoot.toString()];
        }
        const subDirUri = workspaceRoot.resolve(subDirectoryPath);
        this.workspaceScope.ensureWithinWorkspace(subDirUri, workspaceRoot);
        try {
            const stat = await this.fileService.resolve(subDirUri);
            if (!stat || !stat.isDirectory) {
                throw new Error(`Subdirectory '${subDirectoryPath}' does not exist or is not a directory`);
            }
        }
        catch (error) {
            throw new Error(`Invalid subdirectory path '${subDirectoryPath}': ${error.message}`);
        }
        return [subDirUri.toString()];
    }
    async handleSearch(argString, cancellationToken) {
        try {
            const args = JSON.parse(argString);
            const results = [];
            let expectedSearchId;
            let searchCompleted = false;
            cancellationToken?.onCancellationRequested(() => {
                if (expectedSearchId !== undefined && !searchCompleted) {
                    this.searchService.cancel(expectedSearchId);
                    searchCompleted = true;
                }
            });
            if (cancellationToken?.isCancellationRequested) {
                return JSON.stringify({ error: 'Operation cancelled by user' });
            }
            const searchPromise = new Promise(async (resolve, reject) => {
                const callbacks = {
                    onResult: (id, result) => {
                        if (expectedSearchId !== undefined && id !== expectedSearchId) {
                            return;
                        }
                        if (searchCompleted) {
                            return;
                        }
                        results.push(result);
                    },
                    onDone: (id, error) => {
                        if (expectedSearchId !== undefined && id !== expectedSearchId) {
                            return;
                        }
                        if (searchCompleted) {
                            return;
                        }
                        searchCompleted = true;
                        if (error) {
                            reject(new Error('Search failed: ' + error));
                        }
                        else {
                            resolve(results);
                        }
                    }
                };
                // Use one more than our actual maximum. this way we can determine if we have more results than our maximum and warn the user
                const maxResultsForTheiaAPI = this.preferenceService.get(workspace_preferences_1.SEARCH_IN_WORKSPACE_MAX_RESULTS_PREF, 30) + 1;
                const options = {
                    useRegExp: args.useRegExp,
                    matchCase: false,
                    matchWholeWord: false,
                    maxResults: maxResultsForTheiaAPI,
                };
                if (args.fileExtensions && args.fileExtensions.length > 0) {
                    options.include = args.fileExtensions.map(ext => `**/*.${ext}`);
                }
                await this.determineSearchRoots(args.subDirectoryPath)
                    .then(rootUris => this.searchService.searchWithCallback(args.query, rootUris, callbacks, options))
                    .then(id => {
                    expectedSearchId = id;
                    cancellationToken?.onCancellationRequested(() => {
                        this.searchService.cancel(id);
                    });
                })
                    .catch(err => {
                    searchCompleted = true;
                    reject(err);
                });
            });
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                    if (expectedSearchId !== undefined && !searchCompleted) {
                        this.searchService.cancel(expectedSearchId);
                        searchCompleted = true;
                        reject(new Error('Search timed out after 30 seconds'));
                    }
                }, 30000);
            });
            const finalResults = await Promise.race([searchPromise, timeoutPromise]);
            const maxResults = this.preferenceService.get(workspace_preferences_1.SEARCH_IN_WORKSPACE_MAX_RESULTS_PREF, 30);
            const workspaceRoot = await this.workspaceScope.getWorkspaceRoot();
            const formattedResults = (0, workspace_search_provider_util_1.optimizeSearchResults)(finalResults, workspaceRoot);
            let numberOfMatchesInFinalResults = 0;
            for (const result of finalResults) {
                numberOfMatchesInFinalResults += result.matches.length;
            }
            if (numberOfMatchesInFinalResults > maxResults) {
                return JSON.stringify({
                    info: 'Search limit exceeded: Found ' + maxResults + '+ results. ' +
                        'Please refine your search with more specific terms or use file extension filters. ' +
                        'You can increase the limit in preferences under \'ai-features.workspaceFunctions.searchMaxResults\'.',
                    incompleteResults: formattedResults
                });
            }
            return JSON.stringify(formattedResults);
        }
        catch (error) {
            return JSON.stringify({ error: error.message || 'Failed to execute search' });
        }
    }
};
exports.WorkspaceSearchProvider = WorkspaceSearchProvider;
tslib_1.__decorate([
    (0, inversify_1.inject)(search_in_workspace_service_1.SearchInWorkspaceService),
    tslib_1.__metadata("design:type", search_in_workspace_service_1.SearchInWorkspaceService)
], WorkspaceSearchProvider.prototype, "searchService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(workspace_functions_2.WorkspaceFunctionScope),
    tslib_1.__metadata("design:type", workspace_functions_2.WorkspaceFunctionScope)
], WorkspaceSearchProvider.prototype, "workspaceScope", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(preference_service_1.PreferenceService),
    tslib_1.__metadata("design:type", Object)
], WorkspaceSearchProvider.prototype, "preferenceService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(file_service_1.FileService),
    tslib_1.__metadata("design:type", file_service_1.FileService)
], WorkspaceSearchProvider.prototype, "fileService", void 0);
exports.WorkspaceSearchProvider = WorkspaceSearchProvider = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], WorkspaceSearchProvider);
//# sourceMappingURL=workspace-search-provider.js.map