"use strict";
/**
 * @file ide-experience-index.ts
 * @description Índice Central de Experiência IDE - Aethel IDE
 *
 * Este arquivo unifica todos os sistemas de experiência do usuário:
 * - Error Handling robusto
 * - UX Enhancements (toasts, progress, feedback)
 * - IDE Toolkit (documents, commands, panels)
 * - Integração com sistemas AAA da engine
 *
 * Fornece uma API unificada para uma experiência de usuário
 * profissional e consistente.
 *
 * @version 2.2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandRegistry = exports.DocumentManagerSymbol = exports.DocumentManager = exports.PanelViewType = exports.StatusBarAlignment = exports.ViewColumn = exports.DiagnosticSeverity = exports.generateFeedbackStyles = exports.AnimationHelper = exports.ResponsiveManagerSymbol = exports.ResponsiveManager = exports.AccessibilityManagerSymbol = exports.AccessibilityManager = exports.OnboardingManagerSymbol = exports.OnboardingManager = exports.KeybindingManagerSymbol = exports.KeybindingManager = exports.FeedbackSystemSymbol = exports.FeedbackSystem = exports.ProgressManagerSymbol = exports.ProgressManager = exports.ToastManagerSymbol = exports.ToastManager = exports.Breakpoint = exports.FeedbackType = exports.Easing = exports.ProgressType = exports.ToastType = exports.errorHandler = exports.withTimeout = exports.safeJsonParse = exports.assertDefined = exports.assert = exports.ErrorBoundary = exports.CircuitBreaker = exports.ErrorHandlerSymbol = exports.ErrorHandler = exports.Option = exports.Result = exports.ConfigurationError = exports.TimeoutError = exports.NotFoundError = exports.AuthenticationError = exports.ValidationError = exports.NetworkError = exports.AethelError = exports.CircuitState = exports.RecoveryStrategy = exports.ErrorCategory = exports.ErrorSeverity = void 0;
exports.IDEExperienceModuleInfo = exports.DEFAULT_ONBOARDING_STEPS = exports.DEFAULT_KEYBINDINGS = exports.IDEExperience = exports.IDEExperienceContainerModule = exports.IDE_EXPERIENCE_TYPES = exports.createIDEToolkit = exports.IDEToolkit = exports.createIDEToolkitContainer = exports.IDEToolkitContainerModule = exports.IDE_TOOLKIT_TYPES = exports.WorkspaceServiceSymbol = exports.WorkspaceService = exports.ConfigurationServiceSymbol = exports.ConfigurationService = exports.DiagnosticCollectionSymbol = exports.DiagnosticCollection = exports.TreeViewServiceSymbol = exports.TreeViewService = exports.PanelManagerSymbol = exports.PanelManager = exports.StatusBarServiceSymbol = exports.StatusBarService = exports.InputBoxServiceSymbol = exports.InputBoxService = exports.QuickPickServiceSymbol = exports.QuickPickService = exports.CommandRegistrySymbol = void 0;
exports.createIDEExperienceContainer = createIDEExperienceContainer;
exports.initializeIDEExperience = initializeIDEExperience;
exports.quickStartIDEExperience = quickStartIDEExperience;
const inversify_1 = require("inversify");
// ==================== Error Handling Exports ====================
var error_handling_system_1 = require("../errors/error-handling-system");
// Enums
Object.defineProperty(exports, "ErrorSeverity", { enumerable: true, get: function () { return error_handling_system_1.ErrorSeverity; } });
Object.defineProperty(exports, "ErrorCategory", { enumerable: true, get: function () { return error_handling_system_1.ErrorCategory; } });
Object.defineProperty(exports, "RecoveryStrategy", { enumerable: true, get: function () { return error_handling_system_1.RecoveryStrategy; } });
Object.defineProperty(exports, "CircuitState", { enumerable: true, get: function () { return error_handling_system_1.CircuitState; } });
// Error Classes
Object.defineProperty(exports, "AethelError", { enumerable: true, get: function () { return error_handling_system_1.AethelError; } });
Object.defineProperty(exports, "NetworkError", { enumerable: true, get: function () { return error_handling_system_1.NetworkError; } });
Object.defineProperty(exports, "ValidationError", { enumerable: true, get: function () { return error_handling_system_1.ValidationError; } });
Object.defineProperty(exports, "AuthenticationError", { enumerable: true, get: function () { return error_handling_system_1.AuthenticationError; } });
Object.defineProperty(exports, "NotFoundError", { enumerable: true, get: function () { return error_handling_system_1.NotFoundError; } });
Object.defineProperty(exports, "TimeoutError", { enumerable: true, get: function () { return error_handling_system_1.TimeoutError; } });
Object.defineProperty(exports, "ConfigurationError", { enumerable: true, get: function () { return error_handling_system_1.ConfigurationError; } });
// Result & Option Types
Object.defineProperty(exports, "Result", { enumerable: true, get: function () { return error_handling_system_1.Result; } });
Object.defineProperty(exports, "Option", { enumerable: true, get: function () { return error_handling_system_1.Option; } });
// Services
Object.defineProperty(exports, "ErrorHandler", { enumerable: true, get: function () { return error_handling_system_1.ErrorHandler; } });
Object.defineProperty(exports, "ErrorHandlerSymbol", { enumerable: true, get: function () { return error_handling_system_1.ErrorHandlerSymbol; } });
Object.defineProperty(exports, "CircuitBreaker", { enumerable: true, get: function () { return error_handling_system_1.CircuitBreaker; } });
Object.defineProperty(exports, "ErrorBoundary", { enumerable: true, get: function () { return error_handling_system_1.ErrorBoundary; } });
// Utilities
Object.defineProperty(exports, "assert", { enumerable: true, get: function () { return error_handling_system_1.assert; } });
Object.defineProperty(exports, "assertDefined", { enumerable: true, get: function () { return error_handling_system_1.assertDefined; } });
Object.defineProperty(exports, "safeJsonParse", { enumerable: true, get: function () { return error_handling_system_1.safeJsonParse; } });
Object.defineProperty(exports, "withTimeout", { enumerable: true, get: function () { return error_handling_system_1.withTimeout; } });
// Default instance
Object.defineProperty(exports, "errorHandler", { enumerable: true, get: function () { return error_handling_system_1.errorHandler; } });
// ==================== UX Enhancement Exports ====================
var ux_enhancement_system_1 = require("../ux/ux-enhancement-system");
// Enums
Object.defineProperty(exports, "ToastType", { enumerable: true, get: function () { return ux_enhancement_system_1.ToastType; } });
Object.defineProperty(exports, "ProgressType", { enumerable: true, get: function () { return ux_enhancement_system_1.ProgressType; } });
Object.defineProperty(exports, "Easing", { enumerable: true, get: function () { return ux_enhancement_system_1.Easing; } });
Object.defineProperty(exports, "FeedbackType", { enumerable: true, get: function () { return ux_enhancement_system_1.FeedbackType; } });
Object.defineProperty(exports, "Breakpoint", { enumerable: true, get: function () { return ux_enhancement_system_1.Breakpoint; } });
// Services
Object.defineProperty(exports, "ToastManager", { enumerable: true, get: function () { return ux_enhancement_system_1.ToastManager; } });
Object.defineProperty(exports, "ToastManagerSymbol", { enumerable: true, get: function () { return ux_enhancement_system_1.ToastManagerSymbol; } });
Object.defineProperty(exports, "ProgressManager", { enumerable: true, get: function () { return ux_enhancement_system_1.ProgressManager; } });
Object.defineProperty(exports, "ProgressManagerSymbol", { enumerable: true, get: function () { return ux_enhancement_system_1.ProgressManagerSymbol; } });
Object.defineProperty(exports, "FeedbackSystem", { enumerable: true, get: function () { return ux_enhancement_system_1.FeedbackSystem; } });
Object.defineProperty(exports, "FeedbackSystemSymbol", { enumerable: true, get: function () { return ux_enhancement_system_1.FeedbackSystemSymbol; } });
Object.defineProperty(exports, "KeybindingManager", { enumerable: true, get: function () { return ux_enhancement_system_1.KeybindingManager; } });
Object.defineProperty(exports, "KeybindingManagerSymbol", { enumerable: true, get: function () { return ux_enhancement_system_1.KeybindingManagerSymbol; } });
Object.defineProperty(exports, "OnboardingManager", { enumerable: true, get: function () { return ux_enhancement_system_1.OnboardingManager; } });
Object.defineProperty(exports, "OnboardingManagerSymbol", { enumerable: true, get: function () { return ux_enhancement_system_1.OnboardingManagerSymbol; } });
Object.defineProperty(exports, "AccessibilityManager", { enumerable: true, get: function () { return ux_enhancement_system_1.AccessibilityManager; } });
Object.defineProperty(exports, "AccessibilityManagerSymbol", { enumerable: true, get: function () { return ux_enhancement_system_1.AccessibilityManagerSymbol; } });
Object.defineProperty(exports, "ResponsiveManager", { enumerable: true, get: function () { return ux_enhancement_system_1.ResponsiveManager; } });
Object.defineProperty(exports, "ResponsiveManagerSymbol", { enumerable: true, get: function () { return ux_enhancement_system_1.ResponsiveManagerSymbol; } });
// Utilities
Object.defineProperty(exports, "AnimationHelper", { enumerable: true, get: function () { return ux_enhancement_system_1.AnimationHelper; } });
Object.defineProperty(exports, "generateFeedbackStyles", { enumerable: true, get: function () { return ux_enhancement_system_1.generateFeedbackStyles; } });
// ==================== IDE Toolkit Exports ====================
var ide_toolkit_1 = require("../toolkit/ide-toolkit");
Object.defineProperty(exports, "DiagnosticSeverity", { enumerable: true, get: function () { return ide_toolkit_1.DiagnosticSeverity; } });
Object.defineProperty(exports, "ViewColumn", { enumerable: true, get: function () { return ide_toolkit_1.ViewColumn; } });
Object.defineProperty(exports, "StatusBarAlignment", { enumerable: true, get: function () { return ide_toolkit_1.StatusBarAlignment; } });
// Panel Types
Object.defineProperty(exports, "PanelViewType", { enumerable: true, get: function () { return ide_toolkit_1.PanelViewType; } });
// Services
Object.defineProperty(exports, "DocumentManager", { enumerable: true, get: function () { return ide_toolkit_1.DocumentManager; } });
Object.defineProperty(exports, "DocumentManagerSymbol", { enumerable: true, get: function () { return ide_toolkit_1.DocumentManagerSymbol; } });
Object.defineProperty(exports, "CommandRegistry", { enumerable: true, get: function () { return ide_toolkit_1.CommandRegistry; } });
Object.defineProperty(exports, "CommandRegistrySymbol", { enumerable: true, get: function () { return ide_toolkit_1.CommandRegistrySymbol; } });
Object.defineProperty(exports, "QuickPickService", { enumerable: true, get: function () { return ide_toolkit_1.QuickPickService; } });
Object.defineProperty(exports, "QuickPickServiceSymbol", { enumerable: true, get: function () { return ide_toolkit_1.QuickPickServiceSymbol; } });
Object.defineProperty(exports, "InputBoxService", { enumerable: true, get: function () { return ide_toolkit_1.InputBoxService; } });
Object.defineProperty(exports, "InputBoxServiceSymbol", { enumerable: true, get: function () { return ide_toolkit_1.InputBoxServiceSymbol; } });
Object.defineProperty(exports, "StatusBarService", { enumerable: true, get: function () { return ide_toolkit_1.StatusBarService; } });
Object.defineProperty(exports, "StatusBarServiceSymbol", { enumerable: true, get: function () { return ide_toolkit_1.StatusBarServiceSymbol; } });
Object.defineProperty(exports, "PanelManager", { enumerable: true, get: function () { return ide_toolkit_1.PanelManager; } });
Object.defineProperty(exports, "PanelManagerSymbol", { enumerable: true, get: function () { return ide_toolkit_1.PanelManagerSymbol; } });
Object.defineProperty(exports, "TreeViewService", { enumerable: true, get: function () { return ide_toolkit_1.TreeViewService; } });
Object.defineProperty(exports, "TreeViewServiceSymbol", { enumerable: true, get: function () { return ide_toolkit_1.TreeViewServiceSymbol; } });
Object.defineProperty(exports, "DiagnosticCollection", { enumerable: true, get: function () { return ide_toolkit_1.DiagnosticCollection; } });
Object.defineProperty(exports, "DiagnosticCollectionSymbol", { enumerable: true, get: function () { return ide_toolkit_1.DiagnosticCollectionSymbol; } });
Object.defineProperty(exports, "ConfigurationService", { enumerable: true, get: function () { return ide_toolkit_1.ConfigurationService; } });
Object.defineProperty(exports, "ConfigurationServiceSymbol", { enumerable: true, get: function () { return ide_toolkit_1.ConfigurationServiceSymbol; } });
Object.defineProperty(exports, "WorkspaceService", { enumerable: true, get: function () { return ide_toolkit_1.WorkspaceService; } });
Object.defineProperty(exports, "WorkspaceServiceSymbol", { enumerable: true, get: function () { return ide_toolkit_1.WorkspaceServiceSymbol; } });
// Container
Object.defineProperty(exports, "IDE_TOOLKIT_TYPES", { enumerable: true, get: function () { return ide_toolkit_1.IDE_TOOLKIT_TYPES; } });
Object.defineProperty(exports, "IDEToolkitContainerModule", { enumerable: true, get: function () { return ide_toolkit_1.IDEToolkitContainerModule; } });
Object.defineProperty(exports, "createIDEToolkitContainer", { enumerable: true, get: function () { return ide_toolkit_1.createIDEToolkitContainer; } });
// Facade
Object.defineProperty(exports, "IDEToolkit", { enumerable: true, get: function () { return ide_toolkit_1.IDEToolkit; } });
Object.defineProperty(exports, "createIDEToolkit", { enumerable: true, get: function () { return ide_toolkit_1.createIDEToolkit; } });
// ==================== Combined Container Module ====================
/**
 * Símbolos para injeção de dependência de experiência IDE
 */
