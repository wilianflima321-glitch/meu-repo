/**
 * Result of a window blink attempt
 */
export interface WindowBlinkResult {
    /** Whether the window blink was successful */
    success: boolean;
    /** Error message if the blink failed */
    error?: string;
}
/**
 * Service for blinking/flashing the application window to get user attention.
 */
export declare class WindowBlinkService {
    private isElectron;
    constructor();
    /**
     * Blink/flash the window to get user attention.
     * The implementation varies depending on the platform and environment.
     *
     * @param agentName Optional name of the agent to include in the blink notification
     */
    blinkWindow(agentName?: string): Promise<WindowBlinkResult>;
    private blinkElectronWindow;
    private blinkBrowserWindow;
    private blinkDocumentTitle;
    private blinkWithVisibilityAPI;
    private focusWindow;
    /**
     * Check if window blinking is supported in the current environment.
     */
    isBlinkSupported(): boolean;
    /**
     * Get information about the blinking capabilities.
     */
    getBlinkCapabilities(): {
        supported: boolean;
        method: 'electron' | 'browser' | 'none';
        features: string[];
    };
}
//# sourceMappingURL=window-blink-service.d.ts.map