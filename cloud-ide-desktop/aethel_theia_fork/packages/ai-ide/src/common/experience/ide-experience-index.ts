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

import { Container, ContainerModule, interfaces } from 'inversify';

// ==================== Error Handling Exports ====================

export {
  // Enums
  ErrorSeverity,
  ErrorCategory,
  RecoveryStrategy,
  CircuitState,
  
  // Interfaces
  ErrorContext,
  ErrorBreadcrumb,
  RecoveryResult,
  ErrorReport,
  RetryConfig,
  CircuitBreakerConfig,
  
  // Error Classes
  AethelError,
  NetworkError,
  ValidationError,
  AuthenticationError,
  NotFoundError,
  TimeoutError,
  ConfigurationError,
  
  // Result & Option Types
  Result,
  Option,
  
  // Services
  ErrorHandler,
  ErrorHandlerSymbol,
  CircuitBreaker,
  ErrorBoundary,
  
  // Utilities
  assert,
  assertDefined,
  safeJsonParse,
  withTimeout,
  
  // Default instance
  errorHandler,
} from '../errors/error-handling-system';

// ==================== UX Enhancement Exports ====================

export {
  // Enums
  ToastType,
  ProgressType,
  Easing,
  FeedbackType,
  Breakpoint,
  
  // Interfaces
  ToastConfig,
  ProgressConfig,
  AnimationConfig,
  Keybinding,
  OnboardingStep,
  A11yConfig,
  
  // Services
  ToastManager,
  ToastManagerSymbol,
  ProgressManager,
  ProgressManagerSymbol,
  FeedbackSystem,
  FeedbackSystemSymbol,
  KeybindingManager,
  KeybindingManagerSymbol,
  OnboardingManager,
  OnboardingManagerSymbol,
  AccessibilityManager,
  AccessibilityManagerSymbol,
  ResponsiveManager,
  ResponsiveManagerSymbol,
  
  // Utilities
  AnimationHelper,
  generateFeedbackStyles,
} from '../ux/ux-enhancement-system';

// ==================== IDE Toolkit Exports ====================

export {
  // Types
  Uri,
  Position,
  Range,
  Selection,
  TextEdit,
  WorkspaceEdit,
  DiagnosticSeverity,
  Diagnostic,
  ViewColumn,
  StatusBarAlignment,
  
  // Document Types
  TextDocument,
  TextEditor,
  TextEditorEdit,
  
  // Command Types
  Command,
  
  // Quick Pick Types
  QuickPickItem,
  QuickPickOptions,
  
  // Input Box Types
  InputBoxOptions,
  
  // Panel Types
  PanelViewType,
  PanelConfig,
  
  // Tree View Types
  TreeItem,
  TreeDataProvider,
  
  // Workspace Types
  WorkspaceFolder,
  
  // Services
  DocumentManager,
  DocumentManagerSymbol,
  CommandRegistry,
  CommandRegistrySymbol,
  QuickPickService,
  QuickPickServiceSymbol,
  InputBoxService,
  InputBoxServiceSymbol,
  StatusBarService,
  StatusBarServiceSymbol,
  PanelManager,
  PanelManagerSymbol,
  TreeViewService,
  TreeViewServiceSymbol,
  DiagnosticCollection,
  DiagnosticCollectionSymbol,
  ConfigurationService,
  ConfigurationServiceSymbol,
  WorkspaceService,
  WorkspaceServiceSymbol,
  
  // Container
  IDE_TOOLKIT_TYPES,
  IDEToolkitContainerModule,
  createIDEToolkitContainer,
  
  // Facade
  IDEToolkit,
  createIDEToolkit,
} from '../toolkit/ide-toolkit';

// ==================== Combined Container Module ====================

/**
 * Símbolos para injeção de dependência de experiência IDE
 */
