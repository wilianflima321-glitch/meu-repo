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

import { injectable, inject, optional } from 'inversify';

// Theia-compatible Emitter implementation
type Event<T> = (listener: (e: T) => void) => { dispose: () => void };

class Emitter<T> {
    private listeners: Array<(e: T) => void> = [];
    
    get event(): Event<T> {
        return (listener: (e: T) => void) => {
            this.listeners.push(listener);
            return {
                dispose: () => {
                    const idx = this.listeners.indexOf(listener);
                    if (idx >= 0) this.listeners.splice(idx, 1);
                }
            };
        };
    }
    
    fire(event: T): void {
        this.listeners.forEach(l => l(event));
    }
    
    dispose(): void {
        this.listeners = [];
    }
}

// ==================== Template Types ====================

/**
 * Template type
 */
export enum TemplateType {
    // Web
    React = 'react',
    NextJS = 'nextjs',
    Vue = 'vue',
    Nuxt = 'nuxt',
    Angular = 'angular',
    Svelte = 'svelte',
    SvelteKit = 'sveltekit',
    Astro = 'astro',
    Remix = 'remix',
    Solid = 'solid',
    Qwik = 'qwik',
    
    // Mobile
    ReactNative = 'react-native',
    Flutter = 'flutter',
    Expo = 'expo',
    Ionic = 'ionic',
    
    // Backend
    Express = 'express',
    NestJS = 'nestjs',
    Fastify = 'fastify',
    Django = 'django',
    FastAPI = 'fastapi',
    Flask = 'flask',
    Spring = 'spring',
    
    // Desktop
    Electron = 'electron',
    Tauri = 'tauri',
    
    // Game Engines
    Unity = 'unity',
    UnrealEngine = 'unreal',
    Godot = 'godot',
    Phaser = 'phaser',
    Babylon = 'babylon',
    Three = 'threejs',
    PlayCanvas = 'playcanvas',
    
    // Graphics/Creative
    Processing = 'processing',
    P5js = 'p5js',
    OpenFrameworks = 'openframeworks',
    
    // AI/ML
    TensorFlow = 'tensorflow',
    PyTorch = 'pytorch',
    Langchain = 'langchain',
    
    // Generic
    Library = 'library',
    CLI = 'cli',
    Plugin = 'plugin',
    API = 'api',
    Monorepo = 'monorepo',
    Custom = 'custom'
}

/**
 * Template category
 */
export enum TemplateCategory {
    Web = 'web',
    Mobile = 'mobile',
    Backend = 'backend',
    Desktop = 'desktop',
    GameDev = 'gamedev',
    Graphics = 'graphics',
    AIML = 'ai-ml',
    Library = 'library',
    Fullstack = 'fullstack',
    Other = 'other'
}

/**
 * Template language
 */
export enum TemplateLanguage {
    TypeScript = 'typescript',
    JavaScript = 'javascript',
    Python = 'python',
    Rust = 'rust',
    Go = 'go',
    CSharp = 'csharp',
    CPlusPlus = 'cpp',
    Java = 'java',
    Kotlin = 'kotlin',
    Swift = 'swift',
    Dart = 'dart',
    GDScript = 'gdscript',
    Blueprint = 'blueprint',
    GLSL = 'glsl',
    HLSL = 'hlsl',
    Other = 'other'
}

/**
 * Variable type
 */
export enum VariableType {
    String = 'string',
    Number = 'number',
    Boolean = 'boolean',
    Select = 'select',
    MultiSelect = 'multiSelect',
    Path = 'path',
    Color = 'color',
    File = 'file',
    Directory = 'directory'
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
    
    // For select types
    options?: SelectOption[];
    
    // Validation
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    
    // Conditional
    when?: string;
    
    // Transform
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
    
    // For command type
    command?: string;
    args?: string[];
    cwd?: string;
    
    // For script type
    script?: string;
    interpreter?: string;
    
    // Options
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
    
    // Classification
    type: TemplateType;
    category: TemplateCategory;
    languages: TemplateLanguage[];
    tags?: string[];
    
    // Author
    author?: string;
    publisher?: string;
    license?: string;
    repository?: string;
    homepage?: string;
    
    // Requirements
    engines?: {
        aethel?: string;
        node?: string;
        npm?: string;
        python?: string;
        dotnet?: string;
    };
    
    // Variables
    variables?: TemplateVariable[];
    
    // Files
    files?: TemplateFile[];
    excludeFiles?: string[];
    
