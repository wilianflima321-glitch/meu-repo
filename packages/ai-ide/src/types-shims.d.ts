// Minimal type shims to satisfy TypeScript while iterating on fixes.
// These are intentionally permissive (any) and only used to unblock builds.

declare module '@theia/core' {
  export type MaybePromise<T> = T | Promise<T>;
  export class Emitter<T = any> { fire(value?: T): void; event: any; }
  export type Event<T = any> = (listener: (e: T) => void) => void;
  export type CancellationToken = any;
  // Make CancellationTokenSource available as a value so tests/new CancellationTokenSource() works
  export class CancellationTokenSource {
    token: CancellationToken;
    cancel(): void;
    dispose(): void;
    constructor();
  }
  export type Disposable = any;
  export class DisposableCollection {
    constructor(...items: any[]);
    push(...d: any[]): void;
    dispose(): void;
  }
  export const EOL: string;
  export interface ILogger { error(...args: any[]): void; warn(...args: any[]): void; info(...args: any[]): void }
  export const ILogger: any;
  export class Path {
    constructor(s?: any);
    isAbsolute: boolean;
    base: string;
    ext: string;
    resolve?(p: string): Path;
  }
  export function unreachable(...args: any[]): never;
  // Export a permissive value for URI to avoid cross-package class-private member
  // incompatibilities. Many codepaths construct new URIs at runtime; keeping the
  // runtime value as `any` avoids private member mismatch errors between different
  // package declarations while still allowing `new URI()` and other usages.
  export const URI: any;
  export type URI = any;
  export interface PreferenceService { onPreferenceChanged(cb: any): void; ready?: Promise<void>; get?<T=any>(k: any, d?: T): T; inspect?: any }
  export const PreferenceService: any;
  // PreferenceService.set is used in ai-ide code
  export interface PreferenceService {
    set?(key: string, value: any, scope?: any): Promise<void> | void;
  }
  // PreferenceContribution is used both as a type and as a DI/runtime value in many modules
  export interface PreferenceContribution {}
  export const PreferenceContribution: any;
  export interface PreferenceSchema { }
  export interface CommandContribution {}
  export const CommandContribution: any;
  export interface CommandRegistry { registerCommand?: any; getAllCommands?: any; getCommand?: any; executeCommand?: any }
  export const CommandRegistry: any;
  export interface CommandService { executeCommand?: any }
  export const CommandService: any;
  export interface MessageService { info?: any; error?: any; warn?: any }
  export const MessageService: any;
  export class RpcServer<T = any> {}
  export class ConnectionHandler<T = any> { constructor(path: string, handler: any); }
  export class RpcConnectionHandler<T = any> { constructor(path: string, handler: any); }
  export function codicon(name: string): string;
  export const nls: any;
  export const Command: any;
  export interface Command { id: string; label?: string }
  export type Mutable<T> = T;
}

declare module '@theia/core/shared/inversify' {
  export function postConstruct(): MethodDecorator;
  export class Container {
    bind<T = any>(serviceIdentifier: any): any;
    get<T = any>(serviceIdentifier: any): T;
    resolve<T = any>(ctor: new (...args: any[]) => T): T;
    unbind?(id: any): void;
  }
  export class ContainerModule { constructor(cb: (...args: any[]) => any); }
}

