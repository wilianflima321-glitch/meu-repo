import * as React from '@theia/core/shared/react';
import { ApplicationShell, WidgetManager } from '@theia/core/lib/browser';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { AIConfigurationSelectionService } from '../ai-configuration/ai-configuration-service';
type ShellArea = 'main' | 'left' | 'right' | 'bottom' | 'top';
interface QuickActionConfig {
    id: string;
    label: string;
    description: string;
    codicon: string;
    widgetId: string;
    area: ShellArea;
    onAfterOpen?: () => void;
}
export declare class AiIdeBrandingWidget extends ReactWidget {
    private readonly shell;
    private readonly widgetManager;
    private readonly configurationSelection;
    static readonly ID = "ai-ide-branding-widget";
    protected quickActions: QuickActionConfig[];
    constructor(shell: ApplicationShell, widgetManager: WidgetManager, configurationSelection: AIConfigurationSelectionService);
    protected init(): void;
    protected createQuickActions(): QuickActionConfig[];
    protected render(): React.ReactNode;
    protected renderAction(action: QuickActionConfig): React.ReactNode;
    protected handleAction(action: QuickActionConfig): Promise<void>;
    protected openWidget(widgetId: string, area: ShellArea): Promise<void>;
}
export {};
