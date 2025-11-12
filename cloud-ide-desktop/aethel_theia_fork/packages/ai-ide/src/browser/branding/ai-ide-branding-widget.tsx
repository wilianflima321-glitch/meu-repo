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
        this.quickActions = [
            {
                id: 'providers',
                label: 'Provedores',
                description: 'Configurar provedores LLM e credenciais',
                codicon: 'cloud',
                widgetId: ProviderConfigurationWidget.ID,
                area: 'left'
            },
            {
                id: 'agents',
                label: 'Agentes',
                description: 'Gerenciar agentes orquestradores',
                codicon: 'organization',
                widgetId: AIAgentConfigurationWidget.ID,
                area: 'left'
            },
            {
                id: 'tools',
                label: 'Ferramentas',
                description: 'Habilitar e revisar ferramentas disponíveis',
                codicon: 'tools',
                widgetId: AIToolsConfigurationWidget.ID,
                area: 'left'
            },
            {
                id: 'usage',
                label: 'Uso de Tokens',
                description: 'Monitorar consumo e billing',
                codicon: 'graph-line',
                widgetId: AITokenUsageConfigurationWidget.ID,
                area: 'bottom'
            },
            {
                id: 'chat',
                label: 'Chat',
                description: 'Voltar para a conversa ativa',
                codicon: 'comment-discussion',
                widgetId: ChatViewWidget.ID,
                area: 'main'
            },
            {
                id: 'history',
                label: 'Histórico',
                description: 'Explorar execuções e auditoria',
                codicon: 'history',
                widgetId: AIHistoryView.ID,
                area: 'right'
            },
        ];
    }

    protected render(): React.ReactNode {
        return (
            <div className='ai-ide-branding-bar'>
                <div className='ai-ide-branding-identity'>
                    <div className='ai-ide-logo-mark' aria-hidden='true'>
                        <svg width='32' height='32' viewBox='0 0 32 32' role='img'>
                            <defs>
                                <linearGradient id='ai-ide-logo-gradient' x1='0%' y1='0%' x2='100%' y2='100%'>
                                    <stop offset='0%' stopColor='#6366f1'/>
                                    <stop offset='100%' stopColor='#22d3ee'/>
                                </linearGradient>
                            </defs>
                            <rect x='2' y='2' width='28' height='28' rx='8' fill='url(#ai-ide-logo-gradient)'/>
                            <path d='M11.5 22L16 10l4.5 12h-2.6l-.9-2.4h-3.6l-.9 2.4h-2.6Zm4.5-4.4L14.8 14l-1.2 3.6h2.4Z' fill='#0f172a'/>
                        </svg>
                    </div>
                    <div className='ai-ide-branding-text'>
                        <span className='ai-ide-branding-name'>Aethel IDE</span>
                        <span className='ai-ide-branding-tagline'>Orquestre provedores, agentes e ferramentas de IA com confiança</span>
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
