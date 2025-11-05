import { CommandContribution, CommandRegistry } from '@theia/core';
import { LlmProviderService } from './llm-provider-service';
import { WidgetManager } from '@theia/core/lib/browser';
export declare class LlmProviderCommandContribution implements CommandContribution {
    protected readonly llmService: LlmProviderService;
    protected readonly widgetManager: WidgetManager;
    registerCommands(reg: CommandRegistry): void;
}
//# sourceMappingURL=llm-provider-command-contribution.d.ts.map