exports.IDE_EXPERIENCE_TYPES = {
    // Error Handling
    ErrorHandler: Symbol('ErrorHandler'),
    // UX
    ToastManager: Symbol('ToastManager'),
    ProgressManager: Symbol('ProgressManager'),
    FeedbackSystem: Symbol('FeedbackSystem'),
    KeybindingManager: Symbol('KeybindingManager'),
    OnboardingManager: Symbol('OnboardingManager'),
    AccessibilityManager: Symbol('AccessibilityManager'),
    ResponsiveManager: Symbol('ResponsiveManager'),
    // Toolkit
    DocumentManager: Symbol('DocumentManager'),
    CommandRegistry: Symbol('CommandRegistry'),
    QuickPickService: Symbol('QuickPickService'),
    InputBoxService: Symbol('InputBoxService'),
    StatusBarService: Symbol('StatusBarService'),
    PanelManager: Symbol('PanelManager'),
    TreeViewService: Symbol('TreeViewService'),
    DiagnosticCollection: Symbol('DiagnosticCollection'),
    ConfigurationService: Symbol('ConfigurationService'),
    WorkspaceService: Symbol('WorkspaceService'),
};
// Import classes for binding
const error_handling_system_2 = require("../errors/error-handling-system");
const ux_enhancement_system_2 = require("../ux/ux-enhancement-system");
const ide_toolkit_2 = require("../toolkit/ide-toolkit");
/**
 * Container module para todos os serviços de experiência IDE
 */