    // Hooks
    preCreation?: PostCreationHook[];
    postCreation?: PostCreationHook[];
    
    // UI
    icon?: string;
    banner?: string;
    screenshots?: string[];
    
    // Metadata
    featured?: boolean;
    official?: boolean;
    deprecated?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

/**
 * Template source
 */
export enum TemplateSource {
    Builtin = 'builtin',
    User = 'user',
    Marketplace = 'marketplace',
    Git = 'git',
    Local = 'local'
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
    
    // Git
    initGit?: boolean;
    gitRemote?: string;
    
    // Install
    installDependencies?: boolean;
    packageManager?: 'npm' | 'yarn' | 'pnpm' | 'bun';
    
    // Open
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

// ==================== Events ====================

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

// ==================== Template Provider Interface ====================

export interface TemplateProvider {
    id: string;
    name: string;
    
    search(query: string, category?: TemplateCategory): Promise<TemplateInfo[]>;
    getTemplate(templateId: string): Promise<TemplateInfo | null>;
    downloadTemplate(templateId: string): Promise<string>;
}

// ==================== Main Template System ====================

@injectable()
export class TemplateSystem {
    // Templates
    private readonly templates: Map<string, TemplateInfo> = new Map();
    private readonly builtinTemplates: Map<string, TemplateInfo> = new Map();
    
    // Providers
    private readonly providers: Map<string, TemplateProvider> = new Map();
    
    // Paths
    private templatesPath: string = '';
    private userTemplatesPath: string = '';
    
    // Recent
    private readonly recentTemplates: string[] = [];
    private readonly maxRecent: number = 10;
    
    // Events
    private readonly onInstalledEmitter = new Emitter<TemplateInstalledEvent>();
    readonly onInstalled: Event<TemplateInstalledEvent> = this.onInstalledEmitter.event;
    
    private readonly onRemovedEmitter = new Emitter<TemplateRemovedEvent>();
    readonly onRemoved: Event<TemplateRemovedEvent> = this.onRemovedEmitter.event;
    
    private readonly onProjectCreatedEmitter = new Emitter<ProjectCreatedEvent>();
    readonly onProjectCreated: Event<ProjectCreatedEvent> = this.onProjectCreatedEmitter.event;
    
    private readonly onProgressEmitter = new Emitter<CreationProgressEvent>();
    readonly onProgress: Event<CreationProgressEvent> = this.onProgressEmitter.event;

    constructor() {
        this.registerBuiltinTemplates();
    }

    // ==================== Initialization ====================

    /**
     * Initialize template system
     */
    async initialize(config: {
        templatesPath: string;
        userTemplatesPath: string;
    }): Promise<void> {
        this.templatesPath = config.templatesPath;
        this.userTemplatesPath = config.userTemplatesPath;
        
        // Load user templates
        await this.loadUserTemplates();
    }

    /**
     * Register template provider
     */
    registerProvider(provider: TemplateProvider): Disposable {
        this.providers.set(provider.id, provider);
        return {
            dispose: () => this.providers.delete(provider.id)
        };
    }

    // ==================== Builtin Templates ====================

