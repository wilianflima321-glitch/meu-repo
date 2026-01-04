"use strict";
// Minimal preference schema for AI provider configuration.
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiConfigurationPreferences = void 0;
exports.AiConfigurationPreferences = {
    type: 'object',
    properties: {
        'ai.providers': {
            type: 'array',
            default: [],
            description: 'List of configured LLM providers.'
        },
        'ai.defaultProviderId': {
            type: 'string',
            default: '',
            description: 'Default provider id used for requests.'
        }
    }
};