exports.IDEExperienceContainerModule = new inversify_1.ContainerModule((bind) => {
    // Error Handling
    bind(exports.IDE_EXPERIENCE_TYPES.ErrorHandler).to(error_handling_system_2.ErrorHandler).inSingletonScope();
    // UX Enhancement
    bind(exports.IDE_EXPERIENCE_TYPES.ToastManager).to(ux_enhancement_system_2.ToastManager).inSingletonScope();
    bind(exports.IDE_EXPERIENCE_TYPES.ProgressManager).to(ux_enhancement_system_2.ProgressManager).inSingletonScope();
    bind(exports.IDE_EXPERIENCE_TYPES.FeedbackSystem).to(ux_enhancement_system_2.FeedbackSystem).inSingletonScope();
    bind(exports.IDE_EXPERIENCE_TYPES.KeybindingManager).to(ux_enhancement_system_2.KeybindingManager).inSingletonScope();
    bind(exports.IDE_EXPERIENCE_TYPES.OnboardingManager).to(ux_enhancement_system_2.OnboardingManager).inSingletonScope();
    bind(exports.IDE_EXPERIENCE_TYPES.AccessibilityManager).to(ux_enhancement_system_2.AccessibilityManager).inSingletonScope();
    bind(exports.IDE_EXPERIENCE_TYPES.ResponsiveManager).to(ux_enhancement_system_2.ResponsiveManager).inSingletonScope();
    // IDE Toolkit
    bind(exports.IDE_EXPERIENCE_TYPES.DocumentManager).to(ide_toolkit_2.DocumentManager).inSingletonScope();
    bind(exports.IDE_EXPERIENCE_TYPES.CommandRegistry).to(ide_toolkit_2.CommandRegistry).inSingletonScope();
    bind(exports.IDE_EXPERIENCE_TYPES.QuickPickService).to(ide_toolkit_2.QuickPickService).inSingletonScope();
    bind(exports.IDE_EXPERIENCE_TYPES.InputBoxService).to(ide_toolkit_2.InputBoxService).inSingletonScope();
    bind(exports.IDE_EXPERIENCE_TYPES.StatusBarService).to(ide_toolkit_2.StatusBarService).inSingletonScope();
    bind(exports.IDE_EXPERIENCE_TYPES.PanelManager).to(ide_toolkit_2.PanelManager).inSingletonScope();
    bind(exports.IDE_EXPERIENCE_TYPES.TreeViewService).to(ide_toolkit_2.TreeViewService).inSingletonScope();
    bind(exports.IDE_EXPERIENCE_TYPES.DiagnosticCollection).to(ide_toolkit_2.DiagnosticCollection).inSingletonScope();
    bind(exports.IDE_EXPERIENCE_TYPES.ConfigurationService).to(ide_toolkit_2.ConfigurationService).inSingletonScope();
    bind(exports.IDE_EXPERIENCE_TYPES.WorkspaceService).to(ide_toolkit_2.WorkspaceService).inSingletonScope();
});
/**
 * Facade principal para experiência IDE unificada
 */
