export declare const ExternalTerminalService: unique symbol;
export declare const externalTerminalServicePath = "/services/external-terminal";
/**
 * Represents the external terminal configuration options.
 */
export interface ExternalTerminalConfiguration {
    /**
     * The external terminal executable for Windows.
     */
    'terminal.external.windowsExec': string;
    /**
     * The external terminal executable for OSX.
     */
    'terminal.external.osxExec': string;
    /**
     * The external terminal executable for Linux.
     */
    'terminal.external.linuxExec': string;
}
export interface ExternalTerminalService {
    /**
     * Open a native terminal in the designated working directory.
     *
     * @param configuration the configuration for opening external terminals.
     * @param cwd the string URI of the current working directory where the terminal should open from.
     */
    openTerminal(configuration: ExternalTerminalConfiguration, cwd: string): Promise<void>;
    /**
     * Get the default executable.
     *
     * @returns the default terminal executable.
     */
    getDefaultExec(): Promise<string>;
}
//# sourceMappingURL=external-terminal.d.ts.map