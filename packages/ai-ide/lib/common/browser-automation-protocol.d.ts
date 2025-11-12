export declare const browserAutomationPath = "/services/automation/browser";
export declare const BrowserAutomation: unique symbol;
export interface BrowserAutomation {
    launch(remoteDebuggingPort: number): Promise<LaunchResult | undefined>;
    isRunning(): Promise<boolean>;
    queryDom(selector?: string): Promise<string>;
    close(): Promise<void>;
}
export interface LaunchResult {
    remoteDebuggingPort: number;
}
export declare const BrowserAutomationClient: unique symbol;
export interface BrowserAutomationClient {
}
//# sourceMappingURL=browser-automation-protocol.d.ts.map