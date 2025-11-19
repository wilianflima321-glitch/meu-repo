import { CommandRegistry } from '@theia/core';
import { TabBarToolbarContribution, TabBarToolbarRegistry } from '@theia/core/lib/browser/shell/tab-bar-toolbar';
import { AIViewContribution } from '@theia/ai-core/lib/browser';
import { FrontendApplication } from '@theia/core/lib/browser';
import { AIConfigurationContainerWidget } from './ai-configuration-widget';
export declare const AI_CONFIGURATION_TOGGLE_COMMAND_ID = "aiConfiguration:toggle";
export declare const OPEN_AI_CONFIG_VIEW: any;
export declare class AIAgentConfigurationViewContribution extends AIViewContribution<AIConfigurationContainerWidget> implements TabBarToolbarContribution {
    constructor();
    initializeLayout(_app: FrontendApplication): Promise<void>;
    registerCommands(commands: CommandRegistry): void;
    registerToolbarItems(registry: TabBarToolbarRegistry): void;
}
//# sourceMappingURL=ai-configuration-view-contribution.d.ts.map