/**
 * Tooltip System - Sistema de Tooltips Avançado
 *
 * Sistema completo com:
 * - Multiple tooltip types (simple, rich, interactive)
 * - Smart positioning (auto-flip, boundary awareness)
 * - Delay and animation options
 * - Touch device support
 * - Accessibility (ARIA)
 * - Custom tooltip components
 * - Tooltip groups and context
 *
 * @module lib/ui/tooltip-system
 */

import { EventEmitter } from 'events';

import type {
  Tooltip,
  TooltipAnimation,
  TooltipConfig,
  TooltipContent,
  TooltipOptions,
  TooltipTrigger,
} from './tooltip-system.types';
import { createDefaultTooltipConfig } from './tooltip-system.types';
import { normalizeTooltipOptions } from './tooltip-system-options';
import { calculateTooltipPosition } from './tooltip-system-positioning';
export type {
  Tooltip,
  TooltipAction,
  TooltipAnimation,
  TooltipConfig,
  TooltipContent,
  TooltipOptions,
  TooltipPosition,
  TooltipStat,
  TooltipTrigger,
} from './tooltip-system.types';

// ============================================================================
// TOOLTIP MANAGER
// ============================================================================

export class TooltipManager extends EventEmitter {
  private static instance: TooltipManager | null = null;

  private config: TooltipConfig;
  private tooltips: Map<string, Tooltip> = new Map();
  private groups: Map<string, Set<string>> = new Map();
  private activeTooltip: string | null = null;
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private idCounter = 0;

  constructor(config: Partial<TooltipConfig> = {}) {
    super();

    this.config = createDefaultTooltipConfig(config);

    // Global event listeners
    if (typeof document !== 'undefined') {
      if (this.config.hideOnEscape) {
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
      }
    }
  }

  static getInstance(): TooltipManager {
    if (!TooltipManager.instance) {
      TooltipManager.instance = new TooltipManager();
    }
    return TooltipManager.instance;
  }

  // ============================================================================
  // TOOLTIP REGISTRATION
  // ============================================================================

  register(element: HTMLElement, options: TooltipOptions): string {
    const id = options.id || this.generateId();

    const tooltip: Tooltip = {
      id,
      element,
      options: normalizeTooltipOptions(options, this.config),
      visible: false,
      position: { x: 0, y: 0 },
      actualPosition: options.position || this.config.defaultPosition,
    };

    this.tooltips.set(id, tooltip);

    // Add to group
    if (options.group) {
      if (!this.groups.has(options.group)) {
        this.groups.set(options.group, new Set());
      }
      this.groups.get(options.group)!.add(id);
    }

    // Attach event listeners
    this.attachListeners(tooltip);

    // Callback
    options.onCreate?.(tooltip);

    this.emit('registered', tooltip);
    return id;
  }

  unregister(id: string): void {
    const tooltip = this.tooltips.get(id);
    if (!tooltip) return;

    this.hide(id);
    this.detachListeners(tooltip);

    // Remove from group
    if (tooltip.options.group) {
      this.groups.get(tooltip.options.group)?.delete(id);
    }

    this.tooltips.delete(id);
    this.emit('unregistered', id);
  }

  // ============================================================================
  // EVENT LISTENERS
  // ============================================================================

  private attachListeners(tooltip: Tooltip): void {
    const { element, options } = tooltip;

    switch (options.trigger) {
      case 'hover':
        element.addEventListener('mouseenter', () => this.scheduleShow(tooltip.id));
        element.addEventListener('mouseleave', () => this.scheduleHide(tooltip.id));

        if (options.interactive) {
          // Keep tooltip open when hovering it
          element.addEventListener('mouseenter', () => this.cancelHide());
        }
        break;

      case 'click':
        element.addEventListener('click', () => this.toggle(tooltip.id));
        break;

      case 'focus':
        element.addEventListener('focus', () => this.scheduleShow(tooltip.id));
        element.addEventListener('blur', () => this.scheduleHide(tooltip.id));
        break;

      case 'manual':
        // No automatic listeners
        break;
    }

    // Touch support
    if (this.config.touchEnabled && options.trigger === 'hover') {
      let touchTimer: ReturnType<typeof setTimeout> | null = null;

      element.addEventListener('touchstart', () => {
        touchTimer = setTimeout(() => {
          this.show(tooltip.id);
        }, options.touchDuration);
      });

      element.addEventListener('touchend', () => {
        if (touchTimer) clearTimeout(touchTimer);
        this.scheduleHide(tooltip.id);
      });
    }

    // Scroll hiding
    if (options.hideOnScroll) {
      const scrollHandler = () => {
        if (tooltip.visible) {
          this.hide(tooltip.id);
        }
      };

      window.addEventListener('scroll', scrollHandler, { passive: true });
    }
  }

