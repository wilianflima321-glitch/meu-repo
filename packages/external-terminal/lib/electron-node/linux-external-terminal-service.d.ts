import { ExternalTerminalService, ExternalTerminalConfiguration } from '../common/external-terminal';
export declare class LinuxExternalTerminalService implements ExternalTerminalService {
    protected DEFAULT_TERMINAL_LINUX_READY: Promise<string>;
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
     * Get the default terminal application on Linux.
     * - The following method uses environment variables to identify the best default possible for each distro.
     *
     * @returns the default application on Linux.
     */
    protected getDefaultTerminalLinux(): Promise<string>;
}
//# sourceMappingURL=linux-external-terminal-service.d.ts.map