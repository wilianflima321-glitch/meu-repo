import { type RpcServer } from '@theia/core';
import { Browser, Page } from 'puppeteer-core';
import type { BrowserAutomation, BrowserAutomationClient, LaunchResult } from '../../common/browser-automation-protocol';
export declare class BrowserAutomationImpl implements RpcServer<BrowserAutomationClient>, BrowserAutomation {
    protected _browser?: Browser;
    protected _page?: Page;
    protected client?: BrowserAutomationClient;
    protected get browser(): Browser;
    protected get page(): Page;
    isRunning(): Promise<boolean>;
    launch(remoteDebuggingPort: number): Promise<LaunchResult | undefined>;
    close(): Promise<void>;
    queryDom(selector?: string): Promise<string>;
    dispose(): void;
    setClient(client: BrowserAutomationClient | undefined): void;
    getClient?(): BrowserAutomationClient | undefined;
}
//# sourceMappingURL=browser-automation-impl.d.ts.map