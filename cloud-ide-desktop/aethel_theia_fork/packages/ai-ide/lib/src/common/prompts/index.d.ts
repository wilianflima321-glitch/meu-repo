/**
 * Centralized prompt template exports
 * All versioned prompt templates for AI agents
 */
export * from './orchestrator-prompt';
export * from './universal-prompt';
export * from './command-prompt';
export * from './app-tester-prompt';
export declare const ALL_PROMPT_TEMPLATES: {
    id: string;
    version: string;
    template: string;
    checksum: string;
}[];
export declare function getPromptById(id: string): {
    id: string;
    version: string;
    template: string;
    checksum: string;
} | undefined;
export declare function getPromptByVersion(id: string, version: string): {
    id: string;
    version: string;
    template: string;
    checksum: string;
} | undefined;
