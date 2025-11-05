import { OutputChannel, OutputChannelManager } from '@theia/output/lib/browser/output-channel';
import { OutputContribution } from '@theia/output/lib/browser/output-contribution';
import { LogPart } from '@theia/plugin-ext/lib/common/types';
import { HostedPluginWatcher } from '@theia/plugin-ext/lib/hosted/browser/hosted-plugin-watcher';
export declare class HostedPluginLogViewer {
    static OUTPUT_CHANNEL_NAME: string;
    protected readonly watcher: HostedPluginWatcher;
    protected readonly outputChannelManager: OutputChannelManager;
    protected readonly outputContribution: OutputContribution;
    protected channel: OutputChannel;
    showLogConsole(): void;
    protected init(): void;
    protected logMessageEventHandler(event: LogPart): void;
}
//# sourceMappingURL=hosted-plugin-log-viewer.d.ts.map