  private detachListeners(tooltip: Tooltip): void {
    // Clone element to remove all listeners
    const newElement = tooltip.element.cloneNode(true) as HTMLElement;
    tooltip.element.parentNode?.replaceChild(newElement, tooltip.element);
    tooltip.element = newElement;
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && this.activeTooltip) {
      this.hide(this.activeTooltip);
    }
  }

  // ============================================================================
  // SHOW/HIDE
  // ============================================================================

  scheduleShow(id: string): void {
    const tooltip = this.tooltips.get(id);
    if (!tooltip || tooltip.options.disabled) return;

    this.cancelShow();
    this.cancelHide();

    const delay = tooltip.options.delay as { show: number; hide: number };

    this.showTimer = setTimeout(() => {
      this.show(id);
    }, delay.show);
  }

  scheduleHide(id: string): void {
    const tooltip = this.tooltips.get(id);
    if (!tooltip) return;

    this.cancelShow();
    this.cancelHide();

    const delay = tooltip.options.delay as { show: number; hide: number };

    this.hideTimer = setTimeout(() => {
      this.hide(id);
    }, delay.hide);
  }

  cancelShow(): void {
    if (this.showTimer) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }
  }

  cancelHide(): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }

  show(id: string): void {
    const tooltip = this.tooltips.get(id);
    if (!tooltip || tooltip.visible || tooltip.options.disabled) return;

    // Handle singleton/group
    if (tooltip.options.singleton && this.activeTooltip) {
      this.hide(this.activeTooltip);
    }

    if (tooltip.options.group) {
      this.hideGroup(tooltip.options.group, id);
    }

    // Calculate position
    const position = calculateTooltipPosition(tooltip);
    tooltip.position = position.coords;
    tooltip.actualPosition = position.placement;

    tooltip.visible = true;
    this.activeTooltip = id;

    // Auto-hide
    if (tooltip.options.duration > 0) {
      setTimeout(() => {
        this.hide(id);
      }, tooltip.options.duration);
    }

    tooltip.options.onShow();
    this.emit('show', tooltip);
  }

  hide(id: string): void {
    const tooltip = this.tooltips.get(id);
    if (!tooltip || !tooltip.visible) return;

    tooltip.visible = false;

    if (this.activeTooltip === id) {
      this.activeTooltip = null;
    }

    tooltip.options.onHide();
    this.emit('hide', tooltip);
  }

  toggle(id: string): void {
    const tooltip = this.tooltips.get(id);
    if (!tooltip) return;

    if (tooltip.visible) {
      this.hide(id);
    } else {
      this.show(id);
    }
  }

  hideAll(): void {
    for (const id of this.tooltips.keys()) {
      this.hide(id);
    }
  }

  hideGroup(group: string, except?: string): void {
    const groupIds = this.groups.get(group);
    if (!groupIds) return;

    for (const id of groupIds) {
      if (id !== except) {
        this.hide(id);
      }
    }
  }

  // ============================================================================
  // UPDATE
  // ============================================================================

  update(id: string, options: Partial<TooltipOptions>): void {
    const tooltip = this.tooltips.get(id);
    if (!tooltip) return;

    tooltip.options = {
      ...tooltip.options,
      ...normalizeTooltipOptions({ ...tooltip.options, ...options }, this.config),
    };

    if (tooltip.visible) {
      const position = calculateTooltipPosition(tooltip);
      tooltip.position = position.coords;
      tooltip.actualPosition = position.placement;
    }

    this.emit('updated', tooltip);
  }

  setContent(id: string, content: string | TooltipContent): void {
    this.update(id, { content });
  }

  setDisabled(id: string, disabled: boolean): void {
    this.update(id, { disabled });

    if (disabled) {
      this.hide(id);
    }
  }

  // ============================================================================
  // GETTERS
  // ============================================================================

  get(id: string): Tooltip | undefined {
    return this.tooltips.get(id);
  }

  getAll(): Tooltip[] {
    return Array.from(this.tooltips.values());
  }

  getVisible(): Tooltip[] {
    return this.getAll().filter(t => t.visible);
  }

  getActive(): Tooltip | undefined {
    return this.activeTooltip ? this.tooltips.get(this.activeTooltip) : undefined;
  }

  isVisible(id: string): boolean {
    return this.tooltips.get(id)?.visible ?? false;
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  private generateId(): string {
    return `tooltip_${Date.now()}_${++this.idCounter}`;
  }

  setConfig(config: Partial<TooltipConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('configChanged', this.config);
  }

  getConfig(): TooltipConfig {
    return { ...this.config };
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  dispose(): void {
    this.hideAll();
    this.tooltips.clear();
    this.groups.clear();
    this.cancelShow();
    this.cancelHide();
    this.removeAllListeners();
    TooltipManager.instance = null;
  }
}

// ============================================================================
// REACT HOOKS
// ============================================================================

import type * as React from 'react';
import { TooltipProvider, useActiveTooltip, useTooltip, useTooltipHideAll, useTooltipManager, useVisibleTooltips } from './tooltip-system-react';
export { TooltipProvider, useActiveTooltip, useTooltip, useTooltipHideAll, useTooltipManager, useVisibleTooltips } from './tooltip-system-react';

const __defaultExport = {
  TooltipManager,
  TooltipProvider,
  useTooltipManager,
  useTooltip,
  useActiveTooltip,
  useVisibleTooltips,
  useTooltipHideAll,
};

export default __defaultExport;