    /**
     * Register builtin templates
     */
    private registerBuiltinTemplates(): void {
        // React Templates
        this.addBuiltinTemplate({
            id: 'react-typescript',
            name: 'react-typescript',
            displayName: 'React + TypeScript',
            description: 'Modern React application with TypeScript, Vite, and best practices',
            version: '1.0.0',
            type: TemplateType.React,
            category: TemplateCategory.Web,
            languages: [TemplateLanguage.TypeScript],
            tags: ['react', 'typescript', 'vite', 'spa'],
            official: true,
            featured: true,
            variables: [
                {
                    name: 'projectName',
                    displayName: 'Project Name',
                    type: VariableType.String,
                    required: true,
                    transform: 'kebabCase'
                },
                {
                    name: 'useRouter',
                    displayName: 'Include React Router',
                    type: VariableType.Boolean,
                    default: true
                },
                {
                    name: 'stateManagement',
                    displayName: 'State Management',
                    type: VariableType.Select,
                    options: [
                        { value: 'none', label: 'None' },
                        { value: 'zustand', label: 'Zustand', default: true },
                        { value: 'redux', label: 'Redux Toolkit' },
                        { value: 'jotai', label: 'Jotai' }
                    ]
                },
                {
                    name: 'styling',
                    displayName: 'Styling Solution',
                    type: VariableType.Select,
                    options: [
                        { value: 'tailwind', label: 'Tailwind CSS', default: true },
                        { value: 'styled', label: 'Styled Components' },
                        { value: 'emotion', label: 'Emotion' },
                        { value: 'css', label: 'Plain CSS' }
                    ]
                }
            ],
            postCreation: [
                {
                    type: 'command',
                    name: 'Install Dependencies',
                    command: 'npm',
                    args: ['install']
                }
            ]
        });

        // Next.js Template
        this.addBuiltinTemplate({
            id: 'nextjs-app-router',
            name: 'nextjs-app-router',
            displayName: 'Next.js App Router',
            description: 'Full-stack Next.js 14 with App Router, TypeScript, and Tailwind CSS',
            version: '1.0.0',
            type: TemplateType.NextJS,
            category: TemplateCategory.Fullstack,
            languages: [TemplateLanguage.TypeScript],
            tags: ['nextjs', 'typescript', 'fullstack', 'ssr'],
            official: true,
            featured: true,
            variables: [
                {
                    name: 'projectName',
                    displayName: 'Project Name',
                    type: VariableType.String,
                    required: true,
                    transform: 'kebabCase'
                },
                {
                    name: 'database',
                    displayName: 'Database',
                    type: VariableType.Select,
                    options: [
                        { value: 'none', label: 'None' },
                        { value: 'prisma-postgres', label: 'Prisma + PostgreSQL' },
                        { value: 'prisma-mysql', label: 'Prisma + MySQL' },
                        { value: 'drizzle', label: 'Drizzle ORM' }
                    ]
                },
                {
                    name: 'auth',
                    displayName: 'Authentication',
                    type: VariableType.Select,
                    options: [
                        { value: 'none', label: 'None' },
                        { value: 'nextauth', label: 'NextAuth.js', default: true },
                        { value: 'clerk', label: 'Clerk' }
                    ]
                }
            ]
        });

        // Unity Template
        this.addBuiltinTemplate({
            id: 'unity-3d-project',
            name: 'unity-3d-project',
            displayName: 'Unity 3D Game',
            description: 'Complete Unity 3D game project with standard folder structure and common systems',
            version: '1.0.0',
            type: TemplateType.Unity,
            category: TemplateCategory.GameDev,
            languages: [TemplateLanguage.CSharp],
            tags: ['unity', 'csharp', 'game', '3d'],
            official: true,
            featured: true,
            variables: [
                {
                    name: 'projectName',
                    displayName: 'Project Name',
                    type: VariableType.String,
                    required: true,
                    transform: 'pascalCase'
                },
                {
                    name: 'renderPipeline',
                    displayName: 'Render Pipeline',
                    type: VariableType.Select,
                    options: [
                        { value: 'urp', label: 'Universal Render Pipeline (URP)', default: true },
                        { value: 'hdrp', label: 'High Definition Render Pipeline (HDRP)' },
                        { value: 'builtin', label: 'Built-in Render Pipeline' }
                    ]
                },
                {
                    name: 'includeInputSystem',
                    displayName: 'Include New Input System',
                    type: VariableType.Boolean,
                    default: true
                },
                {
                    name: 'includeProBuilder',
                    displayName: 'Include ProBuilder',
                    type: VariableType.Boolean,
                    default: false
                }
            ]
        });

        // Unreal Engine Template
        this.addBuiltinTemplate({
            id: 'unreal-cpp-game',
            name: 'unreal-cpp-game',
            displayName: 'Unreal Engine C++ Game',
            description: 'Unreal Engine 5 game project with C++ and Blueprints support',
            version: '1.0.0',
            type: TemplateType.UnrealEngine,
            category: TemplateCategory.GameDev,
            languages: [TemplateLanguage.CPlusPlus, TemplateLanguage.Blueprint],
            tags: ['unreal', 'cpp', 'game', 'ue5'],
            official: true,
            featured: true,
            variables: [
                {
                    name: 'projectName',
                    displayName: 'Project Name',
                    type: VariableType.String,
                    required: true,
                    transform: 'pascalCase'
                },
                {
                    name: 'template',
                    displayName: 'Project Template',
                    type: VariableType.Select,
                    options: [
                        { value: 'blank', label: 'Blank' },
                        { value: 'firstPerson', label: 'First Person', default: true },
                        { value: 'thirdPerson', label: 'Third Person' },
                        { value: 'topDown', label: 'Top Down' },
                        { value: 'vehicleAdvanced', label: 'Vehicle Advanced' }
                    ]
                },
                {
                    name: 'targetPlatform',
                    displayName: 'Target Platform',
                    type: VariableType.MultiSelect,
                    options: [
                        { value: 'windows', label: 'Windows', default: true },
                        { value: 'linux', label: 'Linux' },
                        { value: 'macos', label: 'macOS' },
                        { value: 'android', label: 'Android' },
                        { value: 'ios', label: 'iOS' }
                    ]
                }
            ]
        });

        // Godot Template
        this.addBuiltinTemplate({
            id: 'godot-2d-platformer',
            name: 'godot-2d-platformer',
            displayName: 'Godot 2D Platformer',
            description: 'Godot 4 2D platformer game with GDScript and common game mechanics',
            version: '1.0.0',
            type: TemplateType.Godot,
            category: TemplateCategory.GameDev,
            languages: [TemplateLanguage.GDScript],
            tags: ['godot', 'gdscript', 'game', '2d', 'platformer'],
            official: true,
            variables: [
                {
                    name: 'projectName',
                    displayName: 'Project Name',
                    type: VariableType.String,
                    required: true,
                    transform: 'snakeCase'
                },
                {
                    name: 'includePlayer',
                    displayName: 'Include Player Controller',
                    type: VariableType.Boolean,
                    default: true
                },
                {
                    name: 'includeUI',
                    displayName: 'Include UI System',
                    type: VariableType.Boolean,
                    default: true
                }
            ]
        });

        // Three.js Template
        this.addBuiltinTemplate({
            id: 'threejs-interactive',
            name: 'threejs-interactive',
            displayName: 'Three.js Interactive Experience',
            description: 'WebGL 3D experience with Three.js, TypeScript, and modern tooling',
            version: '1.0.0',
            type: TemplateType.Three,
            category: TemplateCategory.Graphics,
            languages: [TemplateLanguage.TypeScript],
            tags: ['threejs', 'webgl', '3d', 'typescript'],
            official: true,
            variables: [
                {
                    name: 'projectName',
                    displayName: 'Project Name',
                    type: VariableType.String,
                    required: true,
                    transform: 'kebabCase'
                },
                {
                    name: 'includePostProcessing',
                    displayName: 'Include Post Processing',
                    type: VariableType.Boolean,
                    default: true
                },
                {
                    name: 'physicsEngine',
                    displayName: 'Physics Engine',
                    type: VariableType.Select,
                    options: [
                        { value: 'none', label: 'None' },
                        { value: 'rapier', label: 'Rapier', default: true },
                        { value: 'cannon', label: 'Cannon.js' },
                        { value: 'ammo', label: 'Ammo.js' }
                    ]
                }
            ],
            postCreation: [
                {
                    type: 'command',
                    name: 'Install Dependencies',
                    command: 'npm',
                    args: ['install']
                }
            ]
        });

        // Python FastAPI
        this.addBuiltinTemplate({
            id: 'python-fastapi',
            name: 'python-fastapi',
            displayName: 'Python FastAPI',
            description: 'Modern Python API with FastAPI, Pydantic, and SQLAlchemy',
            version: '1.0.0',
            type: TemplateType.FastAPI,
            category: TemplateCategory.Backend,
            languages: [TemplateLanguage.Python],
            tags: ['python', 'fastapi', 'api', 'backend'],
            official: true,
            variables: [
                {
                    name: 'projectName',
                    displayName: 'Project Name',
                    type: VariableType.String,
                    required: true,
                    transform: 'snakeCase'
                },
                {
                    name: 'database',
                    displayName: 'Database',
                    type: VariableType.Select,
                    options: [
                        { value: 'sqlite', label: 'SQLite', default: true },
                        { value: 'postgres', label: 'PostgreSQL' },
                        { value: 'mysql', label: 'MySQL' }
                    ]
                },
                {
                    name: 'includeAuth',
                    displayName: 'Include Authentication',
                    type: VariableType.Boolean,
                    default: true
                }
            ],
            postCreation: [
                {
                    type: 'command',
                    name: 'Create Virtual Environment',
                    command: 'python',
                    args: ['-m', 'venv', 'venv']
                },
                {
                    type: 'command',
                    name: 'Install Dependencies',
                    command: 'pip',
                    args: ['install', '-r', 'requirements.txt']
                }
            ]
        });

        // Electron App
        this.addBuiltinTemplate({
            id: 'electron-react',
            name: 'electron-react',
            displayName: 'Electron + React Desktop App',
            description: 'Cross-platform desktop application with Electron, React, and TypeScript',
            version: '1.0.0',
            type: TemplateType.Electron,
            category: TemplateCategory.Desktop,
            languages: [TemplateLanguage.TypeScript],
            tags: ['electron', 'react', 'desktop', 'cross-platform'],
            official: true,
            variables: [
                {
                    name: 'projectName',
                    displayName: 'Project Name',
                    type: VariableType.String,
                    required: true,
                    transform: 'kebabCase'
                },
                {
                    name: 'includeAutoUpdater',
                    displayName: 'Include Auto Updater',
                    type: VariableType.Boolean,
                    default: true
                }
            ]
        });

        // AI/ML Template
        this.addBuiltinTemplate({
            id: 'langchain-agent',
            name: 'langchain-agent',
            displayName: 'LangChain AI Agent',
            description: 'AI agent with LangChain, OpenAI, and vector stores',
            version: '1.0.0',
            type: TemplateType.Langchain,
            category: TemplateCategory.AIML,
            languages: [TemplateLanguage.Python],
            tags: ['langchain', 'ai', 'llm', 'agent'],
            official: true,
            featured: true,
            variables: [
                {
                    name: 'projectName',
                    displayName: 'Project Name',
                    type: VariableType.String,
                    required: true,
                    transform: 'snakeCase'
                },
                {
                    name: 'llmProvider',
                    displayName: 'LLM Provider',
                    type: VariableType.Select,
                    options: [
                        { value: 'openai', label: 'OpenAI', default: true },
                        { value: 'anthropic', label: 'Anthropic' },
                        { value: 'azure', label: 'Azure OpenAI' },
                        { value: 'local', label: 'Local (Ollama)' }
                    ]
                },
                {
                    name: 'vectorStore',
                    displayName: 'Vector Store',
                    type: VariableType.Select,
                    options: [
                        { value: 'chroma', label: 'Chroma', default: true },
                        { value: 'pinecone', label: 'Pinecone' },
                        { value: 'weaviate', label: 'Weaviate' },
                        { value: 'faiss', label: 'FAISS' }
                    ]
                }
            ]
        });
    }

