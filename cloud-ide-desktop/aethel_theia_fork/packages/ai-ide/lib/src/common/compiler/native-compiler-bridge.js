"use strict";
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
exports.NativeCompilerBridge = void 0;
exports.generateCMakeLists = generateCMakeLists;
const inversify_1 = require("inversify");
const common_1 = require("@theia/core/lib/common");
// ============================================================================
// NATIVE COMPILER BRIDGE
// ============================================================================
let NativeCompilerBridge = class NativeCompilerBridge {
    constructor() {
        this.toolchains = new Map();
        this.buildStates = new Map();
        this.activeCompilations = new Map();
        this.onCompilationStartEmitter = new common_1.Emitter();
        this.onCompilationProgressEmitter = new common_1.Emitter();
        this.onCompilationCompleteEmitter = new common_1.Emitter();
        this.onDiagnosticEmitter = new common_1.Emitter();
        this.onCompilationStart = this.onCompilationStartEmitter.event;
        this.onCompilationProgress = this.onCompilationProgressEmitter.event;
        this.onCompilationComplete = this.onCompilationCompleteEmitter.event;
        this.onDiagnostic = this.onDiagnosticEmitter.event;
        this.initializeBuiltinToolchains();
    }
    // ========================================================================
    // TOOLCHAIN MANAGEMENT
    // ========================================================================
    /**
     * Initialize built-in toolchains
     */
    initializeBuiltinToolchains() {
        // LLVM/Clang toolchain
        this.registerToolchain({
            name: 'llvm',
            platform: 'linux-x64',
            compilerPath: 'clang',
            linkerPath: 'lld',
            archiverPath: 'llvm-ar',
            includes: ['/usr/include', '/usr/local/include'],
            libs: ['/usr/lib', '/usr/local/lib'],
        });
        // MSVC toolchain (Windows)
        this.registerToolchain({
            name: 'msvc',
            platform: 'windows-x64',
            compilerPath: 'cl.exe',
            linkerPath: 'link.exe',
            archiverPath: 'lib.exe',
            includes: [],
            libs: [],
        });
        // Emscripten for WebAssembly
        this.registerToolchain({
            name: 'emscripten',
            platform: 'wasm32',
            compilerPath: 'emcc',
            linkerPath: 'emcc',
            includes: [],
            libs: [],
        });
        // Rust toolchain
        this.registerToolchain({
            name: 'rust',
            platform: 'linux-x64',
            compilerPath: 'rustc',
            linkerPath: 'rustc',
            includes: [],
            libs: [],
        });
        // Go toolchain
        this.registerToolchain({
            name: 'go',
            platform: 'linux-x64',
            compilerPath: 'go',
            linkerPath: 'go',
            includes: [],
            libs: [],
        });
    }
    /**
     * Register a toolchain
     */
    registerToolchain(toolchain) {
        const key = `${toolchain.name}-${toolchain.platform}`;
        this.toolchains.set(key, toolchain);
    }
    /**
     * Get toolchain for platform
     */
    getToolchain(name, platform) {
        return this.toolchains.get(`${name}-${platform}`);
    }
    /**
     * Detect available toolchains on system
     */
    async detectToolchains() {
        const detected = [];
        // Check for common compilers
        const compilers = [
            { cmd: 'clang --version', name: 'llvm' },
            { cmd: 'gcc --version', name: 'gcc' },
            { cmd: 'rustc --version', name: 'rust' },
            { cmd: 'go version', name: 'go' },
            { cmd: 'emcc --version', name: 'emscripten' },
        ];
        for (const compiler of compilers) {
            try {
                await this.executeCommand(compiler.cmd);
                const toolchain = this.toolchains.get(`${compiler.name}-linux-x64`);
                if (toolchain) {
                    detected.push(toolchain);
                }
            }
            catch {
                // Compiler not found
            }
        }
        return detected;
    }
    // ========================================================================
    // COMPILATION
    // ========================================================================
    /**
     * Compile source files
     */
    async compile(projectId, config) {
        const startTime = Date.now();
        const diagnostics = [];
        // Create abort controller for cancellation
        const abortController = new AbortController();
        this.activeCompilations.set(projectId, abortController);
        this.onCompilationStartEmitter.fire({ projectId });
        try {
            // Select compiler based on language
            const compiler = this.selectCompiler(config.language, config.targetPlatform);
            this.onCompilationProgressEmitter.fire({ projectId, phase: 'parsing', progress: 0.1 });
            // Parse source files
            const parsedSources = await this.parseSourceFiles(config.sources, config.language);
            this.onCompilationProgressEmitter.fire({ projectId, phase: 'analyzing', progress: 0.2 });
            // Check for incremental build
            const buildState = this.buildStates.get(projectId);
            const changedFiles = buildState
                ? this.getChangedFiles(config.sources, buildState)
                : config.sources;
            this.onCompilationProgressEmitter.fire({ projectId, phase: 'compiling', progress: 0.3 });
            // Compile each source file to object code
            const objectFiles = [];
            for (let i = 0; i < changedFiles.length; i++) {
                if (abortController.signal.aborted) {
                    throw new Error('Compilation cancelled');
                }
                const source = changedFiles[i];
                const objPath = await this.compileSource(compiler, source, config, diagnostics);
                if (objPath) {
                    objectFiles.push(objPath);
                }
                const progress = 0.3 + (0.5 * (i + 1) / changedFiles.length);
                this.onCompilationProgressEmitter.fire({ projectId, phase: 'compiling', progress });
            }
            // Check for errors
            const hasErrors = diagnostics.some(d => d.severity === 'error');
            if (hasErrors) {
                return {
                    success: false,
                    diagnostics,
                    compilationTime: Date.now() - startTime,
                };
            }
            this.onCompilationProgressEmitter.fire({ projectId, phase: 'linking', progress: 0.8 });
            // Link object files
            const outputPath = await this.link(compiler, objectFiles, config, diagnostics);
            this.onCompilationProgressEmitter.fire({ projectId, phase: 'finishing', progress: 0.95 });
            // Post-processing (strip symbols, compression, etc.)
            await this.postProcess(outputPath, config);
            // Update build state
            this.updateBuildState(projectId, config.sources, objectFiles);
            this.onCompilationProgressEmitter.fire({ projectId, phase: 'complete', progress: 1.0 });
            const result = {
                success: true,
                outputPath,
                outputSize: await this.getFileSize(outputPath),
                diagnostics,
                compilationTime: Date.now() - startTime,
                symbols: await this.extractSymbols(outputPath),
                dependencies: await this.analyzeDependencies(outputPath),
            };
            this.onCompilationCompleteEmitter.fire({ projectId, result });
            return result;
        }
        catch (error) {
            const result = {
                success: false,
                diagnostics: [...diagnostics, {
                        severity: 'error',
                        code: 'COMPILE_ERROR',
                        message: error instanceof Error ? error.message : 'Unknown compilation error',
                        source: 'compiler-bridge',
                    }],
                compilationTime: Date.now() - startTime,
            };
            this.onCompilationCompleteEmitter.fire({ projectId, result });
            return result;
        }
        finally {
            this.activeCompilations.delete(projectId);
        }
    }
    /**
     * Cancel ongoing compilation
     */
    cancelCompilation(projectId) {
        const controller = this.activeCompilations.get(projectId);
        if (controller) {
            controller.abort();
        }
    }
    /**
     * Select appropriate compiler
     */
    selectCompiler(language, platform) {
        const compilerMap = {
            'cpp': 'clang++',
            'c': 'clang',
            'rust': 'rustc',
            'go': 'go build',
            'zig': 'zig',
            'typescript': 'tsc',
            'javascript': 'node',
            'python': 'python',
            'csharp': 'dotnet',
            'java': 'javac',
            'kotlin': 'kotlinc',
            'swift': 'swiftc',
            'wasm': 'emcc',
        };
        // WebAssembly target
        if (platform === 'wasm32' || platform === 'wasm64') {
            if (language === 'cpp' || language === 'c') {
                return 'emcc';
            }
            if (language === 'rust') {
                return 'rustc --target wasm32-unknown-unknown';
            }
        }
        return compilerMap[language] || 'clang';
    }
    /**
     * Parse source files
     */
    async parseSourceFiles(sources, _language) {
        // Pre-process and validate source files
        return sources.map(source => ({
            ...source,
            content: this.preprocessSource(source.content, source.language),
        }));
    }
    /**
     * Preprocess source content
     */
    preprocessSource(content, _language) {
        // Handle preprocessor directives, includes, etc.
        return content;
    }
    /**
     * Compile a single source file
     */
    async compileSource(compiler, source, config, diagnostics) {
        const objPath = source.path.replace(/\.[^.]+$/, '.o');
        // Build compiler command
        const args = this.buildCompilerArgs(source, config);
        const cmd = `${compiler} ${args.join(' ')} -c "${source.path}" -o "${objPath}"`;
        try {
            const result = await this.executeCommand(cmd);
            // Parse compiler output for diagnostics
            this.parseCompilerOutput(result.stderr, source.path, diagnostics);
            return objPath;
        }
        catch (error) {
            if (error instanceof Error) {
                this.parseCompilerOutput(error.message, source.path, diagnostics);
            }
            return null;
        }
    }
    /**
     * Build compiler arguments
     */
    buildCompilerArgs(source, config) {
        const args = [];
        // Optimization level
        switch (config.optimization) {
            case 'none':
                args.push('-O0');
                break;
            case 'size':
                args.push('-Os');
                break;
            case 'speed':
                args.push('-O2');
                break;
            case 'aggressive':
                args.push('-O3');
                break;
        }
        // Debug info
        if (config.debug) {
            args.push('-g');
        }
        // Defines
        if (config.defines) {
            for (const [key, value] of Object.entries(config.defines)) {
                args.push(`-D${key}=${value}`);
            }
        }
        // Include paths
        if (config.includePaths) {
            for (const path of config.includePaths) {
                args.push(`-I"${path}"`);
            }
        }
        // Platform-specific flags
        args.push(...this.getPlatformFlags(config.targetPlatform, config.language));
        // User-specified flags
        if (config.compilerFlags) {
            args.push(...config.compilerFlags);
        }
        return args;
    }
    /**
     * Get platform-specific compiler flags
     */
    getPlatformFlags(platform, language) {
        const flags = [];
        switch (platform) {
            case 'windows-x64':
                flags.push('-target', 'x86_64-pc-windows-msvc');
                break;
            case 'linux-x64':
                flags.push('-target', 'x86_64-unknown-linux-gnu');
                break;
            case 'macos-x64':
                flags.push('-target', 'x86_64-apple-darwin');
                break;
            case 'macos-arm64':
                flags.push('-target', 'arm64-apple-darwin');
                break;
            case 'wasm32':
                flags.push('-target', 'wasm32-unknown-unknown');
                flags.push('-fno-exceptions');
                break;
        }
        // Language-specific flags
        if (language === 'cpp') {
            flags.push('-std=c++20');
        }
        else if (language === 'c') {
            flags.push('-std=c17');
        }
        return flags;
    }
    /**
     * Link object files
     */
    async link(_compiler, objectFiles, config, diagnostics) {
        const linker = this.selectLinker(config.targetPlatform);
        const args = this.buildLinkerArgs(objectFiles, config);
        const cmd = `${linker} ${args.join(' ')}`;
        try {
            const result = await this.executeCommand(cmd);
            this.parseLinkerOutput(result.stderr, diagnostics);
            return config.outputPath;
        }
        catch (error) {
            if (error instanceof Error) {
                this.parseLinkerOutput(error.message, diagnostics);
            }
            throw error;
        }
    }
    /**
     * Select linker for platform
     */
    selectLinker(platform) {
        switch (platform) {
            case 'windows-x64':
            case 'windows-arm64':
                return 'lld-link';
            case 'wasm32':
            case 'wasm64':
                return 'wasm-ld';
            default:
                return 'lld';
        }
    }
    /**
     * Build linker arguments
     */
    buildLinkerArgs(objectFiles, config) {
        const args = [];
        // Output type
        switch (config.outputType) {
            case 'executable':
                // Default
                break;
            case 'shared-library':
                args.push('-shared');
                break;
            case 'static-library':
                // Use ar instead
                break;
        }
        // Output path
        args.push('-o', `"${config.outputPath}"`);
        // Object files
        args.push(...objectFiles.map(f => `"${f}"`));
        // Library paths
        if (config.libraryPaths) {
            for (const path of config.libraryPaths) {
                args.push(`-L"${path}"`);
            }
        }
        // Libraries
        if (config.libraries) {
            for (const lib of config.libraries) {
                args.push(`-l${lib}`);
            }
        }
        // User-specified flags
        if (config.linkerFlags) {
            args.push(...config.linkerFlags);
        }
        return args;
    }
    /**
     * Post-process compiled output
     */
    async postProcess(outputPath, config) {
        // Strip debug symbols for release builds
        if (!config.debug && config.outputType === 'executable') {
            await this.stripSymbols(outputPath);
        }
        // Add resources (Windows)
        if (config.resources && config.targetPlatform.startsWith('windows')) {
            await this.addResources(outputPath, config.resources);
        }
        // Code signing (macOS/iOS)
        if (config.targetPlatform.startsWith('macos') || config.targetPlatform.startsWith('ios')) {
            // await this.codesign(outputPath);
        }
    }
    /**
     * Strip debug symbols
     */
    async stripSymbols(outputPath) {
        await this.executeCommand(`strip "${outputPath}"`);
    }
    /**
     * Add Windows resources
     */
    async addResources(_outputPath, _resources) {
        // Use rc.exe / windres to add resources
    }
    // ========================================================================
    // DIAGNOSTIC PARSING
    // ========================================================================
    /**
     * Parse compiler output for diagnostics
     */
    parseCompilerOutput(output, file, diagnostics) {
        const lines = output.split('\n');
        for (const line of lines) {
            const diagnostic = this.parseDiagnosticLine(line, file);
            if (diagnostic) {
                diagnostics.push(diagnostic);
                this.onDiagnosticEmitter.fire({ projectId: '', diagnostic });
            }
        }
    }
    /**
     * Parse linker output for diagnostics
     */
    parseLinkerOutput(output, diagnostics) {
        const lines = output.split('\n');
        for (const line of lines) {
            if (line.includes('error:') || line.includes('undefined reference')) {
                diagnostics.push({
                    severity: 'error',
                    code: 'LINK_ERROR',
                    message: line.trim(),
                    source: 'linker',
                });
            }
            else if (line.includes('warning:')) {
                diagnostics.push({
                    severity: 'warning',
                    code: 'LINK_WARNING',
                    message: line.trim(),
                    source: 'linker',
                });
            }
        }
    }
    /**
     * Parse a diagnostic line
     */
    parseDiagnosticLine(line, defaultFile) {
        // GCC/Clang format: file:line:col: severity: message
        const gccMatch = line.match(/^([^:]+):(\d+):(\d+):\s*(error|warning|note):\s*(.+)$/);
        if (gccMatch) {
            return {
                severity: gccMatch[4] === 'note' ? 'info' : gccMatch[4],
                code: 'COMPILE',
                message: gccMatch[5],
                file: gccMatch[1],
                line: parseInt(gccMatch[2]),
                column: parseInt(gccMatch[3]),
                source: 'compiler',
            };
        }
        // MSVC format: file(line,col): severity code: message
        const msvcMatch = line.match(/^([^(]+)\((\d+),(\d+)\):\s*(error|warning)\s+(\w+):\s*(.+)$/);
        if (msvcMatch) {
            return {
                severity: msvcMatch[4],
                code: msvcMatch[5],
                message: msvcMatch[6],
                file: msvcMatch[1],
                line: parseInt(msvcMatch[2]),
                column: parseInt(msvcMatch[3]),
                source: 'compiler',
            };
        }
        // Rust format: error[E0001]: message
        const rustMatch = line.match(/^(error|warning)\[(E\d+)\]:\s*(.+)$/);
        if (rustMatch) {
            return {
                severity: rustMatch[1],
                code: rustMatch[2],
                message: rustMatch[3],
                file: defaultFile,
                source: 'rustc',
            };
        }
        return null;
    }
    // ========================================================================
    // INCREMENTAL BUILD
    // ========================================================================
    /**
     * Get changed files since last build
     */
    getChangedFiles(sources, buildState) {
        return sources.filter(source => {
            const oldHash = buildState.fileHashes.get(source.path);
            const newHash = this.hashContent(source.content);
            return oldHash !== newHash;
        });
    }
    /**
     * Update build state
     */
    updateBuildState(projectId, sources, objectFiles) {
        const state = {
            lastBuildTime: new Date(),
            fileHashes: new Map(),
            objectFiles: new Map(),
            dependencies: new Map(),
        };
        for (let i = 0; i < sources.length; i++) {
            const source = sources[i];
            state.fileHashes.set(source.path, this.hashContent(source.content));
            state.objectFiles.set(source.path, objectFiles[i]);
        }
        this.buildStates.set(projectId, state);
    }
    /**
     * Clean build state
     */
    cleanBuildState(projectId) {
        this.buildStates.delete(projectId);
    }
    /**
     * Hash content for change detection
     */
    hashContent(content) {
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(16);
    }
    // ========================================================================
    // SYMBOL & DEPENDENCY ANALYSIS
    // ========================================================================
    /**
     * Extract symbols from compiled output
     */
    async extractSymbols(outputPath) {
        try {
            const result = await this.executeCommand(`nm -C "${outputPath}"`);
            const symbols = [];
            for (const line of result.stdout.split('\n')) {
                const match = line.match(/^([0-9a-f]+)?\s*([TtDdBbCcRrUuWw])\s+(.+)$/);
                if (match) {
                    symbols.push({
                        name: match[3],
                        type: this.symbolTypeFromNm(match[2]),
                        visibility: match[2] === match[2].toUpperCase() ? 'public' : 'private',
                        address: match[1] ? parseInt(match[1], 16) : undefined,
                    });
                }
            }
            return symbols;
        }
        catch {
            return [];
        }
    }
    /**
     * Convert nm symbol type to our type
     */
    symbolTypeFromNm(nmType) {
        switch (nmType.toUpperCase()) {
            case 'T': return 'function';
            case 'D':
            case 'B': return 'variable';
            case 'R': return 'constant';
            default: return 'variable';
        }
    }
    /**
     * Analyze dependencies
     */
    async analyzeDependencies(outputPath) {
        try {
            const result = await this.executeCommand(`ldd "${outputPath}"`);
            const deps = [];
            for (const line of result.stdout.split('\n')) {
                const match = line.match(/^\s*(.+)\s+=>\s+(.+)\s+\(0x[0-9a-f]+\)$/);
                if (match) {
                    deps.push({
                        name: match[1].trim(),
                        type: 'dynamic',
                        resolved: match[2].trim() !== 'not found',
                        path: match[2].trim() !== 'not found' ? match[2].trim() : undefined,
                    });
                }
            }
            return deps;
        }
        catch {
            return [];
        }
    }
    // ========================================================================
    // CROSS-COMPILATION
    // ========================================================================
    /**
     * Configure cross-compilation for target platform
     */
    async configureCrossCompilation(platform, sysrootPath) {
        const toolchain = {
            name: `cross-${platform}`,
            platform,
            compilerPath: this.getCrossCompiler(platform),
            linkerPath: this.getCrossLinker(platform),
            sysroot: sysrootPath,
            includes: sysrootPath ? [`${sysrootPath}/usr/include`] : [],
            libs: sysrootPath ? [`${sysrootPath}/usr/lib`] : [],
        };
        this.registerToolchain(toolchain);
    }
    /**
     * Get cross-compiler for platform
     */
    getCrossCompiler(platform) {
        const compilers = {
            'windows-x64': 'x86_64-w64-mingw32-gcc',
            'windows-arm64': 'aarch64-w64-mingw32-gcc',
            'linux-x64': 'x86_64-linux-gnu-gcc',
            'linux-arm64': 'aarch64-linux-gnu-gcc',
            'macos-x64': 'x86_64-apple-darwin-clang',
            'macos-arm64': 'arm64-apple-darwin-clang',
            'wasm32': 'emcc',
            'wasm64': 'emcc',
            'android-arm64': 'aarch64-linux-android-clang',
            'android-x64': 'x86_64-linux-android-clang',
            'ios-arm64': 'arm64-apple-ios-clang',
        };
        return compilers[platform] || 'clang';
    }
    /**
     * Get cross-linker for platform
     */
    getCrossLinker(platform) {
        const linkers = {
            'windows-x64': 'x86_64-w64-mingw32-ld',
            'windows-arm64': 'aarch64-w64-mingw32-ld',
            'linux-x64': 'x86_64-linux-gnu-ld',
            'linux-arm64': 'aarch64-linux-gnu-ld',
            'macos-x64': 'ld64.lld',
            'macos-arm64': 'ld64.lld',
            'wasm32': 'wasm-ld',
            'wasm64': 'wasm-ld',
            'android-arm64': 'aarch64-linux-android-ld',
            'android-x64': 'x86_64-linux-android-ld',
            'ios-arm64': 'ld64.lld',
        };
        return linkers[platform] || 'lld';
    }
    // ========================================================================
    // WEBASSEMBLY SUPPORT
    // ========================================================================
    /**
     * Compile to WebAssembly
     */
    async compileToWasm(projectId, sources, options = {}) {
        const config = {
            language: sources[0].language,
            sources,
            outputPath: 'output.wasm',
            outputType: 'wasm',
            targetPlatform: 'wasm32',
            optimization: options.optimization || 'speed',
            compilerFlags: [
                '-s', 'STANDALONE_WASM=1',
                '-s', `INITIAL_MEMORY=${options.initialMemory || 16777216}`,
                '-s', `MAXIMUM_MEMORY=${options.maxMemory || 268435456}`,
            ],
        };
        if (options.exportedFunctions) {
            config.compilerFlags.push('-s', `EXPORTED_FUNCTIONS=${JSON.stringify(options.exportedFunctions)}`);
        }
        if (options.features) {
            for (const feature of options.features) {
                config.compilerFlags.push(`-msimd128`, `-m${feature}`);
            }
        }
        return this.compile(projectId, config);
    }
    // ========================================================================
    // UTILITY METHODS
    // ========================================================================
    /**
     * Execute command
     */
    async executeCommand(cmd) {
        // In real implementation, use child_process or similar
        console.log(`[Compiler] Executing: ${cmd}`);
        return { stdout: '', stderr: '' };
    }
    /**
     * Get file size
     */
    async getFileSize(_path) {
        // In real implementation, use fs.stat
        return 0;
    }
};
exports.NativeCompilerBridge = NativeCompilerBridge;
exports.NativeCompilerBridge = NativeCompilerBridge = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], NativeCompilerBridge);
/**
 * Generate CMakeLists.txt
 */
