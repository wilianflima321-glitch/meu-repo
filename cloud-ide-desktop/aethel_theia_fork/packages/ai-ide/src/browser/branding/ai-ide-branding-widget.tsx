import * as React from '@theia/core/shared/react';
import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
import { ApplicationShell, WidgetManager } from '@theia/core/lib/browser';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { AIConfigurationSelectionService } from '../ai-configuration/ai-configuration-service';
import { ProviderConfigurationWidget } from '../ai-configuration/provider-configuration-widget';
import { AIAgentConfigurationWidget } from '../ai-configuration/agent-configuration-widget';
import { AIToolsConfigurationWidget } from '../ai-configuration/tools-configuration-widget';
import { AITokenUsageConfigurationWidget } from '../ai-configuration/token-usage-configuration-widget';
import { ChatViewWidget } from '@theia/ai-chat-ui/lib/browser/chat-view-widget';
import { AIHistoryView } from '@theia/ai-history/lib/browser/ai-history-widget';
import { getBrandingCopy } from './branding-copy';

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

@injectable()
export class AiIdeBrandingWidget extends ReactWidget {
    static readonly ID = 'ai-ide-branding-widget';

    protected quickActions: QuickActionConfig[] = [];

    constructor(
        @inject(ApplicationShell) private readonly shell: ApplicationShell,
        @inject(WidgetManager) private readonly widgetManager: WidgetManager,
        @inject(AIConfigurationSelectionService) private readonly configurationSelection: AIConfigurationSelectionService,
    ) {
        super();
        this.id = AiIdeBrandingWidget.ID;
        this.addClass('ai-ide-branding-widget');
        this.node.setAttribute('role', 'banner');
    }

    @postConstruct()
    protected init(): void {
        this.quickActions = this.createQuickActions();
    }

    protected createQuickActions(): QuickActionConfig[] {
        const copy = getBrandingCopy();
        return [
            {
                id: 'providers',
                label: copy.quickActions.providers.label,
                description: copy.quickActions.providers.description,
                codicon: 'cloud',
                widgetId: ProviderConfigurationWidget.ID,
                area: 'left'
            },
            {
                id: 'agents',
                label: copy.quickActions.agents.label,
                description: copy.quickActions.agents.description,
                codicon: 'organization',
                widgetId: AIAgentConfigurationWidget.ID,
                area: 'left'
            },
            {
                id: 'tools',
                label: copy.quickActions.tools.label,
                description: copy.quickActions.tools.description,
                codicon: 'tools',
                widgetId: AIToolsConfigurationWidget.ID,
                area: 'left'
            },
            {
                id: 'usage',
                label: copy.quickActions.usage.label,
                description: copy.quickActions.usage.description,
                codicon: 'graph-line',
                widgetId: AITokenUsageConfigurationWidget.ID,
                area: 'bottom'
            },
            {
                id: 'chat',
                label: copy.quickActions.chat.label,
                description: copy.quickActions.chat.description,
                codicon: 'comment-discussion',
                widgetId: ChatViewWidget.ID,
                area: 'main'
            },
            {
                id: 'history',
                label: copy.quickActions.history.label,
                description: copy.quickActions.history.description,
                codicon: 'history',
                widgetId: AIHistoryView.ID,
                area: 'right'
            },
        ];
    }

    protected render(): React.ReactNode {
        const copy = getBrandingCopy();
        return (
            <div className='ai-ide-branding-bar'>
                <div className='ai-ide-branding-identity'>
                    <div className='ai-ide-logo-mark'>
                        <svg width='32' height='32' viewBox='0 0 64 64' role='img' aria-label={copy.logoAriaLabel}>
                            <title>{copy.logoTitle}</title>
                            <defs>
                                <linearGradient id='ai-ide-logo-gradient' x1='0%' y1='0%' x2='100%' y2='100%'>
                                    <stop offset='0%' stopColor='#6366f1'/>
                                    <stop offset='100%' stopColor='#ec4899'/>
                                </linearGradient>
                            </defs>
                            <rect width='64' height='64' rx='14' fill='url(#ai-ide-logo-gradient)'/>
                            <path d='M18 42l14-22 14 22' stroke='#ffffff' strokeWidth='4' strokeLinecap='round' strokeLinejoin='round'/>
                            <circle cx='32' cy='42' r='3' fill='#ffffff'/>
                        </svg>
                    </div>
                    <div className='ai-ide-branding-text'>
                        <span className='ai-ide-branding-name'>{copy.name}</span>
                        <span className='ai-ide-branding-tagline'>{copy.tagline}</span>
                    </div>
                </div>
                <div className='ai-ide-branding-actions'>
                    {this.quickActions.map(action => this.renderAction(action))}
                </div>
            </div>
        );
    }

    protected renderAction(action: QuickActionConfig): React.ReactNode {
        const codiconClass = `codicon codicon-${action.codicon}`;
        return (
            <button
                key={action.id}
                className='ai-ide-branding-action'
                title={action.description}
                onClick={() => this.handleAction(action)}
            >
                <span className={codiconClass} aria-hidden='true'/>
                <span>{action.label}</span>
            </button>
        );
    }

    protected async handleAction(action: QuickActionConfig): Promise<void> {
        await this.openWidget(action.widgetId, action.area);
        if (action.widgetId === ProviderConfigurationWidget.ID) {
            this.configurationSelection.selectConfigurationTab(ProviderConfigurationWidget.ID);
        }
        if (typeof action.onAfterOpen === 'function') {
            try {
                action.onAfterOpen();
            } catch (error) {
                console.warn('[ai-ide] quick action callback failure', error);
            }
        }
    }

    protected async openWidget(widgetId: string, area: ShellArea): Promise<void> {
        try {
            const widget = await this.widgetManager.getOrCreateWidget(widgetId);
            if (!widget.isAttached) {
                this.shell.addWidget(widget, { area });
            }
            await this.shell.activateWidget(widgetId);
        } catch (error) {
            console.error(`[ai-ide] failed to open widget ${widgetId} from branding bar`, error);
        }
    }
}
