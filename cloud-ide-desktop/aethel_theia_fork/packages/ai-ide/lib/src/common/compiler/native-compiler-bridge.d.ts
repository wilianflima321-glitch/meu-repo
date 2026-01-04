import { Event } from '@theia/core/lib/common';
/**
 * Supported programming languages
 */
export type CompilerLanguage = 'cpp' | 'c' | 'rust' | 'go' | 'zig' | 'typescript' | 'javascript' | 'python' | 'csharp' | 'java' | 'kotlin' | 'swift' | 'wasm';
/**
 * Target platform for compilation
 */
export type TargetPlatform = 'windows-x64' | 'windows-arm64' | 'linux-x64' | 'linux-arm64' | 'macos-x64' | 'macos-arm64' | 'wasm32' | 'wasm64' | 'android-arm64' | 'android-x64' | 'ios-arm64';
/**
 * Output type
 */
export type OutputType = 'executable' | 'shared-library' | 'static-library' | 'object' | 'wasm' | 'llvm-ir' | 'assembly';
/**
 * Optimization level
 */
export type OptimizationLevel = 'none' | 'size' | 'speed' | 'aggressive';
/**
 * Compiler diagnostic severity
 */
export type DiagnosticSeverity = 'error' | 'warning' | 'info' | 'hint';
/**
 * Compiler diagnostic
 */
export interface CompilerDiagnostic {
    severity: DiagnosticSeverity;
    code: string;
    message: string;
    file?: string;
    line?: number;
    column?: number;
    endLine?: number;
    endColumn?: number;
    source: string;
    suggestions?: string[];
}
/**
 * Source file information
 */
export interface SourceFile {
    path: string;
    content: string;
    language: CompilerLanguage;
    dependencies?: string[];
}
/**
 * Compilation configuration
 */
export interface CompilationConfig {
    language: CompilerLanguage;
    sources: SourceFile[];
    outputPath: string;
    outputType: OutputType;
    targetPlatform: TargetPlatform;
    optimization: OptimizationLevel;
    debug?: boolean;
    defines?: Record<string, string>;
    includePaths?: string[];
    libraryPaths?: string[];
    libraries?: string[];
    compilerFlags?: string[];
    linkerFlags?: string[];
    resources?: ResourceFile[];
    moduleSystem?: 'commonjs' | 'esm' | 'amd' | 'umd';
}
/**
 * Resource file (icons, manifests, etc.)
 */
export interface ResourceFile {
    type: 'icon' | 'manifest' | 'version-info' | 'data';
    path: string;
    data?: ArrayBuffer;
}
/**
 * Compilation result
 */
export interface CompilationResult {
    success: boolean;
    outputPath?: string;
    outputSize?: number;
    diagnostics: CompilerDiagnostic[];
    compilationTime: number;
    symbols?: SymbolInfo[];
    dependencies?: DependencyInfo[];
}
/**
 * Symbol information
 */
export interface SymbolInfo {
    name: string;
    type: 'function' | 'class' | 'variable' | 'constant' | 'type';
    visibility: 'public' | 'private' | 'internal';
    address?: number;
    size?: number;
    file?: string;
    line?: number;
}
/**
 * Dependency information
 */
export interface DependencyInfo {
    name: string;
    version?: string;
    type: 'static' | 'dynamic' | 'system';
    resolved: boolean;
    path?: string;
}
/**
 * Incremental build state
 */
export interface BuildState {
    lastBuildTime: Date;
    fileHashes: Map<string, string>;
    objectFiles: Map<string, string>;
    dependencies: Map<string, string[]>;
}
/**
 * Cross-compilation toolchain
 */