    /**
     * Add builtin template
     */
    private addBuiltinTemplate(manifest: TemplateManifest): void {
        const template: TemplateInfo = {
            manifest,
            source: TemplateSource.Builtin,
            path: '',
            installed: true
        };
        this.builtinTemplates.set(manifest.id, template);
        this.templates.set(manifest.id, template);
    }

    // ==================== Search & Browse ====================

    /**
     * Get all templates
     */
    getTemplates(): TemplateInfo[] {
        return Array.from(this.templates.values());
    }

    /**
     * Get templates by category
     */
    getTemplatesByCategory(category: TemplateCategory): TemplateInfo[] {
        return Array.from(this.templates.values())
            .filter(t => t.manifest.category === category);
    }

    /**
     * Get templates by type
     */
    getTemplatesByType(type: TemplateType): TemplateInfo[] {
        return Array.from(this.templates.values())
            .filter(t => t.manifest.type === type);
    }

    /**
     * Get featured templates
     */
    getFeaturedTemplates(): TemplateInfo[] {
        return Array.from(this.templates.values())
            .filter(t => t.manifest.featured);
    }

    /**
     * Get recent templates
     */
    getRecentTemplates(): TemplateInfo[] {
        return this.recentTemplates
            .map(id => this.templates.get(id))
            .filter((t): t is TemplateInfo => t !== undefined);
    }

