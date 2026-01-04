"use strict";
// Minimal preference schema for ai-ide.
// The real Theia preference system accepts a JSON schema-like object.
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiIdePreferenceSchema = void 0;
exports.aiIdePreferenceSchema = {
    type: 'object',
    properties: {
        'ai-ide.enabled': {
            type: 'boolean',
            default: true,
            description: 'Enable/disable AI IDE features.'
        }
    }
};
