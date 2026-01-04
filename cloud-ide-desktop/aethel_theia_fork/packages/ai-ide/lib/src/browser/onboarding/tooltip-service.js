"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TooltipService = void 0;
const inversify_1 = require("inversify");
const nls_1 = require("../../common/nls");
const shortcuts_reference_1 = require("./shortcuts-reference");
let TooltipService = class TooltipService {
    constructor() {
        this.tooltips = new Map();
        this.activeTooltip = null;
        this.initializeTooltips();
    }
    initializeTooltips() {
        // Executor tooltips
        this.register('executor-status', {
            title: 'Workspace Executor',
            description: (0, nls_1.nls)('tooltips.executor'),
            shortcut: (0, shortcuts_reference_1.getShortcutKeys)('executor.showLogs')
        });
        this.register('executor-execute', {
            title: 'Execute Command',
            description: 'Run commands in the workspace with streaming output and error handling',
            shortcut: (0, shortcuts_reference_1.getShortcutKeys)('executor.execute')
        });
        this.register('executor-metrics', {
            title: 'Export Metrics',
            description: 'Export executor performance metrics in Prometheus format',
            shortcut: (0, shortcuts_reference_1.getShortcutKeys)('executor.exportMetrics')
        });
        // Preview tooltips
        this.register('preview-toggle', {
            title: 'Live Preview',
            description: (0, nls_1.nls)('tooltips.preview'),
            shortcut: (0, shortcuts_reference_1.getShortcutKeys)('ai.preview.toggle')
        });
        // Voice tooltips
        this.register('voice-toggle', {
            title: 'Voice Input',
            description: (0, nls_1.nls)('tooltips.voice'),
            shortcut: (0, shortcuts_reference_1.getShortcutKeys)('ai.voice.toggle')
        });
        // AI Button tooltip
        this.register('ai-button', {
            title: 'AI Assistant',
            description: (0, nls_1.nls)('tooltips.aiButton'),
            shortcut: (0, shortcuts_reference_1.getShortcutKeys)('ai.panel.toggle')
        });
        // Settings tooltip
        this.register('ai-settings', {
            title: 'AI Settings',
            description: (0, nls_1.nls)('tooltips.settings'),
            shortcut: (0, shortcuts_reference_1.getShortcutKeys)('ai.config.open')
        });
        // Health tooltip
        this.register('ai-health', {
            title: 'AI Health',
            description: (0, nls_1.nls)('tooltips.health'),
            shortcut: (0, shortcuts_reference_1.getShortcutKeys)('ai.health.open')
        });
    }
    register(id, config) {
        this.tooltips.set(id, config);
    }
    show(id, targetElement) {
        const config = this.tooltips.get(id);
        if (!config)
            return;
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
    hide() {
        if (this.activeTooltip) {
            this.activeTooltip.remove();
            this.activeTooltip = null;
        }
    }
    attachToElement(id, element) {
        element.addEventListener('mouseenter', () => this.show(id, element));
        element.addEventListener('mouseleave', () => this.hide());
        element.addEventListener('click', () => this.hide());
    }
};
exports.TooltipService = TooltipService;
exports.TooltipService = TooltipService = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], TooltipService);
