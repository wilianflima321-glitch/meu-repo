import { BaseWidget, DockPanel, WidgetManager } from '@theia/core/lib/browser';
import { TheiaDockPanel } from '@theia/core/lib/browser/shell/theia-dock-panel';
import { AIAgentConfigurationWidget } from './agent-configuration-widget';
import { AIVariableConfigurationWidget } from './variable-configuration-widget';
import { AIToolsConfigurationWidget } from './tools-configuration-widget';
import { AIConfigurationSelectionService } from './ai-configuration-service';
import { AIMCPConfigurationWidget } from './mcp-configuration-widget';
import { AITokenUsageConfigurationWidget } from './token-usage-configuration-widget';
import { AIPromptFragmentsConfigurationWidget } from './prompt-fragments-configuration-widget';
import { ModelAliasesConfigurationWidget } from './model-aliases-configuration-widget';
export declare class AIConfigurationContainerWidget extends BaseWidget {
    static readonly ID = "ai-configuration";
    static readonly LABEL: any;
    protected dockpanel: DockPanel;
    protected readonly dockPanelFactory: TheiaDockPanel.Factory;
    protected readonly widgetManager: WidgetManager;
    protected readonly aiConfigurationSelectionService: AIConfigurationSelectionService;
    protected agentsWidget: AIAgentConfigurationWidget;
    protected variablesWidget: AIVariableConfigurationWidget;
    protected mcpWidget: AIMCPConfigurationWidget;
    protected tokenUsageWidget: AITokenUsageConfigurationWidget;
    protected promptFragmentsWidget: AIPromptFragmentsConfigurationWidget;
    protected toolsWidget: AIToolsConfigurationWidget;
    protected modelAliasesWidget: ModelAliasesConfigurationWidget;
    protected init(): void;
    protected initUI(): Promise<void>;
    protected initListeners(): void;
}
//# sourceMappingURL=ai-configuration-widget.d.ts.map