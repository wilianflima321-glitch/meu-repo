import { Command, CommandContribution, CommandRegistry } from '@theia/core/lib/common';
import { EnvVariablesServer } from '@theia/core/lib/common/env-variables';
import { KeybindingContribution, KeybindingRegistry, LabelProvider } from '@theia/core/lib/browser';
import { EditorManager } from '@theia/editor/lib/browser/editor-manager';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { ExternalTerminalService } from '../common/external-terminal';
import { ExternalTerminalPreferenceService } from './external-terminal-preference';
import { QuickPickService } from '@theia/core/lib/common/quick-pick-service';
export declare namespace ExternalTerminalCommands {
    const OPEN_NATIVE_CONSOLE: Command;
}
export declare class ExternalTerminalFrontendContribution implements CommandContribution, KeybindingContribution {
    protected readonly editorManager: EditorManager;
    protected readonly envVariablesServer: EnvVariablesServer;
    protected readonly labelProvider: LabelProvider;
    protected readonly quickPickService: QuickPickService;
    protected readonly externalTerminalService: ExternalTerminalService;
    protected readonly externalTerminalPreferences: ExternalTerminalPreferenceService;
    protected readonly workspaceService: WorkspaceService;
    registerCommands(commands: CommandRegistry): void;
    registerKeybindings(keybindings: KeybindingRegistry): void;
    /**
     * Open a native console on the host machine.
     *
     * - If multi-root workspace is open, displays a quick pick to let users choose which workspace to spawn the terminal.
     * - If only one workspace is open, the terminal spawns at the root of the current workspace.
     * - If no workspace is open and there is an active editor, the terminal spawns at the parent folder of that file.
     * - If no workspace is open and there are no active editors, the terminal spawns at user home directory.
     */
    protected openExternalTerminal(): Promise<void>;
    /**
     * Display a quick pick for user to choose a target workspace in opened workspaces.
     */
    protected selectCwd(): Promise<string | undefined>;
}
//# sourceMappingURL=external-terminal-contribution.d.ts.map