    /**
     * Search templates
     */
    searchTemplates(query: string): TemplateInfo[] {
        const lowerQuery = query.toLowerCase();
        
        return Array.from(this.templates.values()).filter(t => {
            const manifest = t.manifest;
            return (
                manifest.name.toLowerCase().includes(lowerQuery) ||
                manifest.displayName.toLowerCase().includes(lowerQuery) ||
                manifest.description.toLowerCase().includes(lowerQuery) ||
                manifest.tags?.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
                manifest.type.toLowerCase().includes(lowerQuery)
            );
        });
    }

    /**
     * Get template by ID
     */
    getTemplate(templateId: string): TemplateInfo | undefined {
        return this.templates.get(templateId);
    }

    // ==================== Template Management ====================

    /**
     * Install template from provider
     */
    async installFromProvider(providerId: string, templateId: string): Promise<TemplateInfo> {
        const provider = this.providers.get(providerId);
        if (!provider) {
            throw new Error(`Provider not found: ${providerId}`);
        }
        
        const templateInfo = await provider.getTemplate(templateId);
        if (!templateInfo) {
            throw new Error(`Template not found: ${templateId}`);
        }
        
        // Download template
        const downloadPath = await provider.downloadTemplate(templateId);
        
        // Store template
        templateInfo.path = downloadPath;
        templateInfo.installed = true;
        templateInfo.source = TemplateSource.Marketplace;
        
        this.templates.set(templateId, templateInfo);
        this.onInstalledEmitter.fire({ template: templateInfo });
        
        return templateInfo;
    }

