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
import { Container, ContainerModule } from 'inversify';
export { ErrorSeverity, ErrorCategory, RecoveryStrategy, CircuitState, ErrorContext, ErrorBreadcrumb, RecoveryResult, ErrorReport, RetryConfig, CircuitBreakerConfig, AethelError, NetworkError, ValidationError, AuthenticationError, NotFoundError, TimeoutError, ConfigurationError, Result, Option, ErrorHandler, ErrorHandlerSymbol, CircuitBreaker, ErrorBoundary, assert, assertDefined, safeJsonParse, withTimeout, errorHandler, } from '../errors/error-handling-system';
export { ToastType, ProgressType, Easing, FeedbackType, Breakpoint, ToastConfig, ProgressConfig, AnimationConfig, Keybinding, OnboardingStep, A11yConfig, ToastManager, ToastManagerSymbol, ProgressManager, ProgressManagerSymbol, FeedbackSystem, FeedbackSystemSymbol, KeybindingManager, KeybindingManagerSymbol, OnboardingManager, OnboardingManagerSymbol, AccessibilityManager, AccessibilityManagerSymbol, ResponsiveManager, ResponsiveManagerSymbol, AnimationHelper, generateFeedbackStyles, } from '../ux/ux-enhancement-system';
export { Uri, Position, Range, Selection, TextEdit, WorkspaceEdit, DiagnosticSeverity, Diagnostic, ViewColumn, StatusBarAlignment, TextDocument, TextEditor, TextEditorEdit, Command, QuickPickItem, QuickPickOptions, InputBoxOptions, PanelViewType, PanelConfig, TreeItem, TreeDataProvider, WorkspaceFolder, DocumentManager, DocumentManagerSymbol, CommandRegistry, CommandRegistrySymbol, QuickPickService, QuickPickServiceSymbol, InputBoxService, InputBoxServiceSymbol, StatusBarService, StatusBarServiceSymbol, PanelManager, PanelManagerSymbol, TreeViewService, TreeViewServiceSymbol, DiagnosticCollection, DiagnosticCollectionSymbol, ConfigurationService, ConfigurationServiceSymbol, WorkspaceService, WorkspaceServiceSymbol, IDE_TOOLKIT_TYPES, IDEToolkitContainerModule, createIDEToolkitContainer, IDEToolkit, createIDEToolkit, } from '../toolkit/ide-toolkit';
/**
 * Símbolos para injeção de dependência de experiência IDE
 */
export declare const IDE_EXPERIENCE_TYPES: {
    ErrorHandler: symbol;
    ToastManager: symbol;
    ProgressManager: symbol;
    FeedbackSystem: symbol;
    KeybindingManager: symbol;
    OnboardingManager: symbol;
    AccessibilityManager: symbol;
    ResponsiveManager: symbol;
    DocumentManager: symbol;
    CommandRegistry: symbol;
    QuickPickService: symbol;
    InputBoxService: symbol;
    StatusBarService: symbol;
    PanelManager: symbol;
    TreeViewService: symbol;
    DiagnosticCollection: symbol;
    ConfigurationService: symbol;
    WorkspaceService: symbol;
};
import { ErrorHandler } from '../errors/error-handling-system';
import { ToastManager, ProgressManager, FeedbackSystem, KeybindingManager, OnboardingManager, AccessibilityManager, ResponsiveManager } from '../ux/ux-enhancement-system';
import { DocumentManager, CommandRegistry, QuickPickService, InputBoxService, StatusBarService, PanelManager, TreeViewService, DiagnosticCollection, ConfigurationService, WorkspaceService } from '../toolkit/ide-toolkit';
/**
 * Container module para todos os serviços de experiência IDE
 */
export declare const IDEExperienceContainerModule: ContainerModule;
/**
 * Configuração de inicialização da experiência IDE
 */
export interface IDEExperienceConfig {
    /** Habilitar notificações toast */
    enableToasts?: boolean;
    /** Habilitar indicadores de progresso */
    enableProgress?: boolean;
    /** Habilitar feedback háptico */
    enableHaptics?: boolean;
    /** Habilitar acessibilidade */
    enableA11y?: boolean;
    /** Configuração de acessibilidade */
    a11yConfig?: Partial<import('../ux/ux-enhancement-system').A11yConfig>;
    /** Keybindings iniciais */
    keybindings?: import('../ux/ux-enhancement-system').Keybinding[];
    /** Onboarding steps */
    onboardingSteps?: import('../ux/ux-enhancement-system').OnboardingStep[];
    /** Defaults de configuração */
    configDefaults?: Record<string, unknown>;
}
/**
 * Status da experiência IDE
 */
