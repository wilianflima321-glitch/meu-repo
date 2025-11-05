"use strict";
var SuggestFileContent_1, WriteFileContent_1, SimpleSuggestFileReplacements_1, SimpleWriteFileReplacements_1, SuggestFileReplacements_1, WriteFileReplacements_1, ClearFileChanges_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultFileChangeSetTitleProvider = exports.GetProposedFileState = exports.ClearFileChanges = exports.WriteFileReplacements = exports.SuggestFileReplacements = exports.SimpleWriteFileReplacements = exports.SimpleSuggestFileReplacements = exports.ReplaceContentInFileFunctionHelper = exports.WriteFileContent = exports.SuggestFileContent = exports.FileChangeSetTitleProvider = void 0;
const tslib_1 = require("tslib");
const change_set_file_element_1 = require("@theia/ai-chat/lib/browser/change-set-file-element");
const content_replacer_1 = require("@theia/core/lib/common/content-replacer");
const inversify_1 = require("@theia/core/shared/inversify");
const file_service_1 = require("@theia/filesystem/lib/browser/file-service");
const workspace_functions_1 = require("./workspace-functions");
const core_1 = require("@theia/core");
const file_changeset_function_ids_1 = require("../common/file-changeset-function-ids");
exports.FileChangeSetTitleProvider = Symbol('FileChangeSetTitleProvider');
let SuggestFileContent = class SuggestFileContent {
    static { SuggestFileContent_1 = this; }
    static ID = file_changeset_function_ids_1.SUGGEST_FILE_CONTENT_ID;
    workspaceFunctionScope;
    fileService;
    fileChangeFactory;
    fileChangeSetTitleProvider;
    getTool() {
        return {
            id: SuggestFileContent_1.ID,
            name: SuggestFileContent_1.ID,
            description: `Proposes writing content to a file. If the file exists, it will be overwritten with the provided content.\n
             If the file does not exist, it will be created. This tool will automatically create any directories needed to write the file.\n
             If the new content is empty, the file will be deleted. To move a file, delete it and re-create it at the new location.\n
             The proposed changes will be applied when the user accepts. If called again for the same file, previously proposed changes will be overridden.`,
            parameters: {
                type: 'object',
                properties: {
                    path: {
                        type: 'string',
                        description: 'The path of the file to write to.'
                    },
                    content: {
                        type: 'string',
                        description: `The content to write to the file. ALWAYS provide the COMPLETE intended content of the file, without any truncation or omissions.\n
                         You MUST include ALL parts of the file, even if they haven\'t been modified.`
                    }
                },
                required: ['path', 'content']
            },
            handler: async (args, ctx) => {
                if (ctx?.response?.cancellationToken?.isCancellationRequested) {
                    return JSON.stringify({ error: 'Operation cancelled by user' });
                }
                const { path, content } = JSON.parse(args);
                const chatSessionId = ctx.session.id;
                const uri = await this.workspaceFunctionScope.resolveRelativePath(path);
                let type = 'modify';
                if (content === '') {
                    type = 'delete';
                }
                if (!(await this.fileService.exists(uri))) {
                    type = 'add';
                }
                ctx.session.changeSet.addElements(this.fileChangeFactory({
                    uri: uri,
                    type,
                    state: 'pending',
                    targetState: content,
                    requestId: ctx.id,
                    chatSessionId
                }));
                ctx.session.changeSet.setTitle(this.fileChangeSetTitleProvider.getChangeSetTitle(ctx));
                return `Proposed writing to file ${path}. The user will review and potentially apply the changes`;
            }
        };
    }
};
exports.SuggestFileContent = SuggestFileContent;
tslib_1.__decorate([
    (0, inversify_1.inject)(workspace_functions_1.WorkspaceFunctionScope),
    tslib_1.__metadata("design:type", workspace_functions_1.WorkspaceFunctionScope)
], SuggestFileContent.prototype, "workspaceFunctionScope", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(file_service_1.FileService),
    tslib_1.__metadata("design:type", file_service_1.FileService)
], SuggestFileContent.prototype, "fileService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(change_set_file_element_1.ChangeSetFileElementFactory),
    tslib_1.__metadata("design:type", Function)
], SuggestFileContent.prototype, "fileChangeFactory", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(exports.FileChangeSetTitleProvider),
    tslib_1.__metadata("design:type", Object)
], SuggestFileContent.prototype, "fileChangeSetTitleProvider", void 0);
exports.SuggestFileContent = SuggestFileContent = SuggestFileContent_1 = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], SuggestFileContent);
let WriteFileContent = class WriteFileContent {
    static { WriteFileContent_1 = this; }
    static ID = file_changeset_function_ids_1.WRITE_FILE_CONTENT_ID;
    workspaceFunctionScope;
    fileService;
    fileChangeFactory;
    fileChangeSetTitleProvider;
    getTool() {
        return {
            id: WriteFileContent_1.ID,
            name: WriteFileContent_1.ID,
            description: `Immediately writes content to a file. If the file exists, it will be overwritten with the provided content.\n
             If the file does not exist, it will be created. This tool will automatically create any directories needed to write the file.\n
             If the new content is empty, the file will be deleted. To move a file, delete it and re-create it at the new location.\n
             Unlike suggestFileContent, this function applies the changes immediately without user confirmation.`,
            parameters: {
                type: 'object',
                properties: {
                    path: {
                        type: 'string',
                        description: 'The path of the file to write to.'
                    },
                    content: {
                        type: 'string',
                        description: `The content to write to the file. ALWAYS provide the COMPLETE intended content of the file, without any truncation or omissions.\n
                         You MUST include ALL parts of the file, even if they haven\'t been modified.`
                    }
                },
                required: ['path', 'content']
            },
            handler: async (args, ctx) => {
                if (ctx?.response?.cancellationToken?.isCancellationRequested) {
                    return JSON.stringify({ error: 'Operation cancelled by user' });
                }
                const { path, content } = JSON.parse(args);
                const chatSessionId = ctx.session.id;
                const uri = await this.workspaceFunctionScope.resolveRelativePath(path);
                let type = 'modify';
                if (content === '') {
                    type = 'delete';
                }
                if (!(await this.fileService.exists(uri))) {
                    type = 'add';
                }
                // Create the file change element
                const fileElement = this.fileChangeFactory({
                    uri: uri,
                    type: type,
                    state: 'pending',
                    targetState: content,
                    requestId: ctx.id,
                    chatSessionId
                });
                ctx.session.changeSet.setTitle(this.fileChangeSetTitleProvider.getChangeSetTitle(ctx));
                // Add the element to the change set
                ctx.session.changeSet.addElements(fileElement);
                try {
                    // Immediately apply the change
                    await fileElement.apply();
                    return `Successfully wrote content to file ${path}.`;
                }
                catch (error) {
                    return `Failed to write content to file ${path}: ${error.message}`;
                }
            }
        };
    }
};
exports.WriteFileContent = WriteFileContent;
tslib_1.__decorate([
    (0, inversify_1.inject)(workspace_functions_1.WorkspaceFunctionScope),
    tslib_1.__metadata("design:type", workspace_functions_1.WorkspaceFunctionScope)
], WriteFileContent.prototype, "workspaceFunctionScope", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(file_service_1.FileService),
    tslib_1.__metadata("design:type", file_service_1.FileService)
], WriteFileContent.prototype, "fileService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(change_set_file_element_1.ChangeSetFileElementFactory),
    tslib_1.__metadata("design:type", Function)
], WriteFileContent.prototype, "fileChangeFactory", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(exports.FileChangeSetTitleProvider),
    tslib_1.__metadata("design:type", Object)
], WriteFileContent.prototype, "fileChangeSetTitleProvider", void 0);
exports.WriteFileContent = WriteFileContent = WriteFileContent_1 = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], WriteFileContent);
let ReplaceContentInFileFunctionHelper = class ReplaceContentInFileFunctionHelper {
    workspaceFunctionScope;
    fileService;
    fileChangeFactory;
    fileChangeSetTitleProvider;
    replacer;
    constructor() {
        this.replacer = new content_replacer_1.ContentReplacer();
    }
    getToolMetadata(supportMultipleReplace = false, immediateApplication = false) {
        const replacementProperties = {
            oldContent: {
                type: 'string',
                description: 'The exact content to be replaced. Must match exactly, including whitespace, comments, etc.'
            },
            newContent: {
                type: 'string',
                description: 'The new content to insert in place of matched old content.'
            }
        };
        if (supportMultipleReplace) {
            replacementProperties.multiple = {
                type: 'boolean',
                description: 'Set to true if multiple occurrences of the oldContent are expected to be replaced.'
            };
        }
        const replacementParameters = {
            type: 'object',
            properties: {
                path: {
                    type: 'string',
                    description: 'The path of the file where content will be replaced.'
                },
                replacements: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: replacementProperties,
                        required: ['oldContent', 'newContent']
                    },
                    description: 'An array of replacement objects, each containing oldContent and newContent strings.'
                },
                reset: {
                    type: 'boolean',
                    description: 'Set to true to clear any existing pending changes for this file and start fresh. Default is false, which merges with existing changes.'
                }
            },
            required: ['path', 'replacements']
        };
        const replacementSentence = supportMultipleReplace
            ? 'By default, a single occurrence of each old content in the tuples is expected to be replaced. If the optional \'multiple\' flag is set to true, all occurrences will\
             be replaced. In either case, if the number of occurrences in the file does not match the expectation the function will return an error. \
             In that case try a different approach.'
            : 'A single occurrence of each old content in the tuples is expected to be replaced. If the number of occurrences in the file does not match the expectation,\
              the function will return an error. In that case try a different approach.';
        const applicationText = immediateApplication
            ? 'The changes will be applied immediately without user confirmation.'
            : 'The proposed changes will be applied when the user accepts.';
        const replacementDescription = `Propose to replace sections of content in an existing file by providing a list of tuples with old content to be matched and replaced.
            ${replacementSentence}. For deletions, use an empty new content in the tuple.
            Make sure you use the same line endings and whitespace as in the original file content. ${applicationText}
            Multiple calls for the same file will merge replacements unless the reset parameter is set to true. Use the reset parameter to clear previous changes and start
            fresh if needed.`;
        return {
            description: replacementDescription,
            parameters: replacementParameters
        };
    }
    async createChangesetFromToolCall(toolCallString, ctx) {
        try {
            if (ctx?.response?.cancellationToken?.isCancellationRequested) {
                return JSON.stringify({ error: 'Operation cancelled by user' });
            }
            const result = await this.processReplacementsCommon(toolCallString, ctx, this.fileChangeSetTitleProvider.getChangeSetTitle(ctx));
            if (result.errors.length > 0) {
                return `Errors encountered: ${result.errors.join('; ')}`;
            }
            if (result.fileElement) {
                const action = result.reset ? 'reset and applied' : 'applied';
                return `Proposed replacements ${action} to file ${result.path}. The user will review and potentially apply the changes.`;
            }
            else {
                return `No changes needed for file ${result.path}. Content already matches the requested state.`;
            }
        }
        catch (error) {
            console.debug('Error processing replacements:', error.message);
            return JSON.stringify({ error: error.message });
        }
    }
    async writeChangesetFromToolCall(toolCallString, ctx) {
        try {
            if (ctx?.response?.cancellationToken?.isCancellationRequested) {
                return JSON.stringify({ error: 'Operation cancelled by user' });
            }
            const result = await this.processReplacementsCommon(toolCallString, ctx, this.fileChangeSetTitleProvider.getChangeSetTitle(ctx));
            if (result.errors.length > 0) {
                return `Errors encountered: ${result.errors.join('; ')}`;
            }
            if (result.fileElement) {
                // Immediately apply the change
                await result.fileElement.apply();
                const action = result.reset ? 'reset and' : '';
                return `Successfully ${action} applied replacements to file ${result.path}.`;
            }
            else {
                return `No changes needed for file ${result.path}. Content already matches the requested state.`;
            }
        }
        catch (error) {
            console.debug('Error processing replacements:', error.message);
            return JSON.stringify({ error: error.message });
        }
    }
    async processReplacementsCommon(toolCallString, ctx, changeSetTitle) {
        if (ctx?.response?.cancellationToken?.isCancellationRequested) {
            throw new Error('Operation cancelled by user');
        }
        const { path, replacements, reset } = JSON.parse(toolCallString);
        const fileUri = await this.workspaceFunctionScope.resolveRelativePath(path);
        // Get the starting content - either original file or existing proposed state
        let startingContent;
        if (reset || !ctx.session.changeSet) {
            // Start from original file content
            startingContent = (await this.fileService.read(fileUri)).value.toString();
        }
        else {
            // Start from existing proposed state if available
            const existingElement = this.findExistingChangeElement(ctx.session.changeSet, fileUri);
            if (existingElement) {
                startingContent = existingElement.targetState || (await this.fileService.read(fileUri)).value.toString();
            }
            else {
                startingContent = (await this.fileService.read(fileUri)).value.toString();
            }
        }
        if (ctx?.response?.cancellationToken?.isCancellationRequested) {
            throw new Error('Operation cancelled by user');
        }
        const { updatedContent, errors } = this.replacer.applyReplacements(startingContent, replacements);
        if (errors.length > 0) {
            return { fileElement: undefined, path, reset: reset || false, errors };
        }
        // Only create/update changeset if content actually changed
        const originalContent = (await this.fileService.read(fileUri)).value.toString();
        if (updatedContent !== originalContent) {
            ctx.session.changeSet.setTitle(changeSetTitle);
            const fileElement = this.fileChangeFactory({
                uri: fileUri,
                type: 'modify',
                state: 'pending',
                targetState: updatedContent,
                requestId: ctx.id,
                chatSessionId: ctx.session.id
            });
            ctx.session.changeSet.addElements(fileElement);
            return { fileElement, path, reset: reset || false, errors: [] };
        }
        else {
            return { fileElement: undefined, path, reset: reset || false, errors: [] };
        }
    }
    findExistingChangeElement(changeSet, fileUri) {
        const element = changeSet.getElementByURI(fileUri);
        if (element instanceof change_set_file_element_1.ChangeSetFileElement) {
            return element;
        }
    }
    async clearFileChanges(path, ctx) {
        try {
            if (ctx?.response?.cancellationToken?.isCancellationRequested) {
                return JSON.stringify({ error: 'Operation cancelled by user' });
            }
            const fileUri = await this.workspaceFunctionScope.resolveRelativePath(path);
            if (ctx.session.changeSet.removeElements(fileUri)) {
                return `Cleared pending change(s) for file ${path}.`;
            }
            else {
                return `No pending changes found for file ${path}.`;
            }
        }
        catch (error) {
            console.debug('Error clearing file changes:', error.message);
            return JSON.stringify({ error: error.message });
        }
    }
    async getProposedFileState(path, ctx) {
        try {
            if (ctx?.response?.cancellationToken?.isCancellationRequested) {
                return JSON.stringify({ error: 'Operation cancelled by user' });
            }
            const fileUri = await this.workspaceFunctionScope.resolveRelativePath(path);
            if (!ctx.session.changeSet) {
                // No changeset exists, return original file content
                const originalContent = (await this.fileService.read(fileUri)).value.toString();
                return `File ${path} has no pending changes. Original content:\n\n${originalContent}`;
            }
            const existingElement = this.findExistingChangeElement(ctx.session.changeSet, fileUri);
            if (existingElement && existingElement.targetState) {
                return `File ${path} has pending changes. Proposed content:\n\n${existingElement.targetState}`;
            }
            else {
                // No pending changes for this file
                const originalContent = (await this.fileService.read(fileUri)).value.toString();
                return `File ${path} has no pending changes. Original content:\n\n${originalContent}`;
            }
        }
        catch (error) {
            console.debug('Error getting proposed file state:', error.message);
            return JSON.stringify({ error: error.message });
        }
    }
};
exports.ReplaceContentInFileFunctionHelper = ReplaceContentInFileFunctionHelper;
tslib_1.__decorate([
    (0, inversify_1.inject)(workspace_functions_1.WorkspaceFunctionScope),
    tslib_1.__metadata("design:type", workspace_functions_1.WorkspaceFunctionScope)
], ReplaceContentInFileFunctionHelper.prototype, "workspaceFunctionScope", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(file_service_1.FileService),
    tslib_1.__metadata("design:type", file_service_1.FileService)
], ReplaceContentInFileFunctionHelper.prototype, "fileService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(change_set_file_element_1.ChangeSetFileElementFactory),
    tslib_1.__metadata("design:type", Function)
], ReplaceContentInFileFunctionHelper.prototype, "fileChangeFactory", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(exports.FileChangeSetTitleProvider),
    tslib_1.__metadata("design:type", Object)
], ReplaceContentInFileFunctionHelper.prototype, "fileChangeSetTitleProvider", void 0);
exports.ReplaceContentInFileFunctionHelper = ReplaceContentInFileFunctionHelper = tslib_1.__decorate([
    (0, inversify_1.injectable)(),
    tslib_1.__metadata("design:paramtypes", [])
], ReplaceContentInFileFunctionHelper);
let SimpleSuggestFileReplacements = class SimpleSuggestFileReplacements {
    static { SimpleSuggestFileReplacements_1 = this; }
    static ID = 'simpleSuggestFileReplacements';
    replaceContentInFileFunctionHelper;
    getTool() {
        const metadata = this.replaceContentInFileFunctionHelper.getToolMetadata();
        return {
            id: SimpleSuggestFileReplacements_1.ID,
            name: SimpleSuggestFileReplacements_1.ID,
            description: metadata.description,
            parameters: metadata.parameters,
            handler: async (args, ctx) => {
                if (ctx?.response?.cancellationToken?.isCancellationRequested) {
                    return JSON.stringify({ error: 'Operation cancelled by user' });
                }
                return this.replaceContentInFileFunctionHelper.createChangesetFromToolCall(args, ctx);
            }
        };
    }
};
exports.SimpleSuggestFileReplacements = SimpleSuggestFileReplacements;
tslib_1.__decorate([
    (0, inversify_1.inject)(ReplaceContentInFileFunctionHelper),
    tslib_1.__metadata("design:type", ReplaceContentInFileFunctionHelper)
], SimpleSuggestFileReplacements.prototype, "replaceContentInFileFunctionHelper", void 0);
exports.SimpleSuggestFileReplacements = SimpleSuggestFileReplacements = SimpleSuggestFileReplacements_1 = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], SimpleSuggestFileReplacements);
let SimpleWriteFileReplacements = class SimpleWriteFileReplacements {
    static { SimpleWriteFileReplacements_1 = this; }
    static ID = 'simpleWriteFileReplacements';
    replaceContentInFileFunctionHelper;
    getTool() {
        const metadata = this.replaceContentInFileFunctionHelper.getToolMetadata(false, true);
        return {
            id: SimpleWriteFileReplacements_1.ID,
            name: SimpleWriteFileReplacements_1.ID,
            description: metadata.description,
            parameters: metadata.parameters,
            handler: async (args, ctx) => {
                if (ctx?.response?.cancellationToken?.isCancellationRequested) {
                    return JSON.stringify({ error: 'Operation cancelled by user' });
                }
                return this.replaceContentInFileFunctionHelper.writeChangesetFromToolCall(args, ctx);
            }
        };
    }
};
exports.SimpleWriteFileReplacements = SimpleWriteFileReplacements;
tslib_1.__decorate([
    (0, inversify_1.inject)(ReplaceContentInFileFunctionHelper),
    tslib_1.__metadata("design:type", ReplaceContentInFileFunctionHelper)
], SimpleWriteFileReplacements.prototype, "replaceContentInFileFunctionHelper", void 0);
exports.SimpleWriteFileReplacements = SimpleWriteFileReplacements = SimpleWriteFileReplacements_1 = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], SimpleWriteFileReplacements);
let SuggestFileReplacements = class SuggestFileReplacements {
    static { SuggestFileReplacements_1 = this; }
    static ID = file_changeset_function_ids_1.SUGGEST_FILE_REPLACEMENTS_ID;
    replaceContentInFileFunctionHelper;
    getTool() {
        const metadata = this.replaceContentInFileFunctionHelper.getToolMetadata(true);
        return {
            id: SuggestFileReplacements_1.ID,
            name: SuggestFileReplacements_1.ID,
            description: metadata.description,
            parameters: metadata.parameters,
            handler: async (args, ctx) => {
                if (ctx?.response?.cancellationToken?.isCancellationRequested) {
                    return JSON.stringify({ error: 'Operation cancelled by user' });
                }
                return this.replaceContentInFileFunctionHelper.createChangesetFromToolCall(args, ctx);
            }
        };
    }
};
exports.SuggestFileReplacements = SuggestFileReplacements;
tslib_1.__decorate([
    (0, inversify_1.inject)(ReplaceContentInFileFunctionHelper),
    tslib_1.__metadata("design:type", ReplaceContentInFileFunctionHelper)
], SuggestFileReplacements.prototype, "replaceContentInFileFunctionHelper", void 0);
exports.SuggestFileReplacements = SuggestFileReplacements = SuggestFileReplacements_1 = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], SuggestFileReplacements);
let WriteFileReplacements = class WriteFileReplacements {
    static { WriteFileReplacements_1 = this; }
    static ID = file_changeset_function_ids_1.WRITE_FILE_REPLACEMENTS_ID;
    replaceContentInFileFunctionHelper;
    getTool() {
        const metadata = this.replaceContentInFileFunctionHelper.getToolMetadata(true, true);
        return {
            id: WriteFileReplacements_1.ID,
            name: WriteFileReplacements_1.ID,
            description: metadata.description,
            parameters: metadata.parameters,
            handler: async (args, ctx) => {
                if (ctx?.response?.cancellationToken?.isCancellationRequested) {
                    return JSON.stringify({ error: 'Operation cancelled by user' });
                }
                return this.replaceContentInFileFunctionHelper.writeChangesetFromToolCall(args, ctx);
            }
        };
    }
};
exports.WriteFileReplacements = WriteFileReplacements;
tslib_1.__decorate([
    (0, inversify_1.inject)(ReplaceContentInFileFunctionHelper),
    tslib_1.__metadata("design:type", ReplaceContentInFileFunctionHelper)
], WriteFileReplacements.prototype, "replaceContentInFileFunctionHelper", void 0);
exports.WriteFileReplacements = WriteFileReplacements = WriteFileReplacements_1 = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], WriteFileReplacements);
let ClearFileChanges = class ClearFileChanges {
    static { ClearFileChanges_1 = this; }
    static ID = file_changeset_function_ids_1.CLEAR_FILE_CHANGES_ID;
    replaceContentInFileFunctionHelper;
    getTool() {
        return {
            id: ClearFileChanges_1.ID,
            name: ClearFileChanges_1.ID,
            description: 'Clears all pending changes for a specific file, allowing you to start fresh with new modifications.',
            parameters: {
                type: 'object',
                properties: {
                    path: {
                        type: 'string',
                        description: 'The path of the file to clear pending changes for.'
                    }
                },
                required: ['path']
            },
            handler: async (args, ctx) => {
                if (ctx?.response?.cancellationToken?.isCancellationRequested) {
                    return JSON.stringify({ error: 'Operation cancelled by user' });
                }
                const { path } = JSON.parse(args);
                return this.replaceContentInFileFunctionHelper.clearFileChanges(path, ctx);
            }
        };
    }
};
exports.ClearFileChanges = ClearFileChanges;
tslib_1.__decorate([
    (0, inversify_1.inject)(ReplaceContentInFileFunctionHelper),
    tslib_1.__metadata("design:type", ReplaceContentInFileFunctionHelper)
], ClearFileChanges.prototype, "replaceContentInFileFunctionHelper", void 0);
exports.ClearFileChanges = ClearFileChanges = ClearFileChanges_1 = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], ClearFileChanges);
let GetProposedFileState = class GetProposedFileState {
    static ID = file_changeset_function_ids_1.GET_PROPOSED_CHANGES_ID;
    replaceContentInFileFunctionHelper;
    getTool() {
        return {
            id: file_changeset_function_ids_1.GET_PROPOSED_CHANGES_ID,
            name: file_changeset_function_ids_1.GET_PROPOSED_CHANGES_ID,
            description: 'Returns the current proposed state of a file, including all pending changes that have been proposed ' +
                'but not yet applied. This allows you to inspect the current state before making additional changes.',
            parameters: {
                type: 'object',
                properties: {
                    path: {
                        type: 'string',
                        description: 'The path of the file to get the proposed state for.'
                    }
                },
                required: ['path']
            },
            handler: async (args, ctx) => {
                if (ctx?.response?.cancellationToken?.isCancellationRequested) {
                    return JSON.stringify({ error: 'Operation cancelled by user' });
                }
                const { path } = JSON.parse(args);
                return this.replaceContentInFileFunctionHelper.getProposedFileState(path, ctx);
            }
        };
    }
};
exports.GetProposedFileState = GetProposedFileState;
tslib_1.__decorate([
    (0, inversify_1.inject)(ReplaceContentInFileFunctionHelper),
    tslib_1.__metadata("design:type", ReplaceContentInFileFunctionHelper)
], GetProposedFileState.prototype, "replaceContentInFileFunctionHelper", void 0);
exports.GetProposedFileState = GetProposedFileState = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], GetProposedFileState);
let DefaultFileChangeSetTitleProvider = class DefaultFileChangeSetTitleProvider {
    getChangeSetTitle(ctx) {
        return core_1.nls.localize('theia/ai-chat/fileChangeSetTitle', 'Changes proposed');
    }
};
exports.DefaultFileChangeSetTitleProvider = DefaultFileChangeSetTitleProvider;
exports.DefaultFileChangeSetTitleProvider = DefaultFileChangeSetTitleProvider = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], DefaultFileChangeSetTitleProvider);
//# sourceMappingURL=file-changeset-functions.js.map