import { URI as CodeUri } from '@theia/core/shared/vscode-uri';
import { TimelineItem } from '@theia/timeline/lib/common/timeline-model';
import { ScmCommandArg, TimelineCommandArg, TreeViewItemReference } from '../../../common';
export type ArgumentAdapter = (...args: unknown[]) => unknown[];
export declare class PluginMenuCommandAdapter {
    private readonly scmService;
    private readonly selectionService;
    private readonly resourceContextKey;
    protected readonly argumentAdapters: Map<string, ArgumentAdapter>;
    protected init(): void;
    getArgumentAdapter(contributionPoint: string): ArgumentAdapter;
    protected toCommentArgs(...args: any[]): any[];
    protected toScmArgs(...args: any[]): any[];
    protected toScmArg(arg: any): ScmCommandArg | undefined;
    protected toScmChangeArgs(...args: any[]): any[];
    protected toTimelineArgs(...args: any[]): any[];
    protected toTestMessageArgs(...args: any[]): any[];
    protected toTimelineArg(arg: TimelineItem): TimelineCommandArg;
    protected toTreeArgs(...args: any[]): any[];
    protected getSelectedResources(): [CodeUri | TreeViewItemReference | undefined, CodeUri[] | undefined];
}
//# sourceMappingURL=plugin-menu-command-adapter.d.ts.map