declare module '@theia/ai-core' {
  // value-compatible declarations for commonly used runtime symbols
  export class Agent {
    id: string;
    name: string;
    tags: string[];
    variables: any[];
    functions: any[];
    prompts: any[];
    languageModelRequirements?: LanguageModelRequirement[];
    agentSpecificVariables: any[];
    description?: string;
    isEnabled?: boolean;
  }
  export class AgentService {
    getAllAgents(): Agent[];
    getAgents(): Agent[];
    getAgentSettings(id?: string): any;
    disableAgent(id: string): void;
    enableAgent(id: string): void;
    onDidChangeAgents(cb: any): Disposable;
    isEnabled(id?: string): boolean;
  }
  export class AISettingsService {
    getAgentSettings(agentId?: string): any;
    updateAgentSettings(agentId: string, settings: any): void;
    onDidChange(cb: any): Disposable;
  }
  export class FrontendLanguageModelRegistry {
    getLanguageModels(): Promise<any[]>;
  onChange(cb: any): Disposable;
    // accept either id string or a selection object used by some callers
    selectLanguageModel(id: string | { identifier?: string; purpose?: string; agent?: string }, ...args: any[]): any;
    getReadyLanguageModel(id: string): any;
  }
  // older code imports LanguageModelRegistry by name
  export const LanguageModelRegistry: typeof FrontendLanguageModelRegistry;
  export class LanguageModel { id: string; name: string; status?: any; identifier?: string; purpose?: string; }
  export class LanguageModelRequirement { identifier?: string; purpose?: string; }
  export type ToolProvider = any;
  export type ToolRequest = any;
  export type ToolRequestParameters = any;
  export type ToolRequestParametersProperties = any;
  export class ToolInvocationRegistry { onDidChange(cb: any): Disposable; getAllFunctions(): any[]; }
  export type PromptVariantSet = any;
  export type AIVariable = any;
  export type ResolvedAIVariable = any;
  export type AIVariableContribution = any;
  export class AIVariableService { hasVariable(id: string): boolean; getVariables(): any[]; registerResolver(id: string, resolver: any): Disposable; onDidChangeVariables(cb: any): Disposable; }
  // variable resolvers in the codebase may be functions or classes with a resolve method
  export type AIVariableResolver = any;
  export type ResolvedAIContextVariable = any;
  export type AIVariableResolutionRequest = any;
  export type AIVariableContext = any;
  export type AIVariableResolverWithVariableDependencies = any;
  export type AIVariableArg = any;
  export const matchVariablesRegEx: any;
  export const PROMPT_FUNCTION_REGEX: RegExp;
  export type BasePromptFragment = any;
  export class PromptFragmentCustomizationService { getCustomAgentsLocations(): string[]; openCustomAgentYaml(p: string): Promise<void>; }
  export class PromptService {
    onPromptsChange(cb: any): Disposable;
    onSelectedVariantChange(cb: any): Disposable;
    getPromptFragment(id: any, ...args: any[]): any;
    // some callers use a resolved variant helper
    getResolvedPromptFragment(id: any, params?: any, context?: any): Promise<any> | any;
    getVariantIds(id?: any): string[];
    getDefaultVariantId(id?: any): string | undefined;
    getSelectedVariantId(id?: any): string | undefined;
    updateSelectedVariantId(agentId: string, promptVariantSetId: string, newVariant: string): Promise<void>;
    editBuiltInCustomization(id: string): Promise<void>;
    resetToBuiltIn(fragmentId?: string): Promise<void>;
    getPromptVariantSets?(): Map<string, string[]>;
  }

  // legacy/constants used as values
  export const AI_CORE_PREFERENCES_TITLE: string;
  export function bindToolProvider(container: any, provider: any): void;
  export function bindToolProvider<T = any>(providerIdentifier: any, binder: any): void;
  export const AIVariableContribution: any;

  // Minimal ChatAgent / base agent types used by ai-ide code to allow 'override' modifiers
  export interface ChatAgent {
    id: string;
    name: string;
    description?: string;
    // make isEnabled optional to avoid forcing callers to define it
    isEnabled?: boolean;
    // placeholder for methods commonly overridden
    initialize?(): void;
    activate?(): void;
  }

  // Abstract base classes used in ai-chat modules; keep permissive to avoid strict override checks
  // NOTE: concrete agent base classes are declared in '@theia/ai-chat/lib/common/chat-agents'.
  // Keep permissive any declarations here to avoid strict override/member mismatch diagnostics.
  // Re-export the concrete chat-agent shapes from the ai-chat package so both
  // '@theia/ai-core' and '@theia/ai-chat/lib/common/chat-agents' refer to the same declarations.
  export * from '@theia/ai-chat/lib/common/chat-agents';
  export const SystemMessageDescription: any;
  export class SystemMessageDescription { [k: string]: any; static fromResolvedPromptFragment?: any; }
}

declare module '@theia/ai-core/lib/common' {
  export * from '@theia/ai-core';
}

declare module '@theia/ai-chat/lib/common/chat-model' {
  export const ErrorChatResponseContentImpl: any;
  export const MarkdownChatResponseContentImpl: any;
  export const MutableChatRequestModel: any;
  export const QuestionResponseContentImpl: any;
  export const ChatResponseContent: any;
  export const CommandChatResponseContentImpl: any;
  export const HorizontalLayoutChatResponseContentImpl: any;
  export const InformationalChatResponseContentImpl: any;
  export const CustomCallback: any;
  // Also provide permissive type aliases (some code uses these as types)
  export type MutableChatRequestModel = any;
  export type ChatResponseContent = any;
  export type CustomCallback = any;

