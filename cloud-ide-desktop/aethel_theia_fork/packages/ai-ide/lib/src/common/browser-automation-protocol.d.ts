export declare const browserAutomationPath = "/services/ai-ide/browser-automation";
export interface BrowserAutomationClient {
    onDidCloseConnection?(cb: () => void): void;
}
export declare abstract class BrowserAutomation {
    abstract setClient(client: BrowserAutomationClient): void;
    abstract close(): void;
}
