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

    console.log('[IDE Integration] Initializing...');

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
      console.log('[IDE Integration] ✅ Initialization complete');
    } catch (error) {
      console.error('[IDE Integration] ❌ Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize settings
   */
  private async initializeSettings(): Promise<void> {
    console.log('[IDE Integration] Initializing settings...');
    
    // Settings are loaded automatically on construction
    const settings = this.settingsManager.getAllSettings();
    console.log(`[IDE Integration] Loaded ${Object.keys(settings).length} settings`);
  }

  /**
   * Initialize theme
   */
  private async initializeTheme(): Promise<void> {
    console.log('[IDE Integration] Initializing theme...');
    
    // Theme is applied automatically on construction
    const currentTheme = this.themeManager.getCurrentTheme();
    console.log(`[IDE Integration] Applied theme: ${currentTheme.name}`);
  }

  /**
   * Initialize keybindings
   */
  private async initializeKeybindings(): Promise<void> {
    console.log('[IDE Integration] Initializing keybindings...');
    
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

    console.log('[IDE Integration] Registered global keybindings');
  }

  /**
   * Initialize terminal
   */
  private async initializeTerminal(): Promise<void> {
    console.log('[IDE Integration] Initializing terminal...');
    
    // Create default terminal
    const terminal = this.terminalManager.createTerminal({
      name: 'bash',
      shellPath: '/bin/bash',
    });

    console.log(`[IDE Integration] Created default terminal: ${terminal.id}`);
  }

  /**
   * Initialize Git
   */
  private async initializeGit(): Promise<void> {
    console.log('[IDE Integration] Initializing Git...');
    
    try {
      const status = await this.gitManager.getStatus();
      console.log(`[IDE Integration] Git status: ${status.files.length} changes`);
    } catch (error) {
      console.warn('[IDE Integration] Git not available:', error);
    }
  }

  /**
   * Initialize LSP
   */
  private async initializeLSP(): Promise<void> {
    console.log('[IDE Integration] Initializing LSP...');
    
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
        console.log(`[IDE Integration] Started LSP for ${language}`);
      } catch (error) {
        console.warn(`[IDE Integration] Failed to start LSP for ${language}:`, error);
      }
    }
  }

  /**
   * Initialize DAP
   */
  private async initializeDAP(): Promise<void> {
    console.log('[IDE Integration] Initializing DAP...');
    
    // DAP adapters are started on-demand when debugging
    console.log('[IDE Integration] DAP ready for debugging sessions');
  }

  /**
   * Initialize AI
   */
  private async initializeAI(): Promise<void> {
    console.log('[IDE Integration] Initializing AI...');
    
    if (this.config.enableAI) {
      this.aiClient.setConsent(true);
      
      try {
        const modelInfo = await this.aiClient.getModelInfo();
        console.log(`[IDE Integration] AI model: ${modelInfo.name}`);
      } catch (error) {
        console.warn('[IDE Integration] AI not available:', error);
      }
    } else {
      console.log('[IDE Integration] AI disabled by config');
    }
  }

  /**
   * Initialize tasks
   */
  private async initializeTasks(): Promise<void> {
    console.log('[IDE Integration] Initializing tasks...');
    
    // Detect tasks in workspace
    await this.taskManager.detectTasks(this.config.workspaceRoot);
    const tasks = this.taskManager.getTasks();
    console.log(`[IDE Integration] Detected ${tasks.length} tasks`);
  }

  /**
   * Initialize tests
   */
  private async initializeTests(): Promise<void> {
    console.log('[IDE Integration] Initializing tests...');
    
    // Test discovery happens on-demand
    console.log('[IDE Integration] Test framework ready');
  }

  /**
   * Initialize extensions
   */
  private async initializeExtensions(): Promise<void> {
    console.log('[IDE Integration] Initializing extensions...');
    
    // Load and activate extensions
    await this.extensionHost.loadExtensions();
    const extensions = this.extensionHost.getExtensions();
    console.log(`[IDE Integration] Loaded ${extensions.length} extensions`);
  }

  /**
   * Get LSP config for language
   */
  private getLSPConfig(language: string): any {
    const configs: Record<string, any> = {
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
    console.log('[IDE Integration] Shutting down...');

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
      console.log('[IDE Integration] ✅ Shutdown complete');
    } catch (error) {
      console.error('[IDE Integration] ❌ Shutdown failed:', error);
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
    console.log('[IDE Integration] Config updated');
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