class IDEExperience {
    constructor(container) {
        this.container = container;
        this.initialized = false;
    }
    // ==================== Error Handling ====================
    get errors() {
        return this.container.get(exports.IDE_EXPERIENCE_TYPES.ErrorHandler);
    }
    // ==================== UX Services ====================
    get toast() {
        return this.container.get(exports.IDE_EXPERIENCE_TYPES.ToastManager);
    }
    get progress() {
        return this.container.get(exports.IDE_EXPERIENCE_TYPES.ProgressManager);
    }
    get feedback() {
        return this.container.get(exports.IDE_EXPERIENCE_TYPES.FeedbackSystem);
    }
    get keybindings() {
        return this.container.get(exports.IDE_EXPERIENCE_TYPES.KeybindingManager);
    }
    get onboarding() {
        return this.container.get(exports.IDE_EXPERIENCE_TYPES.OnboardingManager);
    }
    get a11y() {
        return this.container.get(exports.IDE_EXPERIENCE_TYPES.AccessibilityManager);
    }
    get responsive() {
        return this.container.get(exports.IDE_EXPERIENCE_TYPES.ResponsiveManager);
    }
    // ==================== IDE Toolkit Services ====================
    get documents() {
        return this.container.get(exports.IDE_EXPERIENCE_TYPES.DocumentManager);
    }
    get commands() {
        return this.container.get(exports.IDE_EXPERIENCE_TYPES.CommandRegistry);
    }
    get quickPick() {
        return this.container.get(exports.IDE_EXPERIENCE_TYPES.QuickPickService);
    }
    get inputBox() {
        return this.container.get(exports.IDE_EXPERIENCE_TYPES.InputBoxService);
    }
    get statusBar() {
        return this.container.get(exports.IDE_EXPERIENCE_TYPES.StatusBarService);
    }
    get panels() {
        return this.container.get(exports.IDE_EXPERIENCE_TYPES.PanelManager);
    }
    get treeView() {
        return this.container.get(exports.IDE_EXPERIENCE_TYPES.TreeViewService);
    }
    get diagnostics() {
        return this.container.get(exports.IDE_EXPERIENCE_TYPES.DiagnosticCollection);
    }
    get config() {
        return this.container.get(exports.IDE_EXPERIENCE_TYPES.ConfigurationService);
    }
    get workspace() {
        return this.container.get(exports.IDE_EXPERIENCE_TYPES.WorkspaceService);
    }
    // ==================== Convenience Methods ====================
    /**
     * Mostrar mensagem de info com toast
     */
    info(message, title) {
        return this.toast.info(message, { title });
    }
    /**
     * Mostrar mensagem de sucesso com toast
     */
    success(message, title) {
        return this.toast.success(message, { title });
    }
    /**
     * Mostrar mensagem de warning com toast
     */
    warning(message, title) {
        return this.toast.warning(message, { title });
    }
    /**
     * Mostrar mensagem de erro com toast
     */
    error(message, title) {
        return this.toast.error(message, { title });
    }
    /**
     * Mostrar loading com toast e executar operação
     */
    async withLoading(message, operation, options) {
        return this.toast.promise(operation(), {
            loading: message,
            success: options?.successMessage ?? 'Concluído!',
            error: options?.errorMessage ?? 'Erro ao executar operação.',
        });
    }
    /**
     * Executar com progress indicator
     */
    async withProgress(title, operation) {
        return this.progress.withProgress({ id: `progress-${Date.now()}`, type: 'determinate', title }, operation);
    }
    /**
     * Registrar comando
     */
    registerCommand(id, handler, options) {
        const disposable = this.commands.registerCommand({ id, title: options?.title ?? id }, handler);
        if (options?.keybinding) {
            this.keybindings.register({
                id: `kb-${id}`,
                keys: options.keybinding,
                command: id,
                description: options?.title ?? id,
            });
        }
        return disposable;
    }
    /**
     * Executar comando
     */
    async executeCommand(commandId, ...args) {
        return this.commands.executeCommand(commandId, ...args);
    }
    /**
     * Criar item na status bar
     */
    createStatusBarItem(text, options) {
        const item = this.statusBar.createItem(options?.alignment === 'right' ? 2 : 1, options?.priority ?? 0);
        item.text = text;
        if (options?.tooltip)
            item.tooltip = options.tooltip;
        if (options?.command)
            item.command = options.command;
        item.show();
        return item;
    }
    /**
     * Anunciar para screen readers
     */
    announce(message, priority = 'polite') {
        this.a11y.announce(message, priority);
    }
    /**
     * Obter status
     */
    getStatus() {
        return {
            initialized: this.initialized,
            services: {
                errorHandler: true,
                toastManager: true,
                progressManager: true,
                feedbackSystem: true,
                keybindingManager: true,
                onboardingManager: true,
                accessibilityManager: true,
                responsiveManager: true,
                documentManager: true,
                commandRegistry: true,
                statusBar: true,
                panels: true,
            },
            errors: this.errors.getStats().totalErrors,
            breakpoint: this.responsive.getCurrentBreakpoint(),
        };
    }
    /**
     * Dispose de todos os serviços
     */
    dispose() {
        // Dispose all services
        try {
            this.errors.dispose();
        }
        catch { }
        try {
            this.toast.dispose();
        }
        catch { }
        try {
            this.progress.dispose();
        }
        catch { }
        try {
            this.feedback.dispose();
        }
        catch { }
        try {
            this.keybindings.dispose();
        }
        catch { }
        try {
            this.onboarding.dispose();
        }
        catch { }
        try {
            this.a11y.dispose();
        }
        catch { }
        try {
            this.responsive.dispose();
        }
        catch { }
        try {
            this.documents.dispose();
        }
        catch { }
        try {
            this.commands.dispose();
        }
        catch { }
        try {
            this.quickPick.dispose();
        }
        catch { }
        try {
            this.inputBox.dispose();
        }
        catch { }
        try {
            this.statusBar.dispose();
        }
        catch { }
        try {
            this.panels.dispose();
        }
        catch { }
        try {
            this.treeView.dispose();
        }
        catch { }
        try {
            this.diagnostics.dispose();
        }
        catch { }
        try {
            this.config.dispose();
        }
        catch { }
        try {
            this.workspace.dispose();
        }
        catch { }
    }
}
exports.IDEExperience = IDEExperience;
// ==================== Factory Functions ====================
/**
 * Criar container de experiência IDE
 */
