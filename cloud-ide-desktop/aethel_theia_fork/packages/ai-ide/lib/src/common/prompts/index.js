"use strict";
/**
 * Centralized prompt template exports
 * All versioned prompt templates for AI agents
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_PROMPT_TEMPLATES = void 0;
exports.getPromptById = getPromptById;
exports.getPromptByVersion = getPromptByVersion;
__exportStar(require("./orchestrator-prompt"), exports);
__exportStar(require("./universal-prompt"), exports);
__exportStar(require("./command-prompt"), exports);
__exportStar(require("./app-tester-prompt"), exports);
const orchestrator_prompt_1 = require("./orchestrator-prompt");
const universal_prompt_1 = require("./universal-prompt");
const command_prompt_1 = require("./command-prompt");
const app_tester_prompt_1 = require("./app-tester-prompt");
exports.ALL_PROMPT_TEMPLATES = [
    orchestrator_prompt_1.orchestratorPromptTemplate,
    universal_prompt_1.universalPromptTemplate,
    command_prompt_1.commandPromptTemplate,
    app_tester_prompt_1.appTesterPromptTemplate
];
function getPromptById(id) {
    return exports.ALL_PROMPT_TEMPLATES.find(t => t.id === id);
}
function getPromptByVersion(id, version) {
    return exports.ALL_PROMPT_TEMPLATES.find(t => t.id === id && t.version === version);
}
