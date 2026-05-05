/**
 * IDE Integration
 * Integrates all systems (LSP, DAP, AI, Extensions, etc.) with the UI
 */

import { getLSPApiClient } from '../api/lsp-api';
import { getDAPApiClient } from '../api/dap-api';
import { getAIApiClient } from '../api/ai-api';
import { getExtensionHost } from '../extensions/extension-host';
import { getThemeManager } from '../themes/theme-manager';
import { getTaskManager } from '../tasks/task-manager';
import { getTestManager } from '../testing/test-manager';
import { getGitManager } from '../git/git-manager';
import { getTerminalManager } from '../terminal/terminal-manager';
import { getSettingsManager } from '../settings/settings-manager';
import { getKeybindingManager } from '../keybindings/keybinding-manager';

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('integration/ide-integration')

interface LSPRuntimeConfig {
  language: string;
  command: string;
  args: string[];
}

export interface IDEConfig {
  workspaceRoot: string;
  userId: string;
  projectId: string;
  enableAI: boolean;
  enableTelemetry: boolean;
}

export class IDEIntegration {
  private config: IDEConfig;
  private initialized: boolean = false;

  // API Clients
  private lspClient = getLSPApiClient();
  private dapClient = getDAPApiClient();
  private aiClient = getAIApiClient();

  // Managers
  private extensionHost = getExtensionHost();
  private themeManager = getThemeManager();
  private taskManager = getTaskManager();
  private testManager = getTestManager();
  private gitManager = getGitManager();
  private terminalManager = getTerminalManager();
  private settingsManager = getSettingsManager();
  private keybindingManager = getKeybindingManager();

  constructor(config: IDEConfig) {
    this.config = config;
  }

  /**
   * Initialize IDE
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.warn('[IDE Integration] Already initialized');
      return;
    }

    log.info('[IDE Integration] Initializing...');

    try {
      // Initialize in order of dependencies
      await this.initializeSettings();
      await this.initializeTheme();
      await this.initializeKeybindings();
      await this.initializeTerminal();
      await this.initializeGit();
      await this.initializeLSP();
      await this.initializeDAP();
      await this.initializeAI();
      await this.initializeTasks();
      await this.initializeTests();
      await this.initializeExtensions();

      this.initialized = true;
      log.info('[IDE Integration] Initialization complete');
    } catch (error) {
      console.error('[IDE Integration] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize settings
   */
  private async initializeSettings(): Promise<void> {
    log.info('[IDE Integration] Initializing settings...');
    
    // Settings are loaded automatically on construction
    const settings = this.settingsManager.getAllSettings();
    log.info(`[IDE Integration] Loaded ${Object.keys(settings).length} settings`);
  }

  /**
   * Initialize theme
   */
  private async initializeTheme(): Promise<void> {
    log.info('[IDE Integration] Initializing theme...');
    
    // Theme is applied automatically on construction
    const currentTheme = this.themeManager.getCurrentTheme();
    log.info(`[IDE Integration] Applied theme: ${currentTheme.name}`);
  }

  /**
   * Initialize keybindings
   */
  private async initializeKeybindings(): Promise<void> {
    log.info('[IDE Integration] Initializing keybindings...');
    
    // Register global keybindings
    this.keybindingManager.registerKeybinding({
      id: 'ide.save',
      key: 'Ctrl+S',
      command: 'workbench.action.files.save',
      when: 'editorTextFocus',
    });

    this.keybindingManager.registerKeybinding({
      id: 'ide.saveAll',
      key: 'Ctrl+K S',
      command: 'workbench.action.files.saveAll',
    });

    log.info('[IDE Integration] Registered global keybindings');
  }

  /**
   * Initialize terminal
   */
  private async initializeTerminal(): Promise<void> {
    log.info('[IDE Integration] Initializing terminal...');

    try {
      // Create default terminal (backend pode não estar disponível em testes)
      const sessionId = await this.terminalManager.createSession('bash', this.config.workspaceRoot, '/bin/bash');
      log.info(`[IDE Integration] Created default terminal: ${sessionId}`);
    } catch (error) {
      console.warn('[IDE Integration] Terminal not available:', error);
    }
  }

  /**
   * Initialize Git
   */
  private async initializeGit(): Promise<void> {
    log.info('[IDE Integration] Initializing Git...');
    
    try {
      const status = await this.gitManager.getStatus();
      log.info(`[IDE Integration] Git status: ${status.files.length} changes`);
    } catch (error) {
      console.warn('[IDE Integration] Git not available:', error);
    }
  }