function createIDEExperienceContainer() {
    const container = new inversify_1.Container();
    container.load(exports.IDEExperienceContainerModule);
    return container;
}
/**
 * Inicializar experiência IDE
 */
async function initializeIDEExperience(container, config) {
    const experience = new IDEExperience(container);
    // Configurar acessibilidade
    if (config?.enableA11y !== false && config?.a11yConfig) {
        experience.a11y.setConfig(config.a11yConfig);
    }
    // Registrar keybindings
    if (config?.keybindings) {
        experience.keybindings.registerMany(config.keybindings);
    }
    // Configurar onboarding
    if (config?.onboardingSteps) {
        experience.onboarding.setSteps(config.onboardingSteps);
    }
    // Registrar config defaults
    if (config?.configDefaults) {
        experience.config.registerDefaults(config.configDefaults);
    }
    return experience;
}
/**
 * Quick start - cria e inicializa tudo de uma vez
 */
async function quickStartIDEExperience(config) {
    const container = createIDEExperienceContainer();
    const experience = await initializeIDEExperience(container, config);
    return { container, experience };
}
// ==================== Default Keybindings ====================
/**
 * Keybindings padrão da IDE
 */
exports.DEFAULT_KEYBINDINGS = [
    // Arquivo
    { id: 'file.new', keys: 'Ctrl+N', command: 'file.new', description: 'Novo arquivo', category: 'Arquivo' },
    { id: 'file.open', keys: 'Ctrl+O', command: 'file.open', description: 'Abrir arquivo', category: 'Arquivo' },
    { id: 'file.save', keys: 'Ctrl+S', command: 'file.save', description: 'Salvar', category: 'Arquivo' },
    { id: 'file.saveAll', keys: 'Ctrl+Shift+S', command: 'file.saveAll', description: 'Salvar todos', category: 'Arquivo' },
    // Edição
    { id: 'edit.undo', keys: 'Ctrl+Z', command: 'edit.undo', description: 'Desfazer', category: 'Edição' },
    { id: 'edit.redo', keys: 'Ctrl+Y', command: 'edit.redo', description: 'Refazer', category: 'Edição' },
    { id: 'edit.cut', keys: 'Ctrl+X', command: 'edit.cut', description: 'Recortar', category: 'Edição' },
    { id: 'edit.copy', keys: 'Ctrl+C', command: 'edit.copy', description: 'Copiar', category: 'Edição' },
    { id: 'edit.paste', keys: 'Ctrl+V', command: 'edit.paste', description: 'Colar', category: 'Edição' },
    { id: 'edit.selectAll', keys: 'Ctrl+A', command: 'edit.selectAll', description: 'Selecionar tudo', category: 'Edição' },
    { id: 'edit.find', keys: 'Ctrl+F', command: 'edit.find', description: 'Buscar', category: 'Edição' },
    { id: 'edit.replace', keys: 'Ctrl+H', command: 'edit.replace', description: 'Substituir', category: 'Edição' },
    // Navegação
    { id: 'nav.goToLine', keys: 'Ctrl+G', command: 'nav.goToLine', description: 'Ir para linha', category: 'Navegação' },
    { id: 'nav.goToFile', keys: 'Ctrl+P', command: 'nav.goToFile', description: 'Ir para arquivo', category: 'Navegação' },
    { id: 'nav.goToSymbol', keys: 'Ctrl+Shift+O', command: 'nav.goToSymbol', description: 'Ir para símbolo', category: 'Navegação' },
    // View
    { id: 'view.commandPalette', keys: 'Ctrl+Shift+P', command: 'view.commandPalette', description: 'Paleta de comandos', category: 'View' },
    { id: 'view.explorer', keys: 'Ctrl+Shift+E', command: 'view.explorer', description: 'Explorer', category: 'View' },
    { id: 'view.search', keys: 'Ctrl+Shift+F', command: 'view.search', description: 'Busca global', category: 'View' },
    { id: 'view.terminal', keys: 'Ctrl+`', command: 'view.terminal', description: 'Terminal', category: 'View' },
    { id: 'view.problems', keys: 'Ctrl+Shift+M', command: 'view.problems', description: 'Problemas', category: 'View' },
    // Debug
    { id: 'debug.start', keys: 'F5', command: 'debug.start', description: 'Iniciar debug', category: 'Debug' },
    { id: 'debug.stop', keys: 'Shift+F5', command: 'debug.stop', description: 'Parar debug', category: 'Debug' },
    { id: 'debug.stepOver', keys: 'F10', command: 'debug.stepOver', description: 'Step over', category: 'Debug' },
    { id: 'debug.stepInto', keys: 'F11', command: 'debug.stepInto', description: 'Step into', category: 'Debug' },
    { id: 'debug.toggleBreakpoint', keys: 'F9', command: 'debug.toggleBreakpoint', description: 'Toggle breakpoint', category: 'Debug' },
    // AI/Copilot
    { id: 'ai.suggest', keys: 'Ctrl+Space', command: 'ai.suggest', description: 'Sugestões IA', category: 'AI' },
    { id: 'ai.chat', keys: 'Ctrl+Shift+I', command: 'ai.chat', description: 'Chat com IA', category: 'AI' },
    { id: 'ai.explain', keys: 'Ctrl+Shift+E', command: 'ai.explain', description: 'Explicar código', category: 'AI' },
];
// ==================== Default Onboarding ====================
/**
 * Steps de onboarding padrão
 */
