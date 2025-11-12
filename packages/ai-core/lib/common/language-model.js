"use strict";
// *****************************************************************************
// Copyright (C) 2024-2025 EclipseSource GmbH.
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
exports.DefaultLanguageModelRegistryImpl = exports.FrontendLanguageModelRegistry = exports.LanguageModelRegistry = exports.LanguageModel = exports.LanguageModelMetaData = exports.LanguageModelProvider = exports.isLanguageModelParsedResponse = exports.isLanguageModelStreamResponse = exports.isThinkingResponsePart = exports.isToolCallResponsePart = exports.isTextResponsePart = exports.isUsageResponsePart = exports.isLanguageModelStreamResponsePart = exports.isLanguageModelTextResponse = exports.ToolRequest = exports.isLanguageModelRequestMessage = exports.ImageContent = exports.LanguageModelMessage = void 0;
exports.isModelMatching = isModelMatching;
const tslib_1 = require("tslib");
const core_1 = require("@theia/core");
const inversify_1 = require("@theia/core/shared/inversify");
var LanguageModelMessage;
(function (LanguageModelMessage) {
    function isTextMessage(obj) {
        return obj.type === 'text';
    }
    LanguageModelMessage.isTextMessage = isTextMessage;
    function isThinkingMessage(obj) {
        return obj.type === 'thinking';
    }
    LanguageModelMessage.isThinkingMessage = isThinkingMessage;
    function isToolUseMessage(obj) {
        return obj.type === 'tool_use';
    }
    LanguageModelMessage.isToolUseMessage = isToolUseMessage;
    function isToolResultMessage(obj) {
        return obj.type === 'tool_result';
    }
    LanguageModelMessage.isToolResultMessage = isToolResultMessage;
    function isImageMessage(obj) {
        return obj.type === 'image';
    }
    LanguageModelMessage.isImageMessage = isImageMessage;
})(LanguageModelMessage || (exports.LanguageModelMessage = LanguageModelMessage = {}));
;
;
var ImageContent;
(function (ImageContent) {
    ImageContent.isUrl = (obj) => 'url' in obj;
    ImageContent.isBase64 = (obj) => 'base64data' in obj && 'mimeType' in obj;
})(ImageContent || (exports.ImageContent = ImageContent = {}));
const isLanguageModelRequestMessage = (obj) => !!(obj && typeof obj === 'object' &&
    'type' in obj &&
    typeof obj.type === 'string' &&
    obj.type === 'text' &&
    'query' in obj &&
    typeof obj.query === 'string');
exports.isLanguageModelRequestMessage = isLanguageModelRequestMessage;
var ToolRequest;
(function (ToolRequest) {
    function isToolRequestParameterProperty(obj) {
        if (!obj || typeof obj !== 'object') {
            return false;
        }
        const record = obj;
        // Check that at least one of "type" or "anyOf" exists
        if (!('type' in record) && !('anyOf' in record)) {
            return false;
        }
        // If an "anyOf" field is present, it must be an array where each item is also a valid property.
        if ('anyOf' in record) {
            if (!Array.isArray(record.anyOf)) {
                return false;
            }
            for (const item of record.anyOf) {
                if (!isToolRequestParameterProperty(item)) {
                    return false;
                }
            }
        }
        if ('type' in record && typeof record.type !== 'string') {
            return false;
        }
        // No further checks required for additional properties.
        return true;
    }
    function isToolRequestParametersProperties(obj) {
        if (!obj || typeof obj !== 'object') {
            return false;
        }
        return Object.entries(obj).every(([key, value]) => {
            if (typeof key !== 'string') {
                return false;
            }
            return isToolRequestParameterProperty(value);
        });
    }
    ToolRequest.isToolRequestParametersProperties = isToolRequestParametersProperties;
    function isToolRequestParameters(obj) {
        return !!obj && typeof obj === 'object' &&
            (!('type' in obj) || obj.type === 'object') &&
            'properties' in obj && isToolRequestParametersProperties(obj.properties) &&
            (!('required' in obj) || (Array.isArray(obj.required) && obj.required.every(prop => typeof prop === 'string')));
    }
    ToolRequest.isToolRequestParameters = isToolRequestParameters;
})(ToolRequest || (exports.ToolRequest = ToolRequest = {}));
const isLanguageModelTextResponse = (obj) => !!(obj && typeof obj === 'object' && 'text' in obj && typeof obj.text === 'string');
exports.isLanguageModelTextResponse = isLanguageModelTextResponse;
const isLanguageModelStreamResponsePart = (part) => (0, exports.isUsageResponsePart)(part) || (0, exports.isTextResponsePart)(part) || (0, exports.isThinkingResponsePart)(part) || (0, exports.isToolCallResponsePart)(part);
exports.isLanguageModelStreamResponsePart = isLanguageModelStreamResponsePart;
const isUsageResponsePart = (part) => !!(part && typeof part === 'object' &&
    'input_tokens' in part && typeof part.input_tokens === 'number' &&
    'output_tokens' in part && typeof part.output_tokens === 'number');
