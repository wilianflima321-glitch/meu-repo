"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatViewLanguageContribution = exports.CHAT_VIEW_LANGUAGE_EXTENSION = exports.SETTINGS_LANGUAGE_ID = exports.CHAT_VIEW_LANGUAGE_ID = void 0;
const tslib_1 = require("tslib");
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
const ai_chat_1 = require("@theia/ai-chat");
const common_1 = require("@theia/ai-core/lib/common");
const prompt_text_1 = require("@theia/ai-core/lib/common/prompt-text");
const tool_invocation_registry_1 = require("@theia/ai-core/lib/common/tool-invocation-registry");
const core_1 = require("@theia/core");
const inversify_1 = require("@theia/core/shared/inversify");
const monaco = require("@theia/monaco-editor-core");
const ai_chat_frontend_contribution_1 = require("@theia/ai-chat/lib/browser/ai-chat-frontend-contribution");
exports.CHAT_VIEW_LANGUAGE_ID = 'theia-ai-chat-view-language';
exports.SETTINGS_LANGUAGE_ID = 'theia-ai-chat-settings-language';
exports.CHAT_VIEW_LANGUAGE_EXTENSION = 'aichatviewlanguage';
const VARIABLE_RESOLUTION_CONTEXT = { context: 'chat-input-autocomplete' };
const VARIABLE_ARGUMENT_PICKER_COMMAND = 'trigger-variable-argument-picker';
let ChatViewLanguageContribution = class ChatViewLanguageContribution {
    onStart(_app) {
        monaco.languages.register({ id: exports.CHAT_VIEW_LANGUAGE_ID, extensions: [exports.CHAT_VIEW_LANGUAGE_EXTENSION] });
        monaco.languages.register({ id: exports.SETTINGS_LANGUAGE_ID, extensions: ['json'], filenames: ['editor'] });
        this.registerCompletionProviders();
        monaco.editor.registerCommand(VARIABLE_ARGUMENT_PICKER_COMMAND, this.triggerVariableArgumentPicker.bind(this));
    }
    registerCompletionProviders() {
        this.registerStandardCompletionProvider({
            triggerCharacter: prompt_text_1.PromptText.AGENT_CHAR,
            getItems: () => this.agentService.getAgents(),
            kind: monaco.languages.CompletionItemKind.Value,
            getId: agent => `${agent.id} `,
            getName: agent => agent.name,
            getDescription: agent => agent.description
        });
        this.registerStandardCompletionProvider({
            triggerCharacter: prompt_text_1.PromptText.VARIABLE_CHAR,
            getItems: () => this.variableService.getVariables(),
            kind: monaco.languages.CompletionItemKind.Variable,
            getId: variable => { var _a; return ((_a = variable.args) === null || _a === void 0 ? void 0 : _a.some(arg => !arg.isOptional)) ? variable.name + prompt_text_1.PromptText.VARIABLE_SEPARATOR_CHAR : `${variable.name} `; },
            getName: variable => variable.name,
            getDescription: variable => variable.description,
            command: {
                title: core_1.nls.localize('theia/ai/chat-ui/selectVariableArguments', 'Select variable arguments'),
                id: VARIABLE_ARGUMENT_PICKER_COMMAND,
            }
        });
        this.registerStandardCompletionProvider({
            triggerCharacter: prompt_text_1.PromptText.FUNCTION_CHAR,
            getItems: () => this.toolInvocationRegistry.getAllFunctions(),
            kind: monaco.languages.CompletionItemKind.Function,
            getId: tool => `${tool.id} `,
            getName: tool => tool.name,
            getDescription: tool => { var _a; return (_a = tool.description) !== null && _a !== void 0 ? _a : ''; }
        });
        // Register the variable argument completion provider (special case)
        monaco.languages.registerCompletionItemProvider(exports.CHAT_VIEW_LANGUAGE_ID, {
            triggerCharacters: [prompt_text_1.PromptText.VARIABLE_CHAR, prompt_text_1.PromptText.VARIABLE_SEPARATOR_CHAR],
            provideCompletionItems: (model, position, _context, _token) => this.provideVariableWithArgCompletions(model, position),
        });
    }
    registerStandardCompletionProvider(source) {
        monaco.languages.registerCompletionItemProvider(exports.CHAT_VIEW_LANGUAGE_ID, {
            triggerCharacters: [source.triggerCharacter],
            provideCompletionItems: (model, position, _context, _token) => this.provideCompletions(model, position, source),
        });
    }
    getCompletionRange(model, position, triggerCharacter) {
        const wordInfo = model.getWordUntilPosition(position);
        const lineContent = model.getLineContent(position.lineNumber);
        // one to the left, and -1 for 0-based index
        const characterBeforeCurrentWord = lineContent[wordInfo.startColumn - 1 - 1];
        if (characterBeforeCurrentWord !== triggerCharacter) {
            return undefined;
        }
        // we are not at the beginning of the line
        if (wordInfo.startColumn > 2) {
            const charBeforeTrigger = model.getValueInRange({
                startLineNumber: position.lineNumber,
                startColumn: wordInfo.startColumn - 2,
                endLineNumber: position.lineNumber,
                endColumn: wordInfo.startColumn - 1
            });
            // If the character before the trigger is not whitespace, don't provide completions
            if (!/\s/.test(charBeforeTrigger)) {
                return undefined;
            }
        }
        return new monaco.Range(position.lineNumber, wordInfo.startColumn, position.lineNumber, position.column);
    }
    provideCompletions(model, position, source) {
        const completionRange = this.getCompletionRange(model, position, source.triggerCharacter);
        if (completionRange === undefined) {
            return { suggestions: [] };
        }
        const items = source.getItems();
        const suggestions = items.map(item => ({
            insertText: source.getId(item),
            kind: source.kind,
            label: source.getName(item),
            range: completionRange,
            detail: source.getDescription(item),
            command: source.command
        }));
        return { suggestions };
    }
    async provideVariableWithArgCompletions(model, position) {
        // Get the text of the current line up to the cursor position
        const textUntilPosition = model.getValueInRange({
            startLineNumber: position.lineNumber,
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
        });
        // Regex that captures the variable name in contexts like "#varname" or "#var-name:args"
        // Matches only when # is at the beginning of the string or after whitespace
        const variableRegex = /(?:^|\s)#([\w-]*)/;
        const match = textUntilPosition.match(variableRegex);
        if (!match) {
            return { suggestions: [] };
        }
        const currentVariableName = match[1];
        const hasColonSeparator = textUntilPosition.includes(`${currentVariableName}:`);
        const variables = this.variableService.getVariables();
        const suggestions = [];
        for (const variable of variables) {
            // If we have a variable:arg pattern, only process the matching variable
            if (hasColonSeparator && variable.name !== currentVariableName) {
                continue;
            }
            const provider = await this.variableService.getArgumentCompletionProvider(variable.name);
            if (provider) {
                const items = await provider(model, position);
                if (items) {
                    suggestions.push(...items.map(item => ({
                        command: {
                            title: ai_chat_frontend_contribution_1.VARIABLE_ADD_CONTEXT_COMMAND.label,
                            id: ai_chat_frontend_contribution_1.VARIABLE_ADD_CONTEXT_COMMAND.id,
                            arguments: [variable.name, item.insertText]
                        },
                        ...item,
                    })));
                }
            }
        }
        return { suggestions };
    }
    async triggerVariableArgumentPicker() {
        var _a;
        const inputEditor = monaco.editor.getEditors().find(editor => editor.hasTextFocus());
        if (!inputEditor) {
            return;
        }
        const model = inputEditor.getModel();
        const position = inputEditor.getPosition();
        if (!model || !position) {
            return;
        }
        // // Get the word at cursor
        const wordInfo = model.getWordUntilPosition(position);
        // account for the variable separator character if present
        let endOfWordPosition = position.column;
        if (wordInfo.word === '' && this.getCharacterBeforePosition(model, position) === prompt_text_1.PromptText.VARIABLE_SEPARATOR_CHAR) {
            endOfWordPosition = position.column - 1;
        }
        else {
            return;
        }
        const variableName = (_a = model.getWordAtPosition({ ...position, column: endOfWordPosition })) === null || _a === void 0 ? void 0 : _a.word;
        if (!variableName) {
            return;
        }
        const provider = await this.variableService.getArgumentPicker(variableName, VARIABLE_RESOLUTION_CONTEXT);
        if (!provider) {
            return;
        }
        const arg = await provider(VARIABLE_RESOLUTION_CONTEXT);
        if (!arg) {
            return;
        }
        inputEditor.executeEdits('variable-argument-picker', [{
                range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
                text: arg
            }]);
        await this.chatFrontendContribution.addContextVariable(variableName, arg);
    }
    getCharacterBeforePosition(model, position) {
        return model.getLineContent(position.lineNumber)[position.column - 1 - 1];
    }
};
exports.ChatViewLanguageContribution = ChatViewLanguageContribution;
tslib_1.__decorate([
    (0, inversify_1.inject)(ai_chat_1.ChatAgentService),
    tslib_1.__metadata("design:type", Object)
], ChatViewLanguageContribution.prototype, "agentService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(common_1.AIVariableService),
    tslib_1.__metadata("design:type", Object)
], ChatViewLanguageContribution.prototype, "variableService", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(tool_invocation_registry_1.ToolInvocationRegistry),
    tslib_1.__metadata("design:type", Object)
], ChatViewLanguageContribution.prototype, "toolInvocationRegistry", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(ai_chat_frontend_contribution_1.AIChatFrontendContribution),
    tslib_1.__metadata("design:type", ai_chat_frontend_contribution_1.AIChatFrontendContribution)
], ChatViewLanguageContribution.prototype, "chatFrontendContribution", void 0);
exports.ChatViewLanguageContribution = ChatViewLanguageContribution = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], ChatViewLanguageContribution);
//# sourceMappingURL=chat-view-language-contribution.js.map