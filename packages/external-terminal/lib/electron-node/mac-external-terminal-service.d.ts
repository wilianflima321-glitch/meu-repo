import { ExternalTerminalService, ExternalTerminalConfiguration } from '../common/external-terminal';
export declare class MacExternalTerminalService implements ExternalTerminalService {
    protected osxOpener: string;
    protected defaultTerminalApp: string;
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
     * Get the default terminal app on OSX.
     */
    protected getDefaultTerminalOSX(): string;
}
//# sourceMappingURL=mac-external-terminal-service.d.ts.map