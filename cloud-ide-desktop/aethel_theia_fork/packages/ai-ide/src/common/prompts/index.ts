/**
 * Centralized prompt template exports
 * All versioned prompt templates for AI agents
 */

export * from './orchestrator-prompt';
export * from './universal-prompt';
export * from './command-prompt';
export * from './app-tester-prompt';

import { orchestratorPromptTemplate } from './orchestrator-prompt';
import { universalPromptTemplate } from './universal-prompt';
import { commandPromptTemplate } from './command-prompt';
import { appTesterPromptTemplate } from './app-tester-prompt';

export const ALL_PROMPT_TEMPLATES = [
    orchestratorPromptTemplate,
    universalPromptTemplate,
    commandPromptTemplate,
    appTesterPromptTemplate
];

export function getPromptById(id: string) {
    return ALL_PROMPT_TEMPLATES.find(t => t.id === id);
}

export function getPromptByVersion(id: string, version: string) {
    return ALL_PROMPT_TEMPLATES.find(t => t.id === id && t.version === version);
}
