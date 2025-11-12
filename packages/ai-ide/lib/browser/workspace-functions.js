"use strict";
var GetWorkspaceDirectoryStructure_1, FileContentFunction_1, GetWorkspaceFileList_1, FileDiagnosticProvider_1, FindFilesByPattern_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FindFilesByPattern = exports.FileDiagnosticProvider = exports.GetWorkspaceFileList = exports.FileContentFunction = exports.GetWorkspaceDirectoryStructure = exports.WorkspaceFunctionScope = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@theia/core");
const inversify_1 = require("@theia/core/shared/inversify");
const file_service_1 = require("@theia/filesystem/lib/browser/file-service");
const browser_1 = require("@theia/workspace/lib/browser");
const workspace_functions_1 = require("../common/workspace-functions");
const ignore_1 = require("ignore");
const minimatch_1 = require("minimatch");
const browser_2 = require("@theia/core/lib/browser");
const workspace_preferences_1 = require("../common/workspace-preferences");
const monaco_workspace_1 = require("@theia/monaco/lib/browser/monaco-workspace");
const monaco_text_model_service_1 = require("@theia/monaco/lib/browser/monaco-text-model-service");
const browser_3 = require("@theia/markers/lib/browser");
const vscode_languageserver_protocol_1 = require("@theia/core/shared/vscode-languageserver-protocol");
let WorkspaceFunctionScope = class WorkspaceFunctionScope {
    GITIGNORE_FILE_NAME = '.gitignore';
    workspaceService;
    fileService;
    preferences;
    gitignoreMatcher;
    gitignoreWatcherInitialized = false;
    // Helper to safely access preference values. Some PreferenceService signatures
    // can be typed as possibly undefined; this helper centralizes the defaulting
    // behavior used across this file.
    safeGetPreference(key, defaultValue) {
        // preferences.get may be undefined in certain typings; guard at runtime.
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const getter = this.preferences?.get;
            if (typeof getter === 'function') {
                const v = getter.call(this.preferences, key, defaultValue);
                return v === undefined ? defaultValue : v;
            }
        }
        catch {
            // Fallthrough to default
        }
        return defaultValue;
    }
    async getWorkspaceRoot() {
        const wsRoots = await this.workspaceService.roots;
        if (wsRoots.length === 0) {
            throw new Error('No workspace has been opened yet');
        }
        return wsRoots[0].resource;
    }
    ensureWithinWorkspace(targetUri, workspaceRootUri) {
        if (!targetUri.toString().startsWith(workspaceRootUri.toString())) {
            throw new Error('Access outside of the workspace is not allowed');
        }
    }
    async resolveRelativePath(relativePath) {
        const workspaceRoot = await this.getWorkspaceRoot();
        return workspaceRoot.resolve(relativePath);
    }
    async initializeGitignoreWatcher(workspaceRoot) {
        if (this.gitignoreWatcherInitialized) {
            return;
        }
        const gitignoreUri = workspaceRoot.resolve(this.GITIGNORE_FILE_NAME);
        this.fileService.watch(gitignoreUri);
        this.fileService.onDidFilesChange(async (event) => {
            if (event.contains(gitignoreUri)) {
                this.gitignoreMatcher = undefined;
            }
        });
        this.gitignoreWatcherInitialized = true;
    }
    async shouldExclude(stat) {
        const shouldConsiderGitIgnore = this.safeGetPreference(workspace_preferences_1.CONSIDER_GITIGNORE_PREF, false);
        const userExcludePatterns = this.safeGetPreference(workspace_preferences_1.USER_EXCLUDE_PATTERN_PREF, []);
        if (this.isUserExcluded(stat.resource.path.base, userExcludePatterns)) {
            return true;
        }
        const workspaceRoot = await this.getWorkspaceRoot();
        if (shouldConsiderGitIgnore && (await this.isGitIgnored(stat, workspaceRoot))) {
            return true;
        }
        return false;
    }
    isUserExcluded(fileName, userExcludePatterns) {
        return userExcludePatterns.some(pattern => new minimatch_1.Minimatch(pattern, { dot: true }).match(fileName));
    }
    async isGitIgnored(stat, workspaceRoot) {
        await this.initializeGitignoreWatcher(workspaceRoot);
        const gitignoreUri = workspaceRoot.resolve(this.GITIGNORE_FILE_NAME);
        try {
            const fileStat = await this.fileService.resolve(gitignoreUri);
            if (fileStat) {
                if (!this.gitignoreMatcher) {
                    const gitignoreContent = await this.fileService.read(gitignoreUri);
                    this.gitignoreMatcher = (0, ignore_1.default)().add(gitignoreContent.value);
                }
                const relativePath = (workspaceRoot && typeof workspaceRoot.relative === 'function') ? workspaceRoot.relative(stat.resource) : undefined;
                if (relativePath) {
                    const relativePathStr = relativePath.toString() + (stat.isDirectory ? '/' : '');
                    if (this.gitignoreMatcher.ignores(relativePathStr)) {
                        return true;
                    }
                }
            }
        }
        catch {
            // If .gitignore does not exist or cannot be read, continue without error
        }
        return false;
    }
};
exports.WorkspaceFunctionScope = WorkspaceFunctionScope;
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_1.WorkspaceService),
    tslib_1.__metadata("design:type", browser_1.WorkspaceService)
], WorkspaceFunctionScope.prototype, "workspaceService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(file_service_1.FileService),
    tslib_1.__metadata("design:type", file_service_1.FileService)
], WorkspaceFunctionScope.prototype, "fileService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.PreferenceService),
    tslib_1.__metadata("design:type", Object)
], WorkspaceFunctionScope.prototype, "preferences", void 0);
exports.WorkspaceFunctionScope = WorkspaceFunctionScope = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], WorkspaceFunctionScope);
let GetWorkspaceDirectoryStructure = class GetWorkspaceDirectoryStructure {
    static { GetWorkspaceDirectoryStructure_1 = this; }
    static ID = workspace_functions_1.GET_WORKSPACE_DIRECTORY_STRUCTURE_FUNCTION_ID;
    getTool() {
        return {
            id: GetWorkspaceDirectoryStructure_1.ID,
            name: GetWorkspaceDirectoryStructure_1.ID,
            description: 'Retrieve the complete directory structure of the workspace, listing only directories (no file contents). ' +
                'This structure excludes specific directories, such as node_modules and hidden files, ensuring paths are within workspace boundaries.',
            parameters: {
                type: 'object',
                properties: {}
            },
            handler: (_, ctx) => {
                const cancellationToken = ctx.response.cancellationToken;
                return this.getDirectoryStructure(cancellationToken);
            },
        };
    }
    fileService;
    workspaceScope;
    async getDirectoryStructure(cancellationToken) {
        if (cancellationToken?.isCancellationRequested) {
            return { error: 'Operation cancelled by user' };
        }
        let workspaceRoot;
        try {
            workspaceRoot = await this.workspaceScope.getWorkspaceRoot();
        }
        catch (error) {
            return { error: error.message };
        }
        return this.buildDirectoryStructure(workspaceRoot, cancellationToken);
    }
    async buildDirectoryStructure(uri, cancellationToken) {
        if (cancellationToken?.isCancellationRequested) {
            return { error: 'Operation cancelled by user' };
        }
        const stat = await this.fileService.resolve(uri);
        const result = {};
        if (stat && stat.isDirectory && stat.children) {
            for (const child of stat.children) {
                if (cancellationToken?.isCancellationRequested) {
                    return { error: 'Operation cancelled by user' };
                }
                if (!child.isDirectory || (await this.workspaceScope.shouldExclude(child))) {
                    continue;
                }
                const dirName = child.resource.path.base;
                result[dirName] = await this.buildDirectoryStructure(child.resource, cancellationToken);
            }
        }
        return result;
    }
};
exports.GetWorkspaceDirectoryStructure = GetWorkspaceDirectoryStructure;
tslib_1.__decorate([
    (0, inversify_1.inject)(file_service_1.FileService),
    tslib_1.__metadata("design:type", file_service_1.FileService)
], GetWorkspaceDirectoryStructure.prototype, "fileService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(WorkspaceFunctionScope),
    tslib_1.__metadata("design:type", WorkspaceFunctionScope)
], GetWorkspaceDirectoryStructure.prototype, "workspaceScope", void 0);
exports.GetWorkspaceDirectoryStructure = GetWorkspaceDirectoryStructure = GetWorkspaceDirectoryStructure_1 = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], GetWorkspaceDirectoryStructure);
let FileContentFunction = class FileContentFunction {
    static { FileContentFunction_1 = this; }
    static ID = workspace_functions_1.FILE_CONTENT_FUNCTION_ID;
    getTool() {
        return {
            id: FileContentFunction_1.ID,
            name: FileContentFunction_1.ID,
            description: 'Return the content of a specified file within the workspace. ' +
                'The file path must be provided relative to the workspace root. Only files within ' +
                'workspace boundaries are accessible; attempting to access files outside the workspace will return an error.',
            parameters: {
                type: 'object',
                properties: {
                    file: {
                        type: 'string',
                        description: 'The relative path to the target file within the workspace. ' +
                            'This path is resolved from the workspace root, and only files within the workspace ' +
                            'boundaries are accessible. Attempting to access paths outside the workspace will result in an error.',
                    }
                },
                required: ['file']
            },
            handler: (arg_string, ctx) => {
                const file = this.parseArg(arg_string);
                const cancellationToken = ctx.response.cancellationToken;
                return this.getFileContent(file, cancellationToken);
            },
        };
    }
    fileService;
    workspaceScope;
    monacoWorkspace;
    parseArg(arg_string) {
        const result = JSON.parse(arg_string);
        return result.file;
    }
    async getFileContent(file, cancellationToken) {
        if (cancellationToken?.isCancellationRequested) {
            return JSON.stringify({ error: 'Operation cancelled by user' });
        }
        let targetUri;
        try {
            const workspaceRoot = await this.workspaceScope.getWorkspaceRoot();
            targetUri = workspaceRoot.resolve(file);
            this.workspaceScope.ensureWithinWorkspace(targetUri, workspaceRoot);
        }
        catch (error) {
            return JSON.stringify({ error: error.message });
        }
        try {
            if (cancellationToken?.isCancellationRequested) {
                return JSON.stringify({ error: 'Operation cancelled by user' });
            }
            const openEditorValue = this.monacoWorkspace.getTextDocument(targetUri.toString())?.getText();
            if (openEditorValue !== undefined) {
                return openEditorValue;
            }
            const fileContent = await this.fileService.read(targetUri);
            return fileContent.value;
        }
        catch (error) {
            return JSON.stringify({ error: 'File not found' });
        }
    }
};
exports.FileContentFunction = FileContentFunction;
tslib_1.__decorate([
    (0, inversify_1.inject)(file_service_1.FileService),
    tslib_1.__metadata("design:type", file_service_1.FileService)
], FileContentFunction.prototype, "fileService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(WorkspaceFunctionScope),
    tslib_1.__metadata("design:type", WorkspaceFunctionScope)
], FileContentFunction.prototype, "workspaceScope", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(monaco_workspace_1.MonacoWorkspace),
    tslib_1.__metadata("design:type", monaco_workspace_1.MonacoWorkspace)
], FileContentFunction.prototype, "monacoWorkspace", void 0);
exports.FileContentFunction = FileContentFunction = FileContentFunction_1 = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], FileContentFunction);
let GetWorkspaceFileList = class GetWorkspaceFileList {
    static { GetWorkspaceFileList_1 = this; }
    static ID = workspace_functions_1.GET_WORKSPACE_FILE_LIST_FUNCTION_ID;
    getTool() {
        return {
            id: GetWorkspaceFileList_1.ID,
            name: GetWorkspaceFileList_1.ID,
            parameters: {
                type: 'object',
                properties: {
                    path: {
                        type: 'string',
                        description: 'Optional relative path to a directory within the workspace. ' +
                            'If no path is specified, the function lists contents directly in the workspace root. ' +
                            'Paths are resolved within workspace boundaries only; paths outside the workspace or unvalidated paths will result in an error.'
                    }
                },
                required: ['path']
            },
            description: 'List files and directories within a specified workspace directory. ' +
                'Paths are relative to the workspace root, and only workspace-contained paths are allowed. ' +
                'If no path is provided, the root contents are listed. Paths outside the workspace will result in an error.',
            handler: (arg_string, ctx) => {
                const args = JSON.parse(arg_string);
                const cancellationToken = ctx.response.cancellationToken;
                return this.getProjectFileList(args.path, cancellationToken);
            },
        };
    }
    fileService;
    workspaceScope;
    async getProjectFileList(path, cancellationToken) {
        try {
            if (cancellationToken?.isCancellationRequested) {
                return JSON.stringify({ error: 'Operation cancelled by user' });
            }
            let workspaceRoot;
            try {
                workspaceRoot = await this.workspaceScope.getWorkspaceRoot();
            }
            catch (error) {
                if (cancellationToken?.isCancellationRequested) {
                    return JSON.stringify({ error: 'Operation cancelled by user' });
                }
                return JSON.stringify({ error: error.message });
            }
            const targetUri = path ? workspaceRoot.resolve(path) : workspaceRoot;
            this.workspaceScope.ensureWithinWorkspace(targetUri, workspaceRoot);
            try {
                if (cancellationToken?.isCancellationRequested) {
                    return JSON.stringify({ error: 'Operation cancelled by user' });
                }
                const stat = await this.fileService.resolve(targetUri);
                if (!stat || !stat.isDirectory) {
                    return JSON.stringify({ error: 'Directory not found' });
                }
                return await this.listFilesDirectly(targetUri, workspaceRoot, cancellationToken);
            }
            catch (error) {
                if (cancellationToken?.isCancellationRequested) {
                    return JSON.stringify({ error: 'Operation cancelled by user' });
                }
                return JSON.stringify({ error: 'Directory not found' });
            }
        }
        catch (error) {
            if (cancellationToken?.isCancellationRequested) {
                return JSON.stringify({ error: 'Operation cancelled by user' });
            }
            return JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
    async listFilesDirectly(uri, workspaceRootUri, cancellationToken) {
        if (cancellationToken?.isCancellationRequested) {
            return JSON.stringify({ error: 'Operation cancelled by user' });
        }
        const stat = await this.fileService.resolve(uri);
        const result = [];
        if (stat && stat.isDirectory) {
            if (cancellationToken?.isCancellationRequested) {
                return JSON.stringify({ error: 'Operation cancelled by user' });
            }
            if (await this.workspaceScope.shouldExclude(stat)) {
                return result;
            }
            const children = await this.fileService.resolve(uri);
            if (children.children) {
                for (const child of children.children) {
                    if (cancellationToken?.isCancellationRequested) {
                        return JSON.stringify({ error: 'Operation cancelled by user' });
                    }
                    if (await this.workspaceScope.shouldExclude(child)) {
                        continue;
                    }
                    const itemName = child.resource.path.base;
                    result.push(child.isDirectory ? `${itemName}/` : itemName);
                }
            }
        }
        return result;
    }
};
exports.GetWorkspaceFileList = GetWorkspaceFileList;
tslib_1.__decorate([
    (0, inversify_1.inject)(file_service_1.FileService),
    tslib_1.__metadata("design:type", file_service_1.FileService)
], GetWorkspaceFileList.prototype, "fileService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(WorkspaceFunctionScope),
    tslib_1.__metadata("design:type", WorkspaceFunctionScope)
], GetWorkspaceFileList.prototype, "workspaceScope", void 0);
exports.GetWorkspaceFileList = GetWorkspaceFileList = GetWorkspaceFileList_1 = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], GetWorkspaceFileList);
let FileDiagnosticProvider = class FileDiagnosticProvider {
    static { FileDiagnosticProvider_1 = this; }
    static ID = workspace_functions_1.GET_FILE_DIAGNOSTICS_ID;
    workspaceScope;
    problemManager;
    modelService;
    openerService;
    getTool() {
        return {
            id: FileDiagnosticProvider_1.ID,
            name: FileDiagnosticProvider_1.ID,
            description: 'A function to retrieve diagnostics associated with a specific file in the workspace. ' +
                'It will return a list of problems that includes the surrounding text a message describing the problem, ' +
                'and optionally a code and a codeDescription field describing that code.',
            parameters: {
                type: 'object',
                properties: {
                    file: {
                        type: 'string',
                        description: 'The relative path to the target file within the workspace. ' +
                            'This path is resolved from the workspace root, and only files within the workspace ' +
                            'boundaries are accessible. Attempting to access paths outside the workspace will result in an error.'
                    }
                },
                required: ['file']
            },
            handler: async (arg, ctx) => {
                try {
                    const { file } = JSON.parse(arg);
                    const workspaceRoot = await this.workspaceScope.getWorkspaceRoot();
                    const targetUri = workspaceRoot.resolve(file);
                    this.workspaceScope.ensureWithinWorkspace(targetUri, workspaceRoot);
                    // Safely extract cancellation token with type checks
                    const cancellationToken = ctx.response.cancellationToken;
                    return this.getDiagnosticsForFile(targetUri, cancellationToken);
                }
                catch (error) {
                    return JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error.' });
                }
            }
        };
    }
    async getDiagnosticsForFile(uri, cancellationToken) {
        const toDispose = [];
        try {
            // Check for early cancellation
            if (cancellationToken?.isCancellationRequested) {
                return JSON.stringify({ error: 'Operation cancelled by user' });
            }
            let markers = this.problemManager.findMarkers({ uri });
            if (markers.length === 0) {
                // Open editor to ensure that the language services are active.
                await (0, browser_2.open)(this.openerService, uri);
                // Give some time to fetch problems in a newly opened editor.
                await new Promise((res, rej) => {
                    const timeout = setTimeout(res, 5000);
                    // Give another moment for additional markers to come in from different sources.
                    const listener = this.problemManager.onDidChangeMarkers(changed => changed.isEqual(uri) && setTimeout(res, 500));
                    toDispose.push(listener);
                    // Handle cancellation
                    if (cancellationToken) {
                        const cancelListener = cancellationToken.onCancellationRequested(() => {
                            clearTimeout(timeout);
                            listener.dispose();
                            rej(new Error('Operation cancelled by user'));
                        });
                        toDispose.push(cancelListener);
                    }
                });
                markers = this.problemManager.findMarkers({ uri });
            }
            if (cancellationToken?.isCancellationRequested) {
                return JSON.stringify({ error: 'Operation cancelled by user' });
            }
            if (markers.length) {
                const editor = await this.modelService.createModelReference(uri);
                toDispose.push(editor);
                return JSON.stringify(markers.filter(marker => marker.data.severity !== vscode_languageserver_protocol_1.DiagnosticSeverity.Information && marker.data.severity !== vscode_languageserver_protocol_1.DiagnosticSeverity.Hint)
                    .map(marker => {
                    const contextRange = this.atLeastNLines(3, marker.data.range, editor.object.lineCount);
                    const text = editor.object.getText(contextRange);
                    const message = marker.data.message;
                    const code = marker.data.code;
                    const codeDescription = marker.data.codeDescription;
                    return { text, message, code, codeDescription };
                }));
            }
            return JSON.stringify({
                error: 'No diagnostics were found. The file may contain no problems, or language services may not be available. Retrying may return fresh results.'
            });
        }
        catch (err) {
            if (err.message === 'Operation cancelled by user') {
                return JSON.stringify({ error: 'Operation cancelled by user' });
            }
            console.warn('Error when fetching markers for', uri.toString(), err);
            return JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error when fetching for problems for ' + uri.toString() });
        }
        finally {
            toDispose.forEach(disposable => disposable.dispose());
        }
    }
    /**
     * Expands the range provided until it contains at least {@link desiredLines} lines or reaches the end of the document
     *  to attempt to provide the agent sufficient context to understand the diagnostic.
     */
    atLeastNLines(desiredLines, range, documentLineCount) {
        let startLine = range.start.line;
        let endLine = range.end.line;
        const desiredDifference = desiredLines - 1;
        while (endLine - startLine < desiredDifference && (startLine > 0 || endLine < documentLineCount - 1)) {
            if (startLine > 0) {
                startLine--;
            }
            else if (endLine < documentLineCount - 1) {
                endLine++;
            }
            if (endLine < documentLineCount - 1) {
                endLine++;
            }
            else if (startLine > 0) {
                startLine--;
            }
        }
        return { end: { character: Number.MAX_SAFE_INTEGER, line: endLine }, start: { character: 0, line: startLine } };
    }
};
exports.FileDiagnosticProvider = FileDiagnosticProvider;
tslib_1.__decorate([
    (0, inversify_1.inject)(WorkspaceFunctionScope),
    tslib_1.__metadata("design:type", WorkspaceFunctionScope)
], FileDiagnosticProvider.prototype, "workspaceScope", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_3.ProblemManager),
    tslib_1.__metadata("design:type", browser_3.ProblemManager)
], FileDiagnosticProvider.prototype, "problemManager", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(monaco_text_model_service_1.MonacoTextModelService),
    tslib_1.__metadata("design:type", monaco_text_model_service_1.MonacoTextModelService)
], FileDiagnosticProvider.prototype, "modelService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(browser_2.OpenerService),
    tslib_1.__metadata("design:type", Object)
], FileDiagnosticProvider.prototype, "openerService", void 0);
exports.FileDiagnosticProvider = FileDiagnosticProvider = FileDiagnosticProvider_1 = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], FileDiagnosticProvider);
let FindFilesByPattern = class FindFilesByPattern {
    static { FindFilesByPattern_1 = this; }
    static ID = workspace_functions_1.FIND_FILES_BY_PATTERN_FUNCTION_ID;
    workspaceScope;
    preferences;
    fileService;
    getTool() {
        return {
            id: FindFilesByPattern_1.ID,
            name: FindFilesByPattern_1.ID,
            description: 'Find files in the workspace that match a given glob pattern. ' +
                'This function allows efficient discovery of files using patterns like \'**/*.ts\' for all TypeScript files or ' +
                '\'src/**/*.js\' for JavaScript files in the src directory. The function respects gitignore patterns and user exclusions, ' +
                'returns relative paths from the workspace root, and limits results to 200 files maximum.',
            parameters: {
                type: 'object',
                properties: {
                    pattern: {
                        type: 'string',
                        description: 'Glob pattern to match files against. ' +
                            'Examples: \'**/*.ts\' (all TypeScript files), \'src/**/*.js\' (JS files in src), ' +
                            '\'**/*.{js,ts}\' (JS or TS files), \'**/test/**\' (files in test directories). ' +
                            'Patterns are matched against paths relative to the workspace root.'
                    },
                    exclude: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Optional array of glob patterns to exclude from results. ' +
                            'Examples: [\'**/*.spec.ts\', \'**/*.test.js\', \'node_modules/**\']. ' +
                            'If not specified, common exclusions like node_modules, .git, and dist are applied automatically.'
                    }
                },
                required: ['pattern']
            },
            handler: (arg_string, ctx) => {
                const args = JSON.parse(arg_string);
                const cancellationToken = ctx.response.cancellationToken;
                return this.findFiles(args.pattern, args.exclude, cancellationToken);
            },
        };
    }
    async findFiles(pattern, excludePatterns, cancellationToken) {
        if (cancellationToken?.isCancellationRequested) {
            return JSON.stringify({ error: 'Operation cancelled by user' });
        }
        let workspaceRoot;
        try {
            workspaceRoot = await this.workspaceScope.getWorkspaceRoot();
        }
        catch (error) {
            return JSON.stringify({ error: error.message });
        }
        try {
            // Build ignore patterns from gitignore and user preferences
            const ignorePatterns = await this.buildIgnorePatterns(workspaceRoot);
            const allExcludes = [...ignorePatterns];
            if (excludePatterns && excludePatterns.length > 0) {
                allExcludes.push(...excludePatterns);
            }
            if (cancellationToken?.isCancellationRequested) {
                return JSON.stringify({ error: 'Operation cancelled by user' });
            }
            const patternMatcher = new minimatch_1.Minimatch(pattern, { dot: false });
            const excludeMatchers = allExcludes.map(excludePattern => new minimatch_1.Minimatch(excludePattern, { dot: true }));
            const files = [];
            const maxResults = 200;
            await this.traverseDirectory(workspaceRoot, workspaceRoot, patternMatcher, excludeMatchers, files, maxResults, cancellationToken);
            if (cancellationToken?.isCancellationRequested) {
                return JSON.stringify({ error: 'Operation cancelled by user' });
            }
            const result = {
                files: files.slice(0, maxResults)
            };
            if (files.length > maxResults) {
                result.totalFound = files.length;
                result.truncated = true;
            }
            return JSON.stringify(result);
        }
        catch (error) {
            return JSON.stringify({ error: `Failed to find files: ${error.message}` });
        }
    }
    async buildIgnorePatterns(workspaceRoot) {
        const patterns = [];
        // Get user exclude patterns from preferences
        const userExcludePatterns = this.workspaceScope.safeGetPreference(workspace_preferences_1.USER_EXCLUDE_PATTERN_PREF, []);
        patterns.push(...userExcludePatterns);
        // Add gitignore patterns if enabled
        const shouldConsiderGitIgnore = this.workspaceScope.safeGetPreference(workspace_preferences_1.CONSIDER_GITIGNORE_PREF, false);
        if (shouldConsiderGitIgnore) {
            try {
                const gitignoreUri = workspaceRoot.resolve('.gitignore');
                const gitignoreContent = await this.fileService.read(gitignoreUri);
                const gitignoreLines = gitignoreContent.value
                    .split('\n')
                    .map(line => line.trim())
                    .filter(line => line && !line.startsWith('#'));
                patterns.push(...gitignoreLines);
            }
            catch {
                // Gitignore file doesn't exist or can't be read, continue without it
            }
        }
        return patterns;
    }
    async traverseDirectory(currentUri, workspaceRoot, patternMatcher, excludeMatchers, results, maxResults, cancellationToken) {
        if (cancellationToken?.isCancellationRequested || results.length >= maxResults) {
            return;
        }
        try {
            const stat = await this.fileService.resolve(currentUri);
            if (!stat || !stat.isDirectory || !stat.children) {
                return;
            }
            for (const child of stat.children) {
                if (cancellationToken?.isCancellationRequested || results.length >= maxResults) {
                    break;
                }
                const relativePathRaw = (workspaceRoot && typeof workspaceRoot.relative === 'function') ? workspaceRoot.relative(child.resource)?.toString() : undefined;
                if (!relativePathRaw) {
                    continue;
                }
                // Narrow to a definite string before using inside callbacks so TypeScript
                // does not consider it possibly undefined inside the matcher lambdas.
                const relativePathStr = relativePathRaw;
                const shouldExclude = excludeMatchers.some(matcher => matcher.match(relativePathStr)) ||
                    (await this.workspaceScope.shouldExclude(child));
                if (shouldExclude) {
                    continue;
                }
                if (child.isDirectory) {
                    await this.traverseDirectory(child.resource, workspaceRoot, patternMatcher, excludeMatchers, results, maxResults, cancellationToken);
                }
                else if (patternMatcher.match(relativePathStr)) {
                    results.push(relativePathStr);
                }
            }
        }
        catch {
            // If we can't access a directory, skip it
        }
    }
};
exports.FindFilesByPattern = FindFilesByPattern;
tslib_1.__decorate([
    (0, inversify_1.inject)(WorkspaceFunctionScope),
    tslib_1.__metadata("design:type", WorkspaceFunctionScope)
], FindFilesByPattern.prototype, "workspaceScope", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.PreferenceService),
    tslib_1.__metadata("design:type", Object)
], FindFilesByPattern.prototype, "preferences", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(file_service_1.FileService),
    tslib_1.__metadata("design:type", file_service_1.FileService)
], FindFilesByPattern.prototype, "fileService", void 0);
exports.FindFilesByPattern = FindFilesByPattern = FindFilesByPattern_1 = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], FindFilesByPattern);
//# sourceMappingURL=workspace-functions.js.map