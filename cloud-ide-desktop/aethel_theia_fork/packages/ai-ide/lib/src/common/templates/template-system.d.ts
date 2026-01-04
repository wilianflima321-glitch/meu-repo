/**
 * Template System - Professional Project Template Infrastructure
 *
 * Sistema de templates de projetos profissional para IDE de produção.
 * Inspirado em VS Code, JetBrains, Unity Hub, Unreal Engine.
 * Suporta:
 * - Templates pré-definidos (React, Vue, Angular, Unity, Unreal, Godot)
 * - Templates customizados
 * - Template variables e prompts
 * - Post-creation hooks
 * - Template marketplace
 * - Git integration
 * - Multi-language support
 */
type Event<T> = (listener: (e: T) => void) => {
    dispose: () => void;
};
/**
 * Template type
 */
export declare enum TemplateType {
    React = "react",
    NextJS = "nextjs",
    Vue = "vue",
    Nuxt = "nuxt",
    Angular = "angular",
    Svelte = "svelte",
    SvelteKit = "sveltekit",
    Astro = "astro",
    Remix = "remix",
    Solid = "solid",
    Qwik = "qwik",
    ReactNative = "react-native",
    Flutter = "flutter",
    Expo = "expo",
    Ionic = "ionic",
    Express = "express",
    NestJS = "nestjs",
    Fastify = "fastify",
    Django = "django",
    FastAPI = "fastapi",
    Flask = "flask",
    Spring = "spring",
    Electron = "electron",
    Tauri = "tauri",
    Unity = "unity",
    UnrealEngine = "unreal",
    Godot = "godot",
    Phaser = "phaser",
    Babylon = "babylon",
    Three = "threejs",
    PlayCanvas = "playcanvas",
    Processing = "processing",
    P5js = "p5js",
    OpenFrameworks = "openframeworks",
    TensorFlow = "tensorflow",
    PyTorch = "pytorch",
    Langchain = "langchain",
    Library = "library",
    CLI = "cli",
    Plugin = "plugin",
    API = "api",
    Monorepo = "monorepo",
    Custom = "custom"
}
/**
 * Template category
 */
export declare enum TemplateCategory {
    Web = "web",
    Mobile = "mobile",
    Backend = "backend",
    Desktop = "desktop",
    GameDev = "gamedev",
    Graphics = "graphics",
    AIML = "ai-ml",
    Library = "library",
    Fullstack = "fullstack",
    Other = "other"
}
/**
 * Template language
 */
export declare enum TemplateLanguage {
    TypeScript = "typescript",
    JavaScript = "javascript",
    Python = "python",
    Rust = "rust",
    Go = "go",
    CSharp = "csharp",
    CPlusPlus = "cpp",
    Java = "java",
    Kotlin = "kotlin",
    Swift = "swift",
    Dart = "dart",
    GDScript = "gdscript",
    Blueprint = "blueprint",
    GLSL = "glsl",
    HLSL = "hlsl",
    Other = "other"
}
/**
 * Variable type
 */
export declare enum VariableType {
    String = "string",
    Number = "number",
    Boolean = "boolean",
    Select = "select",
    MultiSelect = "multiSelect",
    Path = "path",
    Color = "color",
    File = "file",
    Directory = "directory"
}
/**
 * Template variable definition
 */
export interface TemplateVariable {
    name: string;
    displayName: string;
    description?: string;
    type: VariableType;
    default?: string | number | boolean | string[];
    required?: boolean;
    options?: SelectOption[];
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    when?: string;
    transform?: 'lowercase' | 'uppercase' | 'capitalize' | 'camelCase' | 'pascalCase' | 'kebabCase' | 'snakeCase';
}
/**
 * Select option
 */
export interface SelectOption {
    value: string;
    label: string;
    description?: string;
    default?: boolean;
}
/**
 * Template file mapping
 */
export interface TemplateFile {
    source: string;
    destination: string;
    condition?: string;
    processVariables?: boolean;
    binary?: boolean;
}
/**
 * Post-creation hook
 */
export interface PostCreationHook {
    type: 'command' | 'script' | 'function';
    name: string;
    description?: string;
    condition?: string;
    command?: string;
    args?: string[];
    cwd?: string;
    script?: string;
    interpreter?: string;
    silent?: boolean;
    optional?: boolean;
    timeout?: number;
}
/**
 * Template manifest
 */
export interface TemplateManifest {
    id: string;
    name: string;
    displayName: string;
    description: string;
    version: string;
    type: TemplateType;
    category: TemplateCategory;
    languages: TemplateLanguage[];
    tags?: string[];
    author?: string;
    publisher?: string;
    license?: string;
    repository?: string;
    homepage?: string;
    engines?: {
        aethel?: string;
        node?: string;
        npm?: string;
        python?: string;
        dotnet?: string;
    };
    variables?: TemplateVariable[];
    files?: TemplateFile[];
    excludeFiles?: string[];
    preCreation?: PostCreationHook[];
    postCreation?: PostCreationHook[];
    icon?: string;
    banner?: string;
    screenshots?: string[];
    featured?: boolean;
    official?: boolean;
    deprecated?: boolean;
    createdAt?: string;
    updatedAt?: string;
}
/**
 * Template source
 */