exports.DEFAULT_ONBOARDING_STEPS = [
    {
        id: 'welcome',
        title: 'Bem-vindo ao Aethel IDE!',
        description: 'Uma IDE profissional com IA integrada para desenvolvimento de jogos AAA.',
    },
    {
        id: 'explorer',
        title: 'Explorer',
        description: 'Navegue pelos arquivos do seu projeto aqui.',
        target: '.explorer-viewlet',
        position: 'right',
    },
    {
        id: 'editor',
        title: 'Editor',
        description: 'Edite seu código com autocomplete inteligente e sugestões de IA.',
        target: '.editor-container',
        position: 'bottom',
    },
    {
        id: 'terminal',
        title: 'Terminal Integrado',
        description: 'Execute comandos diretamente na IDE.',
        target: '.terminal-panel',
        position: 'top',
    },
    {
        id: 'ai-chat',
        title: 'Chat com IA',
        description: 'Converse com a IA para obter ajuda, gerar código e mais.',
        target: '.ai-chat-panel',
        position: 'left',
    },
    {
        id: 'commands',
        title: 'Paleta de Comandos',
        description: 'Pressione Ctrl+Shift+P para acessar todos os comandos.',
        action: { label: 'Abrir Paleta', command: 'view.commandPalette' },
    },
    {
        id: 'complete',
        title: 'Pronto para começar!',
        description: 'Você está pronto para criar jogos incríveis. Boa sorte!',
    },
];
// ==================== Module Info ====================
/**
 * Informações do módulo de experiência IDE
 */
exports.IDEExperienceModuleInfo = {
    name: 'IDE Experience',
    version: '2.2.0',
    description: 'Sistema unificado de experiência do usuário para Aethel IDE',
    systems: [
        'Error Handling',
        'Toast Notifications',
        'Progress Indicators',
        'Feedback System',
        'Keybinding Manager',
        'Onboarding Flow',
        'Accessibility (a11y)',
        'Responsive Design',
        'Document Manager',
        'Command Registry',
        'Quick Pick',
        'Input Box',
        'Status Bar',
        'Panel Manager',
        'Tree View',
        'Diagnostics',
        'Configuration',
        'Workspace',
    ],
    features: [
        'Result<T, E> pattern (Rust-inspired)',
        'Option<T> pattern (Rust-inspired)',
        'Circuit Breaker pattern',
        'Error Boundaries',
        'Retry with exponential backoff',
        'Promise-based toast notifications',
        'Step-based progress indicators',
        'Haptic feedback support',
        'Screen reader announcements',
        'Responsive breakpoints',
        'Animation helpers',
        'VS Code-compatible API',
    ],
};
