import { BrowserAutomation, type BrowserAutomationClient } from '../../common/browser-automation-protocol';
export declare class BrowserAutomationImpl extends BrowserAutomation {
    protected client: BrowserAutomationClient | undefined;
    setClient(client: BrowserAutomationClient): void;
    close(): void;
}
