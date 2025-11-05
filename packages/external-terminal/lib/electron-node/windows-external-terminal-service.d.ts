import { ExternalTerminalService, ExternalTerminalConfiguration } from '../common/external-terminal';
export declare class WindowsExternalTerminalService implements ExternalTerminalService {
    protected readonly CMD = "cmd.exe";
    protected DEFAULT_TERMINAL_WINDOWS: string;
    openTerminal(configuration: ExternalTerminalConfiguration, cwd: string): Promise<void>;
    getDefaultExec(): Promise<string>;
    /**
     * Spawn the external terminal for the given options.
     * - The method spawns the terminal application based on the preferences, else uses the default value.
     * @param configuration the preference configuration.
     * @param cwd the optional current working directory to spawn from.
     */
    protected spawnTerminal(configuration: ExternalTerminalConfiguration, cwd?: string): Promise<void>;
    /**
     * Get the default terminal application on Windows.
     * - The following method uses environment variables to identify the best default possible value.
     *
     * @returns the default application on Windows.
     */
    protected getDefaultTerminalWindows(): string;
    /**
     * Find the Windows Shell process to start up (defaults to cmd.exe).
     */
    protected getWindowsShell(): string;
}
//# sourceMappingURL=windows-external-terminal-service.d.ts.map