    /**
     * Install template from Git repository
     */
    async installFromGit(gitUrl: string, name?: string): Promise<TemplateInfo> {
        // Clone repository
        const templatePath = `${this.userTemplatesPath}/${name || this.extractRepoName(gitUrl)}`;
        
        // TODO: Implement git clone
        
        // Load manifest
        const manifest = await this.loadManifest(templatePath);
        
        const templateInfo: TemplateInfo = {
            manifest,
            source: TemplateSource.Git,
            path: templatePath,
            installed: true
        };
        
        this.templates.set(manifest.id, templateInfo);
        this.onInstalledEmitter.fire({ template: templateInfo });
        
        return templateInfo;
    }

    /**
     * Install template from local path
     */
    async installFromLocal(localPath: string): Promise<TemplateInfo> {
        const manifest = await this.loadManifest(localPath);
        
        // Copy to user templates
        const templatePath = `${this.userTemplatesPath}/${manifest.id}`;
        await this.copyDirectory(localPath, templatePath);
        
        const templateInfo: TemplateInfo = {
            manifest,
            source: TemplateSource.Local,
            path: templatePath,
            installed: true
        };
        
        this.templates.set(manifest.id, templateInfo);
        this.onInstalledEmitter.fire({ template: templateInfo });
        
        return templateInfo;
    }

    /**
     * Remove template
     */
    async removeTemplate(templateId: string): Promise<void> {
        const template = this.templates.get(templateId);
        if (!template) return;
        
        if (template.source === TemplateSource.Builtin) {
            throw new Error('Cannot remove builtin template');
        }
        
        // Remove files
        if (template.path) {
            await this.removeDirectory(template.path);
        }
        
        this.templates.delete(templateId);
        this.onRemovedEmitter.fire({ templateId });
    }

    // ==================== Project Creation ====================

