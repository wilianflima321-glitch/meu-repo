/**
 * VS Code Commands API Implementation
 * Provides command registration and execution
 */

export interface Command {
  command: string;
  title: string;
  tooltip?: string;
  arguments?: any[];
}

type CommandCallback = (...args: any[]) => any;

class CommandsAPI {
  private commands: Map<string, CommandCallback> = new Map();
  private commandHistory: Array<{ command: string; timestamp: number }> = [];

  /**
   * Register a command
   */
  registerCommand(command: string, callback: CommandCallback): { dispose: () => void } {
    if (this.commands.has(command)) {
      console.warn(`[Commands] Command '${command}' is already registered`);
    }

    this.commands.set(command, callback);
    console.log(`[Commands] Registered command: ${command}`);

    return {
      dispose: () => {
        this.commands.delete(command);
        console.log(`[Commands] Unregistered command: ${command}`);
      },
    };
  }

  /**
   * Register a text editor command
   */
  registerTextEditorCommand(
    command: string,
    callback: (textEditor: any, edit: any, ...args: any[]) => void
  ): { dispose: () => void } {
    return this.registerCommand(command, callback);
  }

  /**
   * Execute a command
   */
  async executeCommand<T = any>(command: string, ...args: any[]): Promise<T | undefined> {
    const callback = this.commands.get(command);

    if (!callback) {
      // Try built-in commands
      const result = await this.executeBuiltInCommand(command, ...args);
      if (result !== undefined) {
        this.recordCommandExecution(command);
        return result as T;
      }

      console.warn(`[Commands] Command '${command}' not found`);
      return undefined;
    }

    try {
      const result = await callback(...args);
      this.recordCommandExecution(command);
      return result as T;
    } catch (error) {
      console.error(`[Commands] Error executing command '${command}':`, error);
      throw error;
    }
  }

  /**
   * Get all registered commands
   */
  getCommands(filterInternal: boolean = false): string[] {
    const commands = Array.from(this.commands.keys());
    
    if (filterInternal) {
      return commands.filter(cmd => !cmd.startsWith('_'));
    }

    return commands;
  }

  /**
   * Check if command exists
   */
  hasCommand(command: string): boolean {
    return this.commands.has(command) || this.isBuiltInCommand(command);
  }

  /**
   * Get command history
   */
  getCommandHistory(limit: number = 10): Array<{ command: string; timestamp: number }> {
    return this.commandHistory.slice(-limit);
  }

  /**
   * Clear command history
   */
  clearCommandHistory(): void {
    this.commandHistory = [];
  }

  /**
   * Record command execution
   */
  private recordCommandExecution(command: string): void {
    this.commandHistory.push({
      command,
      timestamp: Date.now(),
    });

    // Keep only last 100 commands
    if (this.commandHistory.length > 100) {
      this.commandHistory.shift();
    }
  }

  /**
   * Check if command is built-in
   */
  private isBuiltInCommand(command: string): boolean {
    const builtInCommands = [
      'workbench.action.files.save',
      'workbench.action.files.saveAll',
      'workbench.action.closeActiveEditor',
      'workbench.action.closeAllEditors',
      'workbench.action.revertAndCloseActiveEditor',
      'workbench.action.files.newUntitledFile',
      'workbench.action.files.openFile',
      'workbench.action.files.openFolder',
      'workbench.action.quickOpen',
      'workbench.action.showCommands',
      'workbench.action.gotoLine',
      'workbench.action.gotoSymbol',
      'workbench.action.showAllSymbols',
      'editor.action.formatDocument',
      'editor.action.formatSelection',
      'editor.action.organizeImports',
      'editor.action.quickFix',
      'editor.action.rename',
      'editor.action.goToDeclaration',
      'editor.action.goToDefinition',
      'editor.action.goToTypeDefinition',
      'editor.action.goToImplementation',
      'editor.action.goToReferences',
      'editor.action.findReferences',
      'editor.action.triggerSuggest',
      'editor.action.triggerParameterHints',
      'editor.action.commentLine',
      'editor.action.blockComment',
      'editor.action.addCommentLine',
      'editor.action.removeCommentLine',
      'editor.action.indentLines',
      'editor.action.outdentLines',
      'editor.action.selectAll',
      'editor.action.copyLinesUpAction',
      'editor.action.copyLinesDownAction',
      'editor.action.moveLinesUpAction',
      'editor.action.moveLinesDownAction',
      'editor.action.deleteLines',
      'editor.action.insertLineAfter',
      'editor.action.insertLineBefore',
      'editor.fold',
      'editor.unfold',
      'editor.foldAll',
      'editor.unfoldAll',
      'editor.foldRecursively',
      'editor.unfoldRecursively',
      'workbench.action.terminal.new',
      'workbench.action.terminal.kill',
      'workbench.action.terminal.clear',
      'workbench.action.terminal.focus',
      'workbench.action.terminal.focusNext',
      'workbench.action.terminal.focusPrevious',
      'workbench.action.debug.start',
      'workbench.action.debug.stop',
      'workbench.action.debug.restart',
      'workbench.action.debug.continue',
      'workbench.action.debug.pause',
      'workbench.action.debug.stepOver',
      'workbench.action.debug.stepInto',
      'workbench.action.debug.stepOut',
      'workbench.action.tasks.runTask',
      'workbench.action.tasks.build',
      'workbench.action.tasks.test',
      'git.commit',
      'git.push',
      'git.pull',
      'git.sync',
      'git.checkout',
      'git.branch',
      'git.merge',
      'git.rebase',
      'git.stash',
      'git.stashPop',
    ];

    return builtInCommands.includes(command);
  }

  /**
   * Execute built-in command
   */
  private async executeBuiltInCommand(command: string, ...args: any[]): Promise<any> {
    // Mock implementation for built-in commands
    console.log(`[Commands] Executing built-in command: ${command}`, args);

    switch (command) {
      case 'workbench.action.files.save':
        return { success: true, message: 'File saved' };
      
      case 'workbench.action.files.saveAll':
        return { success: true, message: 'All files saved' };
      
      case 'workbench.action.quickOpen':
        return { success: true, message: 'Quick open triggered' };
      
      case 'workbench.action.showCommands':
        return { success: true, message: 'Command palette opened' };
      
      case 'editor.action.formatDocument':
        return { success: true, message: 'Document formatted' };
      
      case 'editor.action.organizeImports':
        return { success: true, message: 'Imports organized' };
      
      default:
        return undefined;
    }
  }
}

// Singleton instance
let commandsInstance: CommandsAPI | null = null;

export function getCommandsAPI(): CommandsAPI {
  if (!commandsInstance) {
    commandsInstance = new CommandsAPI();
  }
  return commandsInstance;
}

export const commands = getCommandsAPI();