export interface Toolchain {
    name: string;
    platform: TargetPlatform;
    compilerPath: string;
    linkerPath: string;
    archiverPath?: string;
    sysroot?: string;
    includes: string[];
    libs: string[];
}
export declare class NativeCompilerBridge {
    private toolchains;
    private buildStates;
    private activeCompilations;
    private readonly onCompilationStartEmitter;
    private readonly onCompilationProgressEmitter;
    private readonly onCompilationCompleteEmitter;
    private readonly onDiagnosticEmitter;
    readonly onCompilationStart: Event<{
        projectId: string;
    }>;
    readonly onCompilationProgress: Event<{
        projectId: string;
        phase: string;
        progress: number;
    }>;
    readonly onCompilationComplete: Event<{
        projectId: string;
        result: CompilationResult;
    }>;
    readonly onDiagnostic: Event<{
        projectId: string;
        diagnostic: CompilerDiagnostic;
    }>;
    constructor();
    /**
     * Initialize built-in toolchains
     */
    private initializeBuiltinToolchains;
    /**
     * Register a toolchain
     */
    registerToolchain(toolchain: Toolchain): void;
    /**
     * Get toolchain for platform
     */
    getToolchain(name: string, platform: TargetPlatform): Toolchain | undefined;
    /**
     * Detect available toolchains on system
     */
    detectToolchains(): Promise<Toolchain[]>;
    /**
     * Compile source files
     */
    compile(projectId: string, config: CompilationConfig): Promise<CompilationResult>;
    /**
     * Cancel ongoing compilation
     */
    cancelCompilation(projectId: string): void;
    /**
     * Select appropriate compiler
     */
    private selectCompiler;
    /**
     * Parse source files
     */
    private parseSourceFiles;
    /**
     * Preprocess source content
     */
    private preprocessSource;
    /**
     * Compile a single source file
     */
    private compileSource;
    /**
     * Build compiler arguments
     */
    private buildCompilerArgs;
    /**
     * Get platform-specific compiler flags
     */
    private getPlatformFlags;
    /**
     * Link object files
     */
    private link;
    /**
     * Select linker for platform
     */
    private selectLinker;
    /**
     * Build linker arguments
     */
    private buildLinkerArgs;
    /**
     * Post-process compiled output
     */
    private postProcess;
    /**
     * Strip debug symbols
     */
    private stripSymbols;
    /**
     * Add Windows resources
     */
    private addResources;
    /**
     * Parse compiler output for diagnostics
     */
    private parseCompilerOutput;
    /**
     * Parse linker output for diagnostics
     */
    private parseLinkerOutput;
    /**
     * Parse a diagnostic line
     */
    private parseDiagnosticLine;
    /**
     * Get changed files since last build
     */
    private getChangedFiles;
    /**
     * Update build state
     */
    private updateBuildState;
    /**
     * Clean build state
     */
    cleanBuildState(projectId: string): void;
    /**
     * Hash content for change detection
     */
    private hashContent;
    /**
     * Extract symbols from compiled output
     */
    private extractSymbols;
    /**
     * Convert nm symbol type to our type
     */
    private symbolTypeFromNm;
    /**
     * Analyze dependencies
     */
    private analyzeDependencies;
    /**
     * Configure cross-compilation for target platform
     */
    configureCrossCompilation(platform: TargetPlatform, sysrootPath?: string): Promise<void>;
    /**
     * Get cross-compiler for platform
     */
    private getCrossCompiler;
    /**
     * Get cross-linker for platform
     */
    private getCrossLinker;
    /**
     * Compile to WebAssembly
     */
    compileToWasm(projectId: string, sources: SourceFile[], options?: {
        optimization?: OptimizationLevel;
        exportedFunctions?: string[];
        initialMemory?: number;
        maxMemory?: number;
        features?: string[];
    }): Promise<CompilationResult>;
    /**
     * Execute command
     */
    private executeCommand;
    /**
     * Get file size
     */
    private getFileSize;
}
/**
 * CMake project configuration
 */
export interface CMakeConfig {
    projectName: string;
    version: string;
    cppStandard: number;
    targets: CMakeTarget[];
    dependencies?: CMakeDependency[];
}
interface CMakeTarget {
    name: string;
    type: 'executable' | 'library' | 'shared_library';
    sources: string[];
    includes?: string[];
    links?: string[];
    defines?: Record<string, string>;
}
interface CMakeDependency {
    name: string;
    version?: string;
    components?: string[];
}
/**
 * Generate CMakeLists.txt
 */
export declare function generateCMakeLists(config: CMakeConfig): string;
export {};