export interface IDEExperienceStatus {
    initialized: boolean;
    services: {
        errorHandler: boolean;
        toastManager: boolean;
        progressManager: boolean;
        feedbackSystem: boolean;
        keybindingManager: boolean;
        onboardingManager: boolean;
        accessibilityManager: boolean;
        responsiveManager: boolean;
        documentManager: boolean;
        commandRegistry: boolean;
        statusBar: boolean;
        panels: boolean;
    };
    errors: number;
    breakpoint: string;
}
/**
 * Facade principal para experiência IDE unificada
 */
export declare class IDEExperience {
    private container;
    private initialized;
    constructor(container: Container);
    get errors(): ErrorHandler;
    get toast(): ToastManager;
    get progress(): ProgressManager;
    get feedback(): FeedbackSystem;
    get keybindings(): KeybindingManager;
    get onboarding(): OnboardingManager;
    get a11y(): AccessibilityManager;
    get responsive(): ResponsiveManager;
    get documents(): DocumentManager;
    get commands(): CommandRegistry;
    get quickPick(): QuickPickService;
    get inputBox(): InputBoxService;
    get statusBar(): StatusBarService;
    get panels(): PanelManager;
    get treeView(): TreeViewService;
    get diagnostics(): DiagnosticCollection;
    get config(): ConfigurationService;
    get workspace(): WorkspaceService;
    /**
     * Mostrar mensagem de info com toast
     */
    info(message: string, title?: string): string;
    /**
     * Mostrar mensagem de sucesso com toast
     */
    success(message: string, title?: string): string;
    /**
     * Mostrar mensagem de warning com toast
     */
    warning(message: string, title?: string): string;
    /**
     * Mostrar mensagem de erro com toast
     */
    error(message: string, title?: string): string;
    /**
     * Mostrar loading com toast e executar operação
     */
    withLoading<T>(message: string, operation: () => Promise<T>, options?: {
        successMessage?: string;
        errorMessage?: string;
    }): Promise<T>;
    /**
     * Executar com progress indicator
     */
    withProgress<T>(title: string, operation: (report: (value: number, message?: string) => void) => Promise<T>): Promise<T>;
    /**
     * Registrar comando
     */
    registerCommand(id: string, handler: (...args: unknown[]) => unknown, options?: {
        title?: string;
        keybinding?: string;
    }): {
        dispose: () => void;
    };
    /**
     * Executar comando
     */
    executeCommand<T = unknown>(commandId: string, ...args: unknown[]): Promise<T | undefined>;
    /**
     * Criar item na status bar
     */
    createStatusBarItem(text: string, options?: {
        alignment?: 'left' | 'right';
        priority?: number;
        tooltip?: string;
        command?: string;
    }): import("../toolkit/ide-toolkit").StatusBarItem;
    /**
     * Anunciar para screen readers
     */
    announce(message: string, priority?: 'polite' | 'assertive'): void;
    /**
     * Obter status
     */
    getStatus(): IDEExperienceStatus;
    /**
     * Dispose de todos os serviços
     */
    dispose(): void;
}
/**
 * Criar container de experiência IDE
 */
export declare function createIDEExperienceContainer(): Container;
/**
 * Inicializar experiência IDE
 */
export declare function initializeIDEExperience(container: Container, config?: IDEExperienceConfig): Promise<IDEExperience>;
/**
 * Quick start - cria e inicializa tudo de uma vez
 */
export declare function quickStartIDEExperience(config?: IDEExperienceConfig): Promise<{
    container: Container;
    experience: IDEExperience;
}>;
/**
 * Keybindings padrão da IDE
 */
export declare const DEFAULT_KEYBINDINGS: import('../ux/ux-enhancement-system').Keybinding[];
/**
 * Steps de onboarding padrão
 */
export declare const DEFAULT_ONBOARDING_STEPS: import('../ux/ux-enhancement-system').OnboardingStep[];
/**
 * Informações do módulo de experiência IDE
 */
export declare const IDEExperienceModuleInfo: {
    name: string;
    version: string;
    description: string;
    systems: string[];
    features: string[];
};
