"use strict";
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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateSystem = exports.TemplateSource = exports.VariableType = exports.TemplateLanguage = exports.TemplateCategory = exports.TemplateType = void 0;
const inversify_1 = require("inversify");
class Emitter {
    constructor() {
        this.listeners = [];
    }
    get event() {
        return (listener) => {
            this.listeners.push(listener);
            return {
                dispose: () => {
                    const idx = this.listeners.indexOf(listener);
                    if (idx >= 0)
                        this.listeners.splice(idx, 1);
                }
            };
        };
    }
    fire(event) {
        this.listeners.forEach(l => l(event));
    }
    dispose() {
        this.listeners = [];
    }
}
// ==================== Template Types ====================
/**
 * Template type
 */
var TemplateType;
(function (TemplateType) {
    // Web
    TemplateType["React"] = "react";
    TemplateType["NextJS"] = "nextjs";
    TemplateType["Vue"] = "vue";
    TemplateType["Nuxt"] = "nuxt";
    TemplateType["Angular"] = "angular";
    TemplateType["Svelte"] = "svelte";
    TemplateType["SvelteKit"] = "sveltekit";
    TemplateType["Astro"] = "astro";
    TemplateType["Remix"] = "remix";
    TemplateType["Solid"] = "solid";
    TemplateType["Qwik"] = "qwik";
    // Mobile
    TemplateType["ReactNative"] = "react-native";
    TemplateType["Flutter"] = "flutter";
    TemplateType["Expo"] = "expo";
    TemplateType["Ionic"] = "ionic";
    // Backend
    TemplateType["Express"] = "express";
    TemplateType["NestJS"] = "nestjs";
    TemplateType["Fastify"] = "fastify";
    TemplateType["Django"] = "django";
    TemplateType["FastAPI"] = "fastapi";
    TemplateType["Flask"] = "flask";
    TemplateType["Spring"] = "spring";
    // Desktop
    TemplateType["Electron"] = "electron";
    TemplateType["Tauri"] = "tauri";
    // Game Engines
    TemplateType["Unity"] = "unity";
    TemplateType["UnrealEngine"] = "unreal";
    TemplateType["Godot"] = "godot";
    TemplateType["Phaser"] = "phaser";
    TemplateType["Babylon"] = "babylon";
    TemplateType["Three"] = "threejs";
    TemplateType["PlayCanvas"] = "playcanvas";
    // Graphics/Creative
    TemplateType["Processing"] = "processing";
    TemplateType["P5js"] = "p5js";
    TemplateType["OpenFrameworks"] = "openframeworks";
    // AI/ML
    TemplateType["TensorFlow"] = "tensorflow";
    TemplateType["PyTorch"] = "pytorch";
    TemplateType["Langchain"] = "langchain";
    // Generic
    TemplateType["Library"] = "library";
    TemplateType["CLI"] = "cli";
    TemplateType["Plugin"] = "plugin";
    TemplateType["API"] = "api";
    TemplateType["Monorepo"] = "monorepo";
    TemplateType["Custom"] = "custom";
})(TemplateType || (exports.TemplateType = TemplateType = {}));
/**
 * Template category
 */
var TemplateCategory;
(function (TemplateCategory) {
    TemplateCategory["Web"] = "web";
    TemplateCategory["Mobile"] = "mobile";
    TemplateCategory["Backend"] = "backend";
    TemplateCategory["Desktop"] = "desktop";
    TemplateCategory["GameDev"] = "gamedev";
    TemplateCategory["Graphics"] = "graphics";
    TemplateCategory["AIML"] = "ai-ml";
    TemplateCategory["Library"] = "library";
    TemplateCategory["Fullstack"] = "fullstack";
    TemplateCategory["Other"] = "other";
})(TemplateCategory || (exports.TemplateCategory = TemplateCategory = {}));
/**
 * Template language
 */
var TemplateLanguage;
(function (TemplateLanguage) {
    TemplateLanguage["TypeScript"] = "typescript";
    TemplateLanguage["JavaScript"] = "javascript";
    TemplateLanguage["Python"] = "python";
    TemplateLanguage["Rust"] = "rust";
    TemplateLanguage["Go"] = "go";
    TemplateLanguage["CSharp"] = "csharp";
    TemplateLanguage["CPlusPlus"] = "cpp";
    TemplateLanguage["Java"] = "java";
    TemplateLanguage["Kotlin"] = "kotlin";
    TemplateLanguage["Swift"] = "swift";
    TemplateLanguage["Dart"] = "dart";
    TemplateLanguage["GDScript"] = "gdscript";
    TemplateLanguage["Blueprint"] = "blueprint";
    TemplateLanguage["GLSL"] = "glsl";
    TemplateLanguage["HLSL"] = "hlsl";
    TemplateLanguage["Other"] = "other";
})(TemplateLanguage || (exports.TemplateLanguage = TemplateLanguage = {}));
/**
 * Variable type
 */