exports.isUsageResponsePart = isUsageResponsePart;
const isTextResponsePart = (part) => !!(part && typeof part === 'object' && 'content' in part && typeof part.content === 'string');
exports.isTextResponsePart = isTextResponsePart;
const isToolCallResponsePart = (part) => !!(part && typeof part === 'object' && 'tool_calls' in part && Array.isArray(part.tool_calls));
exports.isToolCallResponsePart = isToolCallResponsePart;
const isThinkingResponsePart = (part) => !!(part && typeof part === 'object' && 'thought' in part && typeof part.thought === 'string');
exports.isThinkingResponsePart = isThinkingResponsePart;
;
;
;
;
const isLanguageModelStreamResponse = (obj) => !!(obj && typeof obj === 'object' && 'stream' in obj);
exports.isLanguageModelStreamResponse = isLanguageModelStreamResponse;
const isLanguageModelParsedResponse = (obj) => !!(obj && typeof obj === 'object' && 'parsed' in obj && 'content' in obj);
exports.isLanguageModelParsedResponse = isLanguageModelParsedResponse;
///////////////////////////////////////////
// Language Model Provider
///////////////////////////////////////////
exports.LanguageModelProvider = Symbol('LanguageModelProvider');
var LanguageModelMetaData;
(function (LanguageModelMetaData) {
    function is(arg) {
        return (0, core_1.isObject)(arg) && 'id' in arg;
    }
    LanguageModelMetaData.is = is;
})(LanguageModelMetaData || (exports.LanguageModelMetaData = LanguageModelMetaData = {}));
var LanguageModel;
(function (LanguageModel) {
    function is(arg) {
        return (0, core_1.isObject)(arg) && 'id' in arg && (0, core_1.isFunction)(arg.request);
    }
    LanguageModel.is = is;
})(LanguageModel || (exports.LanguageModel = LanguageModel = {}));
exports.LanguageModelRegistry = Symbol('LanguageModelRegistry');
exports.FrontendLanguageModelRegistry = Symbol('FrontendLanguageModelRegistry');
let DefaultLanguageModelRegistryImpl = class DefaultLanguageModelRegistryImpl {
    constructor() {
        this.languageModels = [];
        this.initialized = new Promise(resolve => { this.markInitialized = resolve; });
        this.changeEmitter = new core_1.Emitter();
        this.onChange = this.changeEmitter.event;
    }
    init() {
        const contributions = this.languageModelContributions.getContributions();
        const promises = contributions.map(provider => provider());
        Promise.allSettled(promises).then(results => {
            for (const result of results) {
                if (result.status === 'fulfilled') {
                    this.languageModels.push(...result.value);
                }
                else {
                    this.logger.error('Failed to add some language models:', result.reason);
                }
            }
            this.markInitialized();
        });
    }
    addLanguageModels(models) {
        models.forEach(model => {
            if (this.languageModels.find(lm => lm.id === model.id)) {
                console.warn(`Tried to add already existing language model with id ${model.id}. The new model will be ignored.`);
                return;
            }
            this.languageModels.push(model);
            this.changeEmitter.fire({ models: this.languageModels });
        });
    }
    async getLanguageModels() {
        await this.initialized;
        return this.languageModels;
    }
    async getLanguageModel(id) {
        await this.initialized;
        return this.languageModels.find(model => model.id === id);
    }
    removeLanguageModels(ids) {
        ids.forEach(id => {
            const index = this.languageModels.findIndex(model => model.id === id);
            if (index !== -1) {
                this.languageModels.splice(index, 1);
                this.changeEmitter.fire({ models: this.languageModels });
            }
            else {
                console.warn(`Language model with id ${id} was requested to be removed, however it does not exist`);
            }
        });
    }
    async selectLanguageModels(request) {
        await this.initialized;
        // TODO check for actor and purpose against settings
        return this.languageModels.filter(model => model.status.status === 'ready' && isModelMatching(request, model));
    }
    async selectLanguageModel(request) {
        const models = await this.selectLanguageModels(request);
        return models ? models[0] : undefined;
    }
    async patchLanguageModel(id, patch) {
        await this.initialized;
        const model = this.languageModels.find(m => m.id === id);
        if (!model) {
            this.logger.warn(`Language model with id ${id} not found for patch.`);
            return;
        }
        Object.assign(model, patch);
        this.changeEmitter.fire({ models: this.languageModels });
    }
};
exports.DefaultLanguageModelRegistryImpl = DefaultLanguageModelRegistryImpl;
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.ILogger),
    tslib_1.__metadata("design:type", Object)
], DefaultLanguageModelRegistryImpl.prototype, "logger", void 0);
tslib_1.__decorate([
    (0, inversify_1.inject)(core_1.ContributionProvider),
    (0, inversify_1.named)(exports.LanguageModelProvider),
    tslib_1.__metadata("design:type", Object)
], DefaultLanguageModelRegistryImpl.prototype, "languageModelContributions", void 0);
tslib_1.__decorate([
    (0, inversify_1.postConstruct)(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], DefaultLanguageModelRegistryImpl.prototype, "init", null);
exports.DefaultLanguageModelRegistryImpl = DefaultLanguageModelRegistryImpl = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], DefaultLanguageModelRegistryImpl);
function isModelMatching(request, model) {
    return (!request.identifier || model.id === request.identifier) &&
        (!request.name || model.name === request.name) &&
        (!request.vendor || model.vendor === request.vendor) &&
        (!request.version || model.version === request.version) &&
        (!request.family || model.family === request.family);
}
//# sourceMappingURL=language-model.js.map