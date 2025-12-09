import { injectable } from 'inversify';
import { nls } from '../../common/nls';
import { getShortcutKeys } from './shortcuts-reference';

export interface TooltipConfig {
    title: string;
    description: string;
    shortcut?: string;
}

@injectable()
export class TooltipService {
    private tooltips = new Map<string, TooltipConfig>();
    private activeTooltip: HTMLElement | null = null;

    constructor() {
        this.initializeTooltips();
    }

    private initializeTooltips(): void {
        // Executor tooltips
        this.register('executor-status', {
            title: 'Workspace Executor',
            description: nls('tooltips.executor'),
            shortcut: getShortcutKeys('executor.showLogs')
        });

        this.register('executor-execute', {
            title: 'Execute Command',
            description: 'Run commands in the workspace with streaming output and error handling',
            shortcut: getShortcutKeys('executor.execute')
        });

        this.register('executor-metrics', {
            title: 'Export Metrics',
            description: 'Export executor performance metrics in Prometheus format',
            shortcut: getShortcutKeys('executor.exportMetrics')
        });

        // Preview tooltips
        this.register('preview-toggle', {
            title: 'Live Preview',
            description: nls('tooltips.preview'),
            shortcut: getShortcutKeys('ai.preview.toggle')
        });

        // Voice tooltips
        this.register('voice-toggle', {
            title: 'Voice Input',
            description: nls('tooltips.voice'),
            shortcut: getShortcutKeys('ai.voice.toggle')
        });

        // AI Button tooltip
        this.register('ai-button', {
            title: 'AI Assistant',
            description: nls('tooltips.aiButton'),
            shortcut: getShortcutKeys('ai.panel.toggle')
        });

        // Settings tooltip
        this.register('ai-settings', {
            title: 'AI Settings',
            description: nls('tooltips.settings'),
            shortcut: getShortcutKeys('ai.config.open')
        });

        // Health tooltip
        this.register('ai-health', {
            title: 'AI Health',
            description: nls('tooltips.health'),
            shortcut: getShortcutKeys('ai.health.open')
        });
    }

    register(id: string, config: TooltipConfig): void {
        this.tooltips.set(id, config);
    }

    show(id: string, targetElement: HTMLElement): void {
        const config = this.tooltips.get(id);
        if (!config) return;

        this.hide();

        const tooltip = document.createElement('div');
        tooltip.className = 'ai-ide-tooltip';
        tooltip.innerHTML = `
            <div class="ai-ide-tooltip-title">
                ${config.title}
                ${config.shortcut ? `<span class="ai-ide-tooltip-shortcut">${config.shortcut}</span>` : ''}
            </div>
            <div>${config.description}</div>
        `;

        document.body.appendChild(tooltip);
        this.activeTooltip = tooltip;

        // Position tooltip
        const rect = targetElement.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        let top = rect.bottom + 8;
        let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);

        // Adjust if tooltip goes off screen
        if (left + tooltipRect.width > window.innerWidth) {
            left = window.innerWidth - tooltipRect.width - 8;
        }
        if (left < 8) {
            left = 8;
        }
        if (top + tooltipRect.height > window.innerHeight) {
            top = rect.top - tooltipRect.height - 8;
        }

        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
    }

    hide(): void {
        if (this.activeTooltip) {
            this.activeTooltip.remove();
            this.activeTooltip = null;
        }
    }

    attachToElement(id: string, element: HTMLElement): void {
        element.addEventListener('mouseenter', () => this.show(id, element));
        element.addEventListener('mouseleave', () => this.hide());
        element.addEventListener('click', () => this.hide());
    }
}
