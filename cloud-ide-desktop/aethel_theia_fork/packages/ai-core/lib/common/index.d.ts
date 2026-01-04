/**
 * Minimal shim for @theia/ai-core
 * Provides type definitions for AI IDE integration
 */

export interface LanguageModel {
    id: string;
    name: string;
    provider: string;
    status: { status: 'ready' | 'not-ready' | string; message?: string };
}

export interface LanguageModelRequirement {
    purpose: string;
    identifier: string;
}

export interface AIVariableContext {
    [key: string]: any;
}

export interface LanguageModelMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface LanguageModelResponse {
    content: string;
    model?: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

export function getJsonOfText(text: string): any;
export function getTextOfResponse(response: LanguageModelResponse): string;

export interface AgentService {
    getAgent(id: string): any;
    getAgents(): any[];
    getAllAgents(): any[];
    onDidChangeAgents(listener: () => void): any;
    isEnabled(agentId: string): boolean;
    enableAgent(agentId: string): void;
    disableAgent(agentId: string): void;
}

export const AgentService: unique symbol;

export interface Agent {
    id: string;
    name?: string;
    description?: string;
    tags?: string[];
    variables: string[];
    functions: string[];
    agentSpecificVariables: Array<{ name: string; description?: string; usedInPrompt?: boolean }>;
    prompts: any[];
}

export const Agent: unique symbol;

export interface AIVariableContribution {}

export const AIVariableContribution: unique symbol;

export interface AIVariable {
    id: string;
    name: string;
    description?: string;
    args?: Array<{ name: string; description?: string }>;
}

export interface AIVariableService {
    getVariables(): AIVariable[];
    onDidChangeVariables(listener: () => void): any;
    hasVariable(variableId: string): boolean;
}

export const AIVariableService: unique symbol;

export function bindToolProvider(...args: any[]): void;

export interface AISettingsService {
    getSetting(key: string): any;
    setSetting(key: string, value: any): void;
    onDidChange(listener: () => void): any;
    getAgentSettings(agentId: string): Promise<any>;
}

export const AISettingsService: unique symbol;

export interface PromptVariantSet {
    id: string;
    name?: string;
}

export interface BasePromptFragment {
    id: string;
    template: string;
}

export interface CustomizedPromptFragment extends BasePromptFragment {
    customizationId: string;
    priority?: any;
}

export type PromptFragment = BasePromptFragment | CustomizedPromptFragment;

export function isCustomizedPromptFragment(fragment: any): fragment is CustomizedPromptFragment;
export function isBasePromptFragment(fragment: any): fragment is BasePromptFragment;

export interface PromptService {
    getPrompt(id: string): any;
    registerPrompt(id: string, prompt: any): void;
    onPromptsChange(listener: () => void): any;
    getAllPromptFragments(): Map<string, PromptFragment[]>;
    getPromptVariantSets(): Map<string, string[]>;
    getActivePromptFragments(): PromptFragment[];
    getPromptFragment(promptId: string): BasePromptFragment | undefined;
    getVariantIds(promptVariantSetId: string): string[];
    getDefaultVariantId(promptVariantSetId: string): string | undefined;
    getSelectedVariantId(promptVariantSetId: string): string | undefined;
    getEffectiveVariantId(promptVariantSetId: string): string | undefined;
    onSelectedVariantChange(listener: (notification: { promptVariantSetId?: string; variantId?: string }) => void): any;
    updateSelectedVariantId(agentId: string, promptVariantSetId: string, variantId: string): void;
    editCustomization(promptFragmentId: string, customizationId: string): void;
    getCustomizationType(promptFragmentId: string, customizationId: string): Promise<string | undefined>;
    getCustomizationDescription(promptFragmentId: string, customizationId: string): Promise<string | undefined>;
    resetToCustomization(promptFragmentId: string, customizationId: string): Promise<void>;
    removeCustomization(promptFragmentId: string, customizationId: string): Promise<void>;
    createBuiltInCustomization(promptFragmentId: string): void;
    editBuiltInCustomization(variantId: string): void;
    resetToBuiltIn(variantId: string): void;
    resetAllToBuiltIn(): void;
}

export const PromptService: unique symbol;

export interface LanguageModelRegistry {
    getLanguageModels(): Promise<LanguageModel[]>;
    selectLanguageModel?(purpose: string, identifier?: string): LanguageModel | undefined;
    onChange(listener: (payload: { models?: LanguageModel[] }) => void): { dispose(): void };
}

export const LanguageModelRegistry: unique symbol;

export interface FrontendLanguageModelRegistry extends LanguageModelRegistry {}
export const FrontendLanguageModelRegistry: unique symbol;

export const PROMPT_FUNCTION_REGEX: RegExp;
export function matchVariablesRegEx(text: string): RegExpMatchArray[];

export interface PromptFragmentCustomizationService {
    getCustomAgentsLocations(): Promise<Array<string | { uri: any; exists?: boolean }>>;
    openCustomAgentYaml(uri: any): void;
}
export const PromptFragmentCustomizationService: unique symbol;