    /**
     * Create project from template
     */
    async createProject(templateId: string, options: CreationOptions): Promise<CreationResult> {
        const startTime = Date.now();
        const template = this.templates.get(templateId);
        
        if (!template) {
            throw new Error(`Template not found: ${templateId}`);
        }
        
        const result: CreationResult = {
            success: false,
            projectPath: `${options.location}/${options.name}`,
            createdFiles: [],
            errors: [],
            warnings: [],
            duration: 0,
            hookResults: []
        };
        
        try {
            // Phase 1: Preparing
            this.emitProgress(templateId, 'preparing', 0, 'Preparing project creation...');
            
            // Validate variables
            const validationErrors = this.validateVariables(template.manifest, options.variables);
            if (validationErrors.length > 0) {
                result.errors = validationErrors;
                return result;
            }
            
            // Create project directory
            await this.createDirectory(result.projectPath);
            
            // Phase 2: Pre-creation hooks
            if (template.manifest.preCreation) {
                for (const hook of template.manifest.preCreation) {
                    const hookResult = await this.executeHook(hook, result.projectPath, options.variables);
                    result.hookResults?.push(hookResult);
                    
                    if (!hookResult.success && !hook.optional) {
                        result.errors?.push(`Pre-creation hook failed: ${hook.name}`);
                        return result;
                    }
                }
            }
            
            // Phase 3: Copy and process files
            this.emitProgress(templateId, 'copying', 20, 'Copying template files...');
            
            if (template.path && template.manifest.files) {
                const totalFiles = template.manifest.files.length;
                let processedFiles = 0;
                
                for (const file of template.manifest.files) {
                    // Check condition
                    if (file.condition && !this.evaluateCondition(file.condition, options.variables)) {
                        continue;
                    }
                    
                    const sourcePath = `${template.path}/${file.source}`;
                    const destPath = `${result.projectPath}/${this.processTemplate(file.destination, options.variables)}`;
                    
                    if (file.binary || !file.processVariables) {
                        await this.copyFile(sourcePath, destPath);
                    } else {
                        // Process template variables
                        let content = await this.readFile(sourcePath);
                        content = this.processTemplate(content, options.variables);
                        await this.writeFile(destPath, content);
                    }
                    
                    result.createdFiles.push(destPath);
                    processedFiles++;
                    
                    this.emitProgress(
                        templateId, 
                        'processing', 
                        20 + (processedFiles / totalFiles) * 40,
                        `Processing ${file.destination}...`
                    );
                }
            } else {
                // Copy entire template directory
                await this.copyDirectory(template.path || this.getBuiltinTemplatePath(templateId), result.projectPath);
            }
            
            // Phase 4: Post-process
            this.emitProgress(templateId, 'processing', 60, 'Post-processing files...');
            
            // Initialize Git if requested
            if (options.initGit) {
                await this.initGit(result.projectPath, options.gitRemote);
            }
            
            // Phase 5: Post-creation hooks
            this.emitProgress(templateId, 'hooks', 70, 'Running post-creation hooks...');
            
            if (template.manifest.postCreation) {
                const totalHooks = template.manifest.postCreation.length;
                let completedHooks = 0;
                
                for (const hook of template.manifest.postCreation) {
                    // Check condition
                    if (hook.condition && !this.evaluateCondition(hook.condition, options.variables)) {
                        continue;
                    }
                    
                    const hookResult = await this.executeHook(hook, result.projectPath, options.variables);
                    result.hookResults?.push(hookResult);
                    
                    if (!hookResult.success && !hook.optional) {
                        result.warnings?.push(`Post-creation hook failed: ${hook.name}`);
                    }
                    
                    completedHooks++;
                    this.emitProgress(
                        templateId,
                        'hooks',
                        70 + (completedHooks / totalHooks) * 20,
                        `Running ${hook.name}...`
                    );
                }
            }
            
            // Install dependencies if requested
            if (options.installDependencies) {
                this.emitProgress(templateId, 'hooks', 90, 'Installing dependencies...');
                await this.installDependencies(result.projectPath, options.packageManager || 'npm');
            }
            
            // Phase 6: Finalize
            this.emitProgress(templateId, 'finalizing', 95, 'Finalizing project...');
            
            // Update recent templates
            this.addToRecent(templateId);
            
            // Update usage count
            if (template.usageCount !== undefined) {
                template.usageCount++;
            } else {
                template.usageCount = 1;
            }
            template.lastUsed = Date.now();
            
            result.success = true;
            this.emitProgress(templateId, 'finalizing', 100, 'Project created successfully!');
            
        } catch (error) {
            result.errors?.push(error instanceof Error ? error.message : String(error));
        }
        
        result.duration = Date.now() - startTime;
        this.onProjectCreatedEmitter.fire({ templateId, result });
        
        return result;
    }

    // ==================== Helpers ====================

    /**
     * Load manifest from path
     */
    private async loadManifest(templatePath: string): Promise<TemplateManifest> {
        const manifestPath = `${templatePath}/template.json`;
        const content = await this.readFile(manifestPath);
        return JSON.parse(content);
    }

    /**
     * Load user templates
     */
    private async loadUserTemplates(): Promise<void> {
        // TODO: Scan userTemplatesPath and load templates
    }

    /**
     * Validate variables
     */
    private validateVariables(
        manifest: TemplateManifest, 
        variables: Record<string, unknown>
    ): string[] {
        const errors: string[] = [];
        
        if (!manifest.variables) return errors;
        
        for (const varDef of manifest.variables) {
            const value = variables[varDef.name];
            
            // Check required
            if (varDef.required && (value === undefined || value === null || value === '')) {
                errors.push(`Variable '${varDef.displayName}' is required`);
                continue;
            }
            
            // Skip validation if not provided and not required
            if (value === undefined || value === null) continue;
            
            // Type-specific validation
            if (varDef.type === VariableType.String && typeof value === 'string') {
                if (varDef.pattern && !new RegExp(varDef.pattern).test(value)) {
                    errors.push(`Variable '${varDef.displayName}' does not match pattern`);
                }
                if (varDef.minLength && value.length < varDef.minLength) {
                    errors.push(`Variable '${varDef.displayName}' is too short`);
                }
                if (varDef.maxLength && value.length > varDef.maxLength) {
                    errors.push(`Variable '${varDef.displayName}' is too long`);
                }
            }
            
            if (varDef.type === VariableType.Number && typeof value === 'number') {
                if (varDef.min !== undefined && value < varDef.min) {
                    errors.push(`Variable '${varDef.displayName}' is below minimum`);
                }
                if (varDef.max !== undefined && value > varDef.max) {
                    errors.push(`Variable '${varDef.displayName}' is above maximum`);
                }
            }
        }
        
        return errors;
    }

