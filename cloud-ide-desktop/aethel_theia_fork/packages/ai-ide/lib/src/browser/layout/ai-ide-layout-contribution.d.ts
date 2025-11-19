import { ApplicationShell, FrontendApplication, FrontendApplicationContribution, WidgetManager } from '@theia/core/lib/browser';
/**
 * Shapes the default workbench layout so the IDE boots with a populated surface that
 * mirrors the multi-panel workflows we discussed (configuration panes on the left,
 * chat + inspector center, telemetry/billing on the right/bottom).
 */
export declare class AiIdeLayoutContribution implements FrontendApplicationContribution {
    private readonly shell;
    private readonly widgetManager;
    protected readonly widgetIcons: Map<string, string>;
    constructor(shell: ApplicationShell, widgetManager: WidgetManager);
    initializeLayout(_app: FrontendApplication): Promise<void>;
    private openWidget;
    private attachIfNeeded;
    private ensureWidgetVisible;
}