export const IDE_EXPERIENCE_TYPES = {
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
import { ErrorHandler } from '../errors/error-handling-system';
import {
  ToastManager,
  ProgressManager,
  FeedbackSystem,
  KeybindingManager,
  OnboardingManager,
  AccessibilityManager,
  ResponsiveManager,
} from '../ux/ux-enhancement-system';
import {
  DocumentManager,
  CommandRegistry,
  QuickPickService,
  InputBoxService,
  StatusBarService,
  PanelManager,
  TreeViewService,
  DiagnosticCollection,
  ConfigurationService,
  WorkspaceService,
} from '../toolkit/ide-toolkit';

/**
 * Container module para todos os serviços de experiência IDE
 */
export const IDEExperienceContainerModule = new ContainerModule((bind) => {
  // Error Handling
  bind(IDE_EXPERIENCE_TYPES.ErrorHandler).to(ErrorHandler).inSingletonScope();
  
  // UX Enhancement
  bind(IDE_EXPERIENCE_TYPES.ToastManager).to(ToastManager).inSingletonScope();
  bind(IDE_EXPERIENCE_TYPES.ProgressManager).to(ProgressManager).inSingletonScope();
  bind(IDE_EXPERIENCE_TYPES.FeedbackSystem).to(FeedbackSystem).inSingletonScope();
  bind(IDE_EXPERIENCE_TYPES.KeybindingManager).to(KeybindingManager).inSingletonScope();
  bind(IDE_EXPERIENCE_TYPES.OnboardingManager).to(OnboardingManager).inSingletonScope();
  bind(IDE_EXPERIENCE_TYPES.AccessibilityManager).to(AccessibilityManager).inSingletonScope();
  bind(IDE_EXPERIENCE_TYPES.ResponsiveManager).to(ResponsiveManager).inSingletonScope();
  
  // IDE Toolkit
  bind(IDE_EXPERIENCE_TYPES.DocumentManager).to(DocumentManager).inSingletonScope();
  bind(IDE_EXPERIENCE_TYPES.CommandRegistry).to(CommandRegistry).inSingletonScope();
  bind(IDE_EXPERIENCE_TYPES.QuickPickService).to(QuickPickService).inSingletonScope();
  bind(IDE_EXPERIENCE_TYPES.InputBoxService).to(InputBoxService).inSingletonScope();
  bind(IDE_EXPERIENCE_TYPES.StatusBarService).to(StatusBarService).inSingletonScope();
  bind(IDE_EXPERIENCE_TYPES.PanelManager).to(PanelManager).inSingletonScope();
  bind(IDE_EXPERIENCE_TYPES.TreeViewService).to(TreeViewService).inSingletonScope();
  bind(IDE_EXPERIENCE_TYPES.DiagnosticCollection).to(DiagnosticCollection).inSingletonScope();
  bind(IDE_EXPERIENCE_TYPES.ConfigurationService).to(ConfigurationService).inSingletonScope();
  bind(IDE_EXPERIENCE_TYPES.WorkspaceService).to(WorkspaceService).inSingletonScope();
});

// ==================== IDE Experience Facade ====================

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
export class IDEExperience {
  private initialized = false;
  
  constructor(private container: Container) {}
  
  // ==================== Error Handling ====================
  
  get errors(): ErrorHandler {
    return this.container.get(IDE_EXPERIENCE_TYPES.ErrorHandler);
  }
  
  // ==================== UX Services ====================
  
  get toast(): ToastManager {
    return this.container.get(IDE_EXPERIENCE_TYPES.ToastManager);
  }
  
  get progress(): ProgressManager {
    return this.container.get(IDE_EXPERIENCE_TYPES.ProgressManager);
  }
  
  get feedback(): FeedbackSystem {
    return this.container.get(IDE_EXPERIENCE_TYPES.FeedbackSystem);
  }
  
  get keybindings(): KeybindingManager {
    return this.container.get(IDE_EXPERIENCE_TYPES.KeybindingManager);
  }
  
  get onboarding(): OnboardingManager {
    return this.container.get(IDE_EXPERIENCE_TYPES.OnboardingManager);
  }
  
  get a11y(): AccessibilityManager {
    return this.container.get(IDE_EXPERIENCE_TYPES.AccessibilityManager);
  }
  
  get responsive(): ResponsiveManager {
    return this.container.get(IDE_EXPERIENCE_TYPES.ResponsiveManager);
  }
  
  // ==================== IDE Toolkit Services ====================
  
  get documents(): DocumentManager {
    return this.container.get(IDE_EXPERIENCE_TYPES.DocumentManager);
  }
  
  get commands(): CommandRegistry {
    return this.container.get(IDE_EXPERIENCE_TYPES.CommandRegistry);
  }
  
  get quickPick(): QuickPickService {
    return this.container.get(IDE_EXPERIENCE_TYPES.QuickPickService);
  }
  
  get inputBox(): InputBoxService {
    return this.container.get(IDE_EXPERIENCE_TYPES.InputBoxService);
  }
  
  get statusBar(): StatusBarService {
    return this.container.get(IDE_EXPERIENCE_TYPES.StatusBarService);
  }
  
  get panels(): PanelManager {
    return this.container.get(IDE_EXPERIENCE_TYPES.PanelManager);
  }
  
  get treeView(): TreeViewService {
    return this.container.get(IDE_EXPERIENCE_TYPES.TreeViewService);
  }
  
  get diagnostics(): DiagnosticCollection {
    return this.container.get(IDE_EXPERIENCE_TYPES.DiagnosticCollection);
  }
  
  get config(): ConfigurationService {
    return this.container.get(IDE_EXPERIENCE_TYPES.ConfigurationService);
  }
  
  get workspace(): WorkspaceService {
    return this.container.get(IDE_EXPERIENCE_TYPES.WorkspaceService);
  }
  
  // ==================== Convenience Methods ====================
  
  /**
   * Mostrar mensagem de info com toast
   */
  info(message: string, title?: string): string {
    return this.toast.info(message, { title });
  }
  
  /**
   * Mostrar mensagem de sucesso com toast
   */
  success(message: string, title?: string): string {
    return this.toast.success(message, { title });
  }
  
  /**
   * Mostrar mensagem de warning com toast
   */
  warning(message: string, title?: string): string {
    return this.toast.warning(message, { title });
  }
  
  /**
   * Mostrar mensagem de erro com toast
   */
  error(message: string, title?: string): string {
    return this.toast.error(message, { title });
  }
  
  /**
   * Mostrar loading com toast e executar operação
   */
  async withLoading<T>(
    message: string,
    operation: () => Promise<T>,
    options?: {
      successMessage?: string;
      errorMessage?: string;
    }
  ): Promise<T> {
    return this.toast.promise(operation(), {
      loading: message,
      success: options?.successMessage ?? 'Concluído!',
      error: options?.errorMessage ?? 'Erro ao executar operação.',
    });
  }
  
  /**
   * Executar com progress indicator
   */
  async withProgress<T>(
    title: string,
    operation: (report: (value: number, message?: string) => void) => Promise<T>
  ): Promise<T> {
    return this.progress.withProgress(
      { id: `progress-${Date.now()}`, type: 'determinate' as any, title },
      operation
    );
  }
  
  /**
   * Registrar comando
   */
  registerCommand(
    id: string,
    handler: (...args: unknown[]) => unknown,
    options?: { title?: string; keybinding?: string }
  ): { dispose: () => void } {
    const disposable = this.commands.registerCommand(
      { id, title: options?.title ?? id },
      handler
    );
    
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
  async executeCommand<T = unknown>(commandId: string, ...args: unknown[]): Promise<T | undefined> {
    return this.commands.executeCommand<T>(commandId, ...args);
  }
  
  /**
   * Criar item na status bar
   */
  createStatusBarItem(
    text: string,
    options?: {
      alignment?: 'left' | 'right';
      priority?: number;
      tooltip?: string;
      command?: string;
    }
  ) {
    const item = this.statusBar.createItem(
      options?.alignment === 'right' ? 2 : 1,
      options?.priority ?? 0
    );
    item.text = text;
    if (options?.tooltip) item.tooltip = options.tooltip;
    if (options?.command) item.command = options.command;
    item.show();
    return item;
  }
  
  /**
   * Anunciar para screen readers
   */
  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    this.a11y.announce(message, priority);
  }
  
  /**
   * Obter status
   */
  getStatus(): IDEExperienceStatus {
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
  dispose(): void {
    // Dispose all services
    try { this.errors.dispose(); } catch {}
    try { this.toast.dispose(); } catch {}
    try { this.progress.dispose(); } catch {}
    try { this.feedback.dispose(); } catch {}
    try { this.keybindings.dispose(); } catch {}
    try { this.onboarding.dispose(); } catch {}
    try { this.a11y.dispose(); } catch {}
    try { this.responsive.dispose(); } catch {}
    try { this.documents.dispose(); } catch {}
    try { this.commands.dispose(); } catch {}
    try { this.quickPick.dispose(); } catch {}
    try { this.inputBox.dispose(); } catch {}
    try { this.statusBar.dispose(); } catch {}
    try { this.panels.dispose(); } catch {}
    try { this.treeView.dispose(); } catch {}
    try { this.diagnostics.dispose(); } catch {}
    try { this.config.dispose(); } catch {}
    try { this.workspace.dispose(); } catch {}
  }
}

// ==================== Factory Functions ====================

/**
 * Criar container de experiência IDE
 */
export function createIDEExperienceContainer(): Container {
  const container = new Container();
  container.load(IDEExperienceContainerModule as interfaces.ContainerModule);
  return container;
}

/**
 * Inicializar experiência IDE
 */
export async function initializeIDEExperience(
  container: Container,
  config?: IDEExperienceConfig
): Promise<IDEExperience> {
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
export async function quickStartIDEExperience(
  config?: IDEExperienceConfig
): Promise<{ container: Container; experience: IDEExperience }> {
  const container = createIDEExperienceContainer();
  const experience = await initializeIDEExperience(container, config);
  return { container, experience };
}

// ==================== Default Keybindings ====================

/**
 * Keybindings padrão da IDE
 */
export const DEFAULT_KEYBINDINGS: import('../ux/ux-enhancement-system').Keybinding[] = [
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
export const DEFAULT_ONBOARDING_STEPS: import('../ux/ux-enhancement-system').OnboardingStep[] = [
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
export const IDEExperienceModuleInfo = {
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