    /**
     * Process template string
     */
    private processTemplate(content: string, variables: Record<string, unknown>): string {
        return content.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
            const value = variables[varName];
            return value !== undefined ? String(value) : match;
        });
    }

    /**
     * Evaluate condition
     */
    private evaluateCondition(condition: string, variables: Record<string, unknown>): boolean {
        try {
            // Simple condition evaluation
            // Format: "varName == value" or "varName != value" or just "varName" for truthy check
            
            if (condition.includes('==')) {
                const [varName, value] = condition.split('==').map(s => s.trim());
                return String(variables[varName]) === value.replace(/['"]/g, '');
            }
            
            if (condition.includes('!=')) {
                const [varName, value] = condition.split('!=').map(s => s.trim());
                return String(variables[varName]) !== value.replace(/['"]/g, '');
            }
            
            // Truthy check
            return Boolean(variables[condition.trim()]);
        } catch {
            return true;
        }
    }

    /**
     * Execute hook
     */
    private async executeHook(
        hook: PostCreationHook,
        projectPath: string,
        variables: Record<string, unknown>
    ): Promise<HookResult> {
        const startTime = Date.now();
        const result: HookResult = {
            name: hook.name,
            success: false,
            duration: 0
        };
        
        try {
            if (hook.type === 'command' && hook.command) {
                // Execute command
                const args = hook.args?.map(arg => this.processTemplate(arg, variables)) || [];
                const cwd = hook.cwd ? this.processTemplate(hook.cwd, variables) : projectPath;
                
                // TODO: Implement actual command execution
                result.success = true;
                result.output = `Executed: ${hook.command} ${args.join(' ')}`;
            } else if (hook.type === 'script' && hook.script) {
                // Execute script
                const script = this.processTemplate(hook.script, variables);
                // TODO: Implement actual script execution
                result.success = true;
            }
        } catch (error) {
            result.error = error instanceof Error ? error.message : String(error);
        }
        
        result.duration = Date.now() - startTime;
        return result;
    }

    /**
     * Emit progress event
     */
    private emitProgress(
        templateId: string,
        phase: 'preparing' | 'copying' | 'processing' | 'hooks' | 'finalizing',
        progress: number,
        message: string
    ): void {
        this.onProgressEmitter.fire({ templateId, phase, progress, message });
    }

    /**
     * Add to recent templates
     */
    private addToRecent(templateId: string): void {
        const index = this.recentTemplates.indexOf(templateId);
        if (index !== -1) {
            this.recentTemplates.splice(index, 1);
        }
        this.recentTemplates.unshift(templateId);
        
        if (this.recentTemplates.length > this.maxRecent) {
            this.recentTemplates.pop();
        }
    }

    /**
     * Extract repo name from Git URL
     */
    private extractRepoName(gitUrl: string): string {
        const match = gitUrl.match(/\/([^\/]+?)(\.git)?$/);
        return match ? match[1] : 'template';
    }

    /**
     * Get builtin template path
     */
    private getBuiltinTemplatePath(templateId: string): string {
        return `${this.templatesPath}/builtin/${templateId}`;
    }

    // File system operations (to be implemented with actual fs)
    private async createDirectory(path: string): Promise<void> { /* TODO */ }
    private async copyDirectory(source: string, dest: string): Promise<void> { /* TODO */ }
    private async copyFile(source: string, dest: string): Promise<void> { /* TODO */ }
    private async removeDirectory(path: string): Promise<void> { /* TODO */ }
    private async readFile(path: string): Promise<string> { return ''; /* TODO */ }
    private async writeFile(path: string, content: string): Promise<void> { /* TODO */ }
    private async initGit(projectPath: string, remote?: string): Promise<void> { /* TODO */ }
    private async installDependencies(projectPath: string, packageManager: string): Promise<void> { /* TODO */ }

    /**
     * Dispose
     */
    dispose(): void {
        this.templates.clear();
        this.builtinTemplates.clear();
        this.providers.clear();
        
        this.onInstalledEmitter.dispose();
        this.onRemovedEmitter.dispose();
        this.onProjectCreatedEmitter.dispose();
        this.onProgressEmitter.dispose();
    }
}

// ==================== Interfaces ====================

interface Disposable {
    dispose(): void;
}

// ==================== Export ====================

export default TemplateSystem;
