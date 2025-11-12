import { injectable, inject } from '@theia/core/shared/inversify';
import { ApplicationShell, FrontendApplication, FrontendApplicationContribution, WidgetManager } from '@theia/core/lib/browser';
import type { Widget } from '@theia/core/lib/browser/widgets/widget';
import { ProviderConfigurationWidget } from '../ai-configuration/provider-configuration-widget';
import { AIAgentConfigurationWidget } from '../ai-configuration/agent-configuration-widget';
import { AIToolsConfigurationWidget } from '../ai-configuration/tools-configuration-widget';
import { AITokenUsageConfigurationWidget } from '../ai-configuration/token-usage-configuration-widget';
import { AIHistoryView } from '@theia/ai-history/lib/browser/ai-history-widget';
import { ChatViewWidget } from '@theia/ai-chat-ui/lib/browser/chat-view-widget';

/**
 * Shapes the default workbench layout so the IDE boots with a populated surface that
 * mirrors the multi-panel workflows we discussed (configuration panes on the left,
 * chat + inspector center, telemetry/billing on the right/bottom).
 */
@injectable()
export class AiIdeLayoutContribution implements FrontendApplicationContribution {
    protected readonly widgetIcons = new Map<string, string>([
        [ProviderConfigurationWidget.ID, 'codicon codicon-cloud'],
        [AIAgentConfigurationWidget.ID, 'codicon codicon-organization'],
        [AIToolsConfigurationWidget.ID, 'codicon codicon-tools'],
        [AITokenUsageConfigurationWidget.ID, 'codicon codicon-graph-line'],
        [ChatViewWidget.ID, 'codicon codicon-comment-discussion'],
        [AIHistoryView.ID, 'codicon codicon-history']
    ]);

    constructor(
        @inject(ApplicationShell) private readonly shell: ApplicationShell,
        @inject(WidgetManager) private readonly widgetManager: WidgetManager,
    ) {}

    async initializeLayout(_app: FrontendApplication): Promise<void> {
        const layoutPromises = [
            this.openWidget(ProviderConfigurationWidget.ID, 'left', { rank: 10 }),
            this.openWidget(AIAgentConfigurationWidget.ID, 'left', { rank: 20 }),
            this.openWidget(AIToolsConfigurationWidget.ID, 'left', { rank: 30 }),
            this.openWidget(AITokenUsageConfigurationWidget.ID, 'bottom', { rank: 10 }),
            this.openWidget(ChatViewWidget.ID, 'main'),
            this.openWidget(AIHistoryView.ID, 'right', { rank: 10 }),
        ];

        await Promise.all(layoutPromises);

        await this.ensureWidgetVisible(ProviderConfigurationWidget.ID);
        this.shell.leftPanelHandler.expand(ProviderConfigurationWidget.ID);

        await this.ensureWidgetVisible(AIHistoryView.ID);
        this.shell.rightPanelHandler.expand(AIHistoryView.ID);

        await this.ensureWidgetVisible(AITokenUsageConfigurationWidget.ID);

        // Finish on the chat view so the primary interaction surface is selected.
        await this.ensureWidgetVisible(ChatViewWidget.ID);
    }

    private async openWidget(widgetId: string, area: ApplicationShell.Area, options: { rank?: number } = {}): Promise<void> {
        try {
            const widget = await this.widgetManager.getOrCreateWidget(widgetId);
            const iconClass = this.widgetIcons.get(widgetId);
            if (iconClass) {
                widget.title.iconClass = iconClass;
            }
            await this.attachIfNeeded(widget, area, options);
        } catch (error) {
            console.error(`[ai-ide] failed to open widget ${widgetId}`, error);
        }
    }

    private async attachIfNeeded(widget: Widget, area: ApplicationShell.Area, options: { rank?: number }): Promise<void> {
        if (!widget.isAttached) {
            this.shell.addWidget(widget, { area, ...options });
        }
    }

    private async ensureWidgetVisible(widgetId: string): Promise<void> {
        try {
            await this.shell.activateWidget(widgetId);
        } catch (error) {
            console.warn(`[ai-ide] failed to activate widget ${widgetId}`, error);
        }
    }
}