function generateCMakeLists(config) {
    let cmake = `cmake_minimum_required(VERSION 3.20)
project(${config.projectName} VERSION ${config.version})

set(CMAKE_CXX_STANDARD ${config.cppStandard})
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

`;
    // Dependencies
    if (config.dependencies) {
        for (const dep of config.dependencies) {
            const components = dep.components ? ` COMPONENTS ${dep.components.join(' ')}` : '';
            cmake += `find_package(${dep.name}${dep.version ? ` ${dep.version}` : ''} REQUIRED${components})\n`;
        }
        cmake += '\n';
    }
    // Targets
    for (const target of config.targets) {
        switch (target.type) {
            case 'executable':
                cmake += `add_executable(${target.name}\n  ${target.sources.join('\n  ')}\n)\n`;
                break;
            case 'library':
                cmake += `add_library(${target.name} STATIC\n  ${target.sources.join('\n  ')}\n)\n`;
                break;
            case 'shared_library':
                cmake += `add_library(${target.name} SHARED\n  ${target.sources.join('\n  ')}\n)\n`;
                break;
        }
        if (target.includes) {
            cmake += `target_include_directories(${target.name} PRIVATE\n  ${target.includes.join('\n  ')}\n)\n`;
        }
        if (target.links) {
            cmake += `target_link_libraries(${target.name} PRIVATE\n  ${target.links.join('\n  ')}\n)\n`;
        }
        if (target.defines) {
            const defs = Object.entries(target.defines).map(([k, v]) => `${k}=${v}`);
            cmake += `target_compile_definitions(${target.name} PRIVATE\n  ${defs.join('\n  ')}\n)\n`;
        }
        cmake += '\n';
    }
    return cmake;
}