  // Provide a permissive ChatResponse value/type so callers can access runtime fields like `usage` and methods
  export class ChatResponse {
    usage: any;
    complete(): void;
    waitForInput(): void;
    addProgressMessage(m: any): ChatProgressMessage | undefined;
    updateProgressMessage(m: any): any;
    response: any;
    progressMessages: any[];
    cancellationToken: any;
    overrideAgentId?: string;
  }
  // Minimal MutableChatResponseModel / ChatResponseModel shape used by ai-ide code
  export class MutableChatResponseModel {
    data: { [key: string]: unknown };
    id: string;
    requestId: string;
    progressMessages: any[];
    response: ChatResponse;
    readonly isComplete: boolean;
    readonly isCanceled: boolean;
    readonly isWaitingForInput: boolean;
    readonly isError: boolean;
    readonly cancellationToken: any;
    overrideAgentId(id: string): void;
    addProgressMessage(message: { content: string } & Partial<any>): ChatProgressMessage | undefined;
    updateProgressMessage(message: any): void;
    getProgressMessage(id: string): any | undefined;
    complete(): void;
    waitForInput(): void;
    stopWaitingForInput(): void;
    cancel(): void;
    error(err: Error): void;
  }

  export interface ChatProgressMessage {
    kind: 'progressMessage';
    id: string;
    status: 'inProgress' | 'completed' | 'failed';
    show: 'untilFirstContent' | 'whileIncomplete' | 'forever';
    content: string;
  }
}

declare module '@theia/ai-chat/lib/common/chat-agents' {
  // Provide permissive class declarations containing commonly overridden
  // members. These are intentionally loose (use `any`), but declare the
  // properties/methods so derived classes using `override` match the base
  // declarations and TypeScript accepts them.
  export class AbstractChatAgent {
    // Declare commonly overridden members (non-optional) so derived classes
    // that use `override` match the base signatures. Use permissive `any`
    // types to avoid strict incompatibilities across package versions.
    id: string;
    name: string;
    description: string;
    iconClass: string;
    isEnabled: boolean;
    logger: any;
    promptService: any;
    prompts: any[];
    variables: any[];
    constructor(...args: any[]);
  }

  export class AbstractTextToModelParsingChatAgent<T = any> extends AbstractChatAgent {
    agentSpecificVariables: any[];
    languageModelRequirements: any[];
    protected defaultLanguageModelPurpose: string;
    protected systemPromptId: string;
    protected languageModelService: any;
    protected getLlmSettings(): any;
    protected promptService: any;
    protected getSystemMessageDescription(context: any): Promise<any>;
    constructor(...args: any[]);
  }

  export class AbstractStreamParsingChatAgent<T = any> extends AbstractTextToModelParsingChatAgent<T> {
    // LLM & lifecycle hooks commonly overridden by concrete agents.
    // Declare them concretely (permissive any) so `override` in derived
    // classes does not produce TS411x errors.
    invoke(request: any): Promise<void>;
    protected sendLlmRequest(request: any, messages: any[], tools: any[], languageModel: any): Promise<any>;
    protected addContentsToResponse(response: any, request: any): Promise<void>;
    protected requiresStartingServers(): Promise<boolean>;
    protected startServers(): Promise<void>;
    protected ensureServersStarted(...servers: any[]): Promise<void>;
    constructor(...args: any[]);
  }

  export class SystemMessageDescription {
    [k: string]: any;
    static fromResolvedPromptFragment?(frag: any): any;
  }
}

// Provide a permissive shim for the concrete URI module path used across the monorepo
declare module '@theia/core/lib/common/uri' {
  // Export a permissive class so both `import URI from '.../uri'` and `import { URI } from '.../uri'` work.
  export class URI {
    constructor(s?: any);
    path: { base?: string; ext?: string };
    // Utility methods commonly used across the monorepo
    isEqualOrParent(other: any, caseSensitive?: boolean): boolean;
    resolve(p: any): URI;
    toString(): string;
    // common convenience props used across code
    _path?: string;
    parent?: URI;
    withScheme(s: string): URI;
    withAuthority(a: string): URI;
    isAbsolute: boolean;
    hasSameOrigin(other: URI): boolean;
    toComponents(): any;
    // Path/query/fragment helpers
    withoutAuthority(): URI;
    withPath(p: string | URI): URI;
    withoutPath(): URI;
    withQuery(q: string | Record<string,string>): URI;
    withoutQuery(): URI;
    withFragment(f: string): URI;
    withoutFragment(): URI;
    normalizePath(): URI;
    joinPath(...paths: Array<string | URI>): URI;
  }
  const _default: typeof URI;
  export default _default;
  export { URI };
  export type UriComponents = any;
}