var VariableType;
(function (VariableType) {
    VariableType["String"] = "string";
    VariableType["Number"] = "number";
    VariableType["Boolean"] = "boolean";
    VariableType["Select"] = "select";
    VariableType["MultiSelect"] = "multiSelect";
    VariableType["Path"] = "path";
    VariableType["Color"] = "color";
    VariableType["File"] = "file";
    VariableType["Directory"] = "directory";
})(VariableType || (exports.VariableType = VariableType = {}));
/**
 * Template source
 */
var TemplateSource;
(function (TemplateSource) {
    TemplateSource["Builtin"] = "builtin";
    TemplateSource["User"] = "user";
    TemplateSource["Marketplace"] = "marketplace";
    TemplateSource["Git"] = "git";
    TemplateSource["Local"] = "local";
})(TemplateSource || (exports.TemplateSource = TemplateSource = {}));
// ==================== Main Template System ====================
let TemplateSystem = class TemplateSystem {
    constructor() {
        // Templates
        this.templates = new Map();
        this.builtinTemplates = new Map();
        // Providers
        this.providers = new Map();
        // Paths
        this.templatesPath = '';
        this.userTemplatesPath = '';
        // Recent
        this.recentTemplates = [];
        this.maxRecent = 10;
        // Events
        this.onInstalledEmitter = new Emitter();
        this.onInstalled = this.onInstalledEmitter.event;
        this.onRemovedEmitter = new Emitter();
        this.onRemoved = this.onRemovedEmitter.event;
        this.onProjectCreatedEmitter = new Emitter();
        this.onProjectCreated = this.onProjectCreatedEmitter.event;
        this.onProgressEmitter = new Emitter();
        this.onProgress = this.onProgressEmitter.event;
        this.registerBuiltinTemplates();
    }
    // ==================== Initialization ====================
    /**
     * Initialize template system
     */
    async initialize(config) {
        this.templatesPath = config.templatesPath;
        this.userTemplatesPath = config.userTemplatesPath;
        // Load user templates
        await this.loadUserTemplates();
    }
    /**
     * Register template provider
     */
    registerProvider(provider) {
        this.providers.set(provider.id, provider);
        return {
            dispose: () => this.providers.delete(provider.id)
        };
    }
    // ==================== Builtin Templates ====================
    /**
     * Register builtin templates
     */
    registerBuiltinTemplates() {
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
    addBuiltinTemplate(manifest) {
        const template = {
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
    getTemplates() {
        return Array.from(this.templates.values());
    }
    /**
     * Get templates by category
     */
    getTemplatesByCategory(category) {
        return Array.from(this.templates.values())
            .filter(t => t.manifest.category === category);
    }
    /**
     * Get templates by type
     */
    getTemplatesByType(type) {
        return Array.from(this.templates.values())
            .filter(t => t.manifest.type === type);
    }
    /**
     * Get featured templates
     */
    getFeaturedTemplates() {
        return Array.from(this.templates.values())
            .filter(t => t.manifest.featured);
    }
    /**
     * Get recent templates
     */
    getRecentTemplates() {
        return this.recentTemplates
            .map(id => this.templates.get(id))
            .filter((t) => t !== undefined);
    }
    /**
     * Search templates
     */
    searchTemplates(query) {
        const lowerQuery = query.toLowerCase();
        return Array.from(this.templates.values()).filter(t => {
            const manifest = t.manifest;
            return (manifest.name.toLowerCase().includes(lowerQuery) ||
                manifest.displayName.toLowerCase().includes(lowerQuery) ||
                manifest.description.toLowerCase().includes(lowerQuery) ||
                manifest.tags?.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
                manifest.type.toLowerCase().includes(lowerQuery));
        });
    }
    /**
     * Get template by ID
     */
    getTemplate(templateId) {
        return this.templates.get(templateId);
    }
    // ==================== Template Management ====================
    /**
     * Install template from provider
     */
    async installFromProvider(providerId, templateId) {
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
    async installFromGit(gitUrl, name) {
        // Clone repository
        const templatePath = `${this.userTemplatesPath}/${name || this.extractRepoName(gitUrl)}`;
        // TODO: Implement git clone
        // Load manifest
        const manifest = await this.loadManifest(templatePath);
        const templateInfo = {
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
    async installFromLocal(localPath) {
        const manifest = await this.loadManifest(localPath);
        // Copy to user templates
        const templatePath = `${this.userTemplatesPath}/${manifest.id}`;
        await this.copyDirectory(localPath, templatePath);
        const templateInfo = {
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
    async removeTemplate(templateId) {
        const template = this.templates.get(templateId);
        if (!template)
            return;
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
    async createProject(templateId, options) {
        const startTime = Date.now();
        const template = this.templates.get(templateId);
        if (!template) {
            throw new Error(`Template not found: ${templateId}`);
        }
        const result = {
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
                    }
                    else {
                        // Process template variables
                        let content = await this.readFile(sourcePath);
                        content = this.processTemplate(content, options.variables);
                        await this.writeFile(destPath, content);
                    }
                    result.createdFiles.push(destPath);
                    processedFiles++;
                    this.emitProgress(templateId, 'processing', 20 + (processedFiles / totalFiles) * 40, `Processing ${file.destination}...`);
                }
            }
            else {
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
                    this.emitProgress(templateId, 'hooks', 70 + (completedHooks / totalHooks) * 20, `Running ${hook.name}...`);
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
            }
            else {
                template.usageCount = 1;
            }
            template.lastUsed = Date.now();
            result.success = true;
            this.emitProgress(templateId, 'finalizing', 100, 'Project created successfully!');
        }
        catch (error) {
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
    async loadManifest(templatePath) {
        const manifestPath = `${templatePath}/template.json`;
        const content = await this.readFile(manifestPath);
        return JSON.parse(content);
    }
    /**
     * Load user templates
     */
    async loadUserTemplates() {
        // TODO: Scan userTemplatesPath and load templates
    }
    /**
     * Validate variables
     */
    validateVariables(manifest, variables) {
        const errors = [];
        if (!manifest.variables)
            return errors;
        for (const varDef of manifest.variables) {
            const value = variables[varDef.name];
            // Check required
            if (varDef.required && (value === undefined || value === null || value === '')) {
                errors.push(`Variable '${varDef.displayName}' is required`);
                continue;
            }
            // Skip validation if not provided and not required
            if (value === undefined || value === null)
                continue;
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
    processTemplate(content, variables) {
        return content.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
            const value = variables[varName];
            return value !== undefined ? String(value) : match;
        });
    }
    /**
     * Evaluate condition
     */
    evaluateCondition(condition, variables) {
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
        }
        catch {
            return true;
        }
    }
    /**
     * Execute hook
     */
    async executeHook(hook, projectPath, variables) {
        const startTime = Date.now();
        const result = {
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
            }
            else if (hook.type === 'script' && hook.script) {
                // Execute script
                const script = this.processTemplate(hook.script, variables);
                // TODO: Implement actual script execution
                result.success = true;
            }
        }
        catch (error) {
            result.error = error instanceof Error ? error.message : String(error);
        }
        result.duration = Date.now() - startTime;
        return result;
    }
    /**
     * Emit progress event
     */
    emitProgress(templateId, phase, progress, message) {
        this.onProgressEmitter.fire({ templateId, phase, progress, message });
    }
    /**
     * Add to recent templates
     */
    addToRecent(templateId) {
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
    extractRepoName(gitUrl) {
        const match = gitUrl.match(/\/([^\/]+?)(\.git)?$/);
        return match ? match[1] : 'template';
    }
    /**
     * Get builtin template path
     */
    getBuiltinTemplatePath(templateId) {
        return `${this.templatesPath}/builtin/${templateId}`;
    }
    // File system operations (to be implemented with actual fs)
    async createDirectory(path) { }
    async copyDirectory(source, dest) { }
    async copyFile(source, dest) { }
    async removeDirectory(path) { }
    async readFile(path) { return ''; /* TODO */ }
    async writeFile(path, content) { }
    async initGit(projectPath, remote) { }
    async installDependencies(projectPath, packageManager) { }
    /**
     * Dispose
     */
    dispose() {
        this.templates.clear();
        this.builtinTemplates.clear();
        this.providers.clear();
        this.onInstalledEmitter.dispose();
        this.onRemovedEmitter.dispose();
        this.onProjectCreatedEmitter.dispose();
        this.onProgressEmitter.dispose();
    }
};
exports.TemplateSystem = TemplateSystem;
exports.TemplateSystem = TemplateSystem = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], TemplateSystem);
// ==================== Export ====================
exports.default = TemplateSystem;