  /**
   * Initialize LSP
   */
  private async initializeLSP(): Promise<void> {
    log.info('[IDE Integration] Initializing LSP...');
    
    // Start LSP servers for common languages
    const languages = ['typescript', 'python', 'go'];
    
    for (const language of languages) {
      try {
        const config = this.getLSPConfig(language);
        await this.lspClient.startServer(config);
        await this.lspClient.initialize(language, `file://${this.config.workspaceRoot}`, {
          textDocument: {
            completion: { completionItem: { snippetSupport: true } },
            hover: { contentFormat: ['markdown', 'plaintext'] },
            definition: { linkSupport: true },
          },
        });
        await this.lspClient.initialized(language);
        log.info(`[IDE Integration] Started LSP for ${language}`);
      } catch (error) {
        console.warn(`[IDE Integration] Failed to start LSP for ${language}:`, error);
      }
    }
  }

  /**
   * Initialize DAP
   */
  private async initializeDAP(): Promise<void> {
    log.info('[IDE Integration] Initializing DAP...');
    
    // DAP adapters are started on-demand when debugging
    log.info('[IDE Integration] DAP ready for debugging sessions');
  }

  /**
   * Initialize AI
   */
  private async initializeAI(): Promise<void> {
    log.info('[IDE Integration] Initializing AI...');
    
    if (this.config.enableAI) {
      this.aiClient.setConsent(true);
      
      try {
        const modelInfo = await this.aiClient.getModelInfo();
        log.info(`[IDE Integration] AI model: ${modelInfo.name}`);
      } catch (error) {
        console.warn('[IDE Integration] AI not available:', error);
      }
    } else {
      log.info('[IDE Integration] AI disabled by config');
    }
  }

  /**
   * Initialize tasks
   */
  private async initializeTasks(): Promise<void> {
    log.info('[IDE Integration] Initializing tasks...');

    try {
      // Detect tasks in workspace
      await this.taskManager.detectTasks(this.config.workspaceRoot);
      const tasks = this.taskManager.getTasks();
      log.info(`[IDE Integration] Detected ${tasks.length} tasks`);
    } catch (error) {
      console.warn('[IDE Integration] Tasks not available:', error);
    }
  }

  /**
   * Initialize tests
   */
  private async initializeTests(): Promise<void> {
    log.info('[IDE Integration] Initializing tests...');
    
    // Test discovery happens on-demand
    log.info('[IDE Integration] Test framework ready');
  }

  /**
   * Initialize extensions
   */
  private async initializeExtensions(): Promise<void> {
    log.info('[IDE Integration] Initializing extensions...');

    try {
      // Load and activate extensions
      await this.extensionHost.loadExtensions();
      const extensions = this.extensionHost.getExtensions();
      log.info(`[IDE Integration] Loaded ${extensions.length} extensions`);
    } catch (error) {
      console.warn('[IDE Integration] Extensions not available:', error);
    }
  }

  /**
   * Get LSP config for language
   */
  private getLSPConfig(language: string): LSPRuntimeConfig {
    const configs: Record<string, LSPRuntimeConfig> = {
      typescript: {
        language: 'typescript',
        command: 'typescript-language-server',
        args: ['--stdio'],
      },
      python: {
        language: 'python',
        command: 'pylsp',
        args: [],
      },
      go: {
        language: 'go',
        command: 'gopls',
        args: [],
      },
    };

    return configs[language] || { language, command: '', args: [] };
  }

  /**
   * Shutdown IDE
   */
  async shutdown(): Promise<void> {
    log.info('[IDE Integration] Shutting down...');

    try {
      // Stop LSP servers
      for (const language of this.lspClient.getActiveSessions()) {
        await this.lspClient.stopServer(language);
      }

      // Stop DAP sessions
      for (const session of this.dapClient.getActiveSessions()) {
        await this.dapClient.stopAdapter(session);
      }

      // Dispose terminals
      this.terminalManager.disposeAll();

      // Deactivate extensions
      await this.extensionHost.deactivateAll();

      this.initialized = false;
      log.info('[IDE Integration] Shutdown complete');
    } catch (error) {
      console.error('[IDE Integration] Shutdown failed:', error);
      throw error;
    }
  }

  /**
   * Get initialization status
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get config
   */
  getConfig(): IDEConfig {
    return { ...this.config };
  }

  /**
   * Update config
   */
  updateConfig(updates: Partial<IDEConfig>): void {
    this.config = { ...this.config, ...updates };
    log.info('[IDE Integration] Config updated');
  }
}

// Singleton instance
let ideIntegrationInstance: IDEIntegration | null = null;

export function getIDEIntegration(config?: IDEConfig): IDEIntegration {
  if (!ideIntegrationInstance && config) {
    ideIntegrationInstance = new IDEIntegration(config);
  }
  
  if (!ideIntegrationInstance) {
    throw new Error('IDE Integration not initialized. Provide config on first call.');
  }
  
  return ideIntegrationInstance;
}

export function resetIDEIntegration(): void {
  ideIntegrationInstance = null;
}