export declare enum TemplateSource {
    Builtin = "builtin",
    User = "user",
    Marketplace = "marketplace",
    Git = "git",
    Local = "local"
}
/**
 * Template info
 */
export interface TemplateInfo {
    manifest: TemplateManifest;
    source: TemplateSource;
    path: string;
    installed: boolean;
    lastUsed?: number;
    usageCount?: number;
}
/**
 * Creation options
 */
export interface CreationOptions {
    name: string;
    location: string;
    variables: Record<string, string | number | boolean | string[]>;
    initGit?: boolean;
    gitRemote?: string;
    installDependencies?: boolean;
    packageManager?: 'npm' | 'yarn' | 'pnpm' | 'bun';
    openInIDE?: boolean;
    openFiles?: string[];
}
/**
 * Creation result
 */
export interface CreationResult {
    success: boolean;
    projectPath: string;
    createdFiles: string[];
    errors?: string[];
    warnings?: string[];
    duration: number;
    hookResults?: HookResult[];
}
/**
 * Hook result
 */
export interface HookResult {
    name: string;
    success: boolean;
    output?: string;
    error?: string;
    duration: number;
}
/**
 * Template statistics
 */
export interface TemplateStatistics {
    downloads?: number;
    stars?: number;
    rating?: number;
    usageCount?: number;
}
export interface TemplateInstalledEvent {
    template: TemplateInfo;
}
export interface TemplateRemovedEvent {
    templateId: string;
}
export interface ProjectCreatedEvent {
    templateId: string;
    result: CreationResult;
}
export interface CreationProgressEvent {
    templateId: string;
    phase: 'preparing' | 'copying' | 'processing' | 'hooks' | 'finalizing';
    progress: number;
    message: string;
}
export interface TemplateProvider {
    id: string;
    name: string;
    search(query: string, category?: TemplateCategory): Promise<TemplateInfo[]>;
    getTemplate(templateId: string): Promise<TemplateInfo | null>;
    downloadTemplate(templateId: string): Promise<string>;
}
export declare class TemplateSystem {
    private readonly templates;
    private readonly builtinTemplates;
    private readonly providers;
    private templatesPath;
    private userTemplatesPath;
    private readonly recentTemplates;
    private readonly maxRecent;
    private readonly onInstalledEmitter;
    readonly onInstalled: Event<TemplateInstalledEvent>;
    private readonly onRemovedEmitter;
    readonly onRemoved: Event<TemplateRemovedEvent>;
    private readonly onProjectCreatedEmitter;
    readonly onProjectCreated: Event<ProjectCreatedEvent>;
    private readonly onProgressEmitter;
    readonly onProgress: Event<CreationProgressEvent>;
    constructor();
    /**
     * Initialize template system
     */
    initialize(config: {
        templatesPath: string;
        userTemplatesPath: string;
    }): Promise<void>;
    /**
     * Register template provider
     */
    registerProvider(provider: TemplateProvider): Disposable;
    /**
     * Register builtin templates
     */
    private registerBuiltinTemplates;
    /**
     * Add builtin template
     */
    private addBuiltinTemplate;
    /**
     * Get all templates
     */
    getTemplates(): TemplateInfo[];
    /**
     * Get templates by category
     */
    getTemplatesByCategory(category: TemplateCategory): TemplateInfo[];
    /**
     * Get templates by type
     */
    getTemplatesByType(type: TemplateType): TemplateInfo[];
    /**
     * Get featured templates
     */
    getFeaturedTemplates(): TemplateInfo[];
    /**
     * Get recent templates
     */
    getRecentTemplates(): TemplateInfo[];
    /**
     * Search templates
     */
    searchTemplates(query: string): TemplateInfo[];
    /**
     * Get template by ID
     */
    getTemplate(templateId: string): TemplateInfo | undefined;
    /**
     * Install template from provider
     */
    installFromProvider(providerId: string, templateId: string): Promise<TemplateInfo>;
    /**
     * Install template from Git repository
     */
    installFromGit(gitUrl: string, name?: string): Promise<TemplateInfo>;
    /**
     * Install template from local path
     */
    installFromLocal(localPath: string): Promise<TemplateInfo>;
    /**
     * Remove template
     */
    removeTemplate(templateId: string): Promise<void>;
    /**
     * Create project from template
     */
    createProject(templateId: string, options: CreationOptions): Promise<CreationResult>;
    /**
     * Load manifest from path
     */
    private loadManifest;
    /**
     * Load user templates
     */
    private loadUserTemplates;
    /**
     * Validate variables
     */
    private validateVariables;
    /**
     * Process template string
     */
    private processTemplate;
    /**
     * Evaluate condition
     */
    private evaluateCondition;
    /**
     * Execute hook
     */
    private executeHook;
    /**
     * Emit progress event
     */
    private emitProgress;
    /**
     * Add to recent templates
     */
    private addToRecent;
    /**
     * Extract repo name from Git URL
     */
    private extractRepoName;
    /**
     * Get builtin template path
     */
    private getBuiltinTemplatePath;
    private createDirectory;
    private copyDirectory;
    private copyFile;
    private removeDirectory;
    private readFile;
    private writeFile;
    private initGit;
    private installDependencies;
    /**
     * Dispose
     */
    dispose(): void;
}
interface Disposable {
    dispose(): void;
}
export default TemplateSystem;
