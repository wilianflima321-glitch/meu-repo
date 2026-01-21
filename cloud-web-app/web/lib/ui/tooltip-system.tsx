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

// ============================================================================
// TYPES
// ============================================================================

export type TooltipPosition = 
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-start'
  | 'top-end'
  | 'bottom-start'
  | 'bottom-end'
  | 'left-start'
  | 'left-end'
  | 'right-start'
  | 'right-end';

export type TooltipTrigger = 'hover' | 'click' | 'focus' | 'manual';

export type TooltipAnimation = 'fade' | 'scale' | 'slide' | 'none';

export interface TooltipOptions {
  id?: string;
  content: string | TooltipContent;
  position?: TooltipPosition;
  trigger?: TooltipTrigger;
  delay?: number | { show: number; hide: number };
  duration?: number; // auto-hide after ms, 0 = never
  offset?: { x: number; y: number };
  animation?: TooltipAnimation;
  animationDuration?: number;
  interactive?: boolean;
  arrow?: boolean;
  arrowSize?: number;
  maxWidth?: number;
  zIndex?: number;
  theme?: string;
  boundary?: DOMRect | 'viewport' | 'parent';
  flipOnOverflow?: boolean;
  hideOnScroll?: boolean;
  hideOnClickOutside?: boolean;
  touchDuration?: number; // long press duration for touch
  group?: string;
  singleton?: boolean;
  disabled?: boolean;
  appendTo?: 'body' | 'parent' | HTMLElement;
  onShow?: () => void;
  onHide?: () => void;
  onCreate?: (tooltip: Tooltip) => void;
}

export interface TooltipContent {
  title?: string;
  description?: string;
  icon?: string;
  image?: string;
  stats?: TooltipStat[];
  actions?: TooltipAction[];
  custom?: React.ReactNode;
}

export interface TooltipStat {
  label: string;
  value: string | number;
  color?: string;
  icon?: string;
}

export interface TooltipAction {
  label: string;
  action: () => void;
  icon?: string;
  disabled?: boolean;
}

export interface Tooltip {
  id: string;
  element: HTMLElement;
  options: Required<TooltipOptions>;
  visible: boolean;
  position: { x: number; y: number };
  actualPosition: TooltipPosition;
}

export interface TooltipConfig {
  defaultPosition: TooltipPosition;
  defaultDelay: number;
  defaultAnimation: TooltipAnimation;
  defaultAnimationDuration: number;
  defaultMaxWidth: number;
  defaultZIndex: number;
  touchEnabled: boolean;
  touchLongPressDuration: number;
  globalBoundary: DOMRect | 'viewport' | null;
  hideOnEscape: boolean;
}

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
    
    this.config = {
      defaultPosition: 'top',
      defaultDelay: 200,
      defaultAnimation: 'fade',
      defaultAnimationDuration: 150,
      defaultMaxWidth: 300,
      defaultZIndex: 10000,
      touchEnabled: true,
      touchLongPressDuration: 500,
      globalBoundary: 'viewport',
      hideOnEscape: true,
      ...config,
    };
    
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
      options: this.normalizeOptions(options),
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
  
  private normalizeOptions(options: TooltipOptions): Required<TooltipOptions> {
    const delay = typeof options.delay === 'number'
      ? { show: options.delay, hide: options.delay / 2 }
      : options.delay || { show: this.config.defaultDelay, hide: this.config.defaultDelay / 2 };
    
    return {
      id: options.id || '',
      content: options.content,
      position: options.position || this.config.defaultPosition,
      trigger: options.trigger || 'hover',
      delay,
      duration: options.duration ?? 0,
      offset: options.offset || { x: 0, y: 8 },
      animation: options.animation || this.config.defaultAnimation,
      animationDuration: options.animationDuration ?? this.config.defaultAnimationDuration,
      interactive: options.interactive ?? false,
      arrow: options.arrow ?? true,
      arrowSize: options.arrowSize ?? 8,
      maxWidth: options.maxWidth ?? this.config.defaultMaxWidth,
      zIndex: options.zIndex ?? this.config.defaultZIndex,
      theme: options.theme || 'default',
      boundary: options.boundary || this.config.globalBoundary || 'viewport',
      flipOnOverflow: options.flipOnOverflow ?? true,
      hideOnScroll: options.hideOnScroll ?? true,
      hideOnClickOutside: options.hideOnClickOutside ?? true,
      touchDuration: options.touchDuration ?? this.config.touchLongPressDuration,
      group: options.group || '',
      singleton: options.singleton ?? false,
      disabled: options.disabled ?? false,
      appendTo: options.appendTo || 'body',
      onShow: options.onShow || (() => {}),
      onHide: options.onHide || (() => {}),
      onCreate: options.onCreate || (() => {}),
    };
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
    const position = this.calculatePosition(tooltip);
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
  // POSITIONING
  // ============================================================================
  
  private calculatePosition(tooltip: Tooltip): { coords: { x: number; y: number }; placement: TooltipPosition } {
    const { element, options } = tooltip;
    const rect = element.getBoundingClientRect();
    
    // Get boundary
    let boundary: DOMRect;
    if (options.boundary === 'viewport') {
      boundary = new DOMRect(0, 0, window.innerWidth, window.innerHeight);
    } else if (options.boundary === 'parent' && element.parentElement) {
      boundary = element.parentElement.getBoundingClientRect();
    } else if (options.boundary instanceof DOMRect) {
      boundary = options.boundary;
    } else {
      boundary = new DOMRect(0, 0, window.innerWidth, window.innerHeight);
    }
    
    // Estimate tooltip size (will be refined when rendered)
    const estimatedWidth = options.maxWidth;
    const estimatedHeight = 80; // Rough estimate
    
    let placement = options.position;
    let { x, y } = this.getPositionCoords(
      rect,
      estimatedWidth,
      estimatedHeight,
      placement,
      options.offset
    );
    
    // Flip if overflowing
    if (options.flipOnOverflow) {
      const flipped = this.flipIfNeeded(
        x, y,
        estimatedWidth,
        estimatedHeight,
        boundary,
        placement,
        rect,
        options.offset
      );
      
      x = flipped.x;
      y = flipped.y;
      placement = flipped.placement;
    }
    
    return { coords: { x, y }, placement };
  }
  
  private getPositionCoords(
    rect: DOMRect,
    width: number,
    height: number,
    position: TooltipPosition,
    offset: { x: number; y: number }
  ): { x: number; y: number } {
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    let x = 0;
    let y = 0;
    
    switch (position) {
      case 'top':
        x = centerX - width / 2;
        y = rect.top - height - offset.y;
        break;
      case 'top-start':
        x = rect.left;
        y = rect.top - height - offset.y;
        break;
      case 'top-end':
        x = rect.right - width;
        y = rect.top - height - offset.y;
        break;
      case 'bottom':
        x = centerX - width / 2;
        y = rect.bottom + offset.y;
        break;
      case 'bottom-start':
        x = rect.left;
        y = rect.bottom + offset.y;
        break;
      case 'bottom-end':
        x = rect.right - width;
        y = rect.bottom + offset.y;
        break;
      case 'left':
        x = rect.left - width - offset.x;
        y = centerY - height / 2;
        break;
      case 'left-start':
        x = rect.left - width - offset.x;
        y = rect.top;
        break;
      case 'left-end':
        x = rect.left - width - offset.x;
        y = rect.bottom - height;
        break;
      case 'right':
        x = rect.right + offset.x;
        y = centerY - height / 2;
        break;
      case 'right-start':
        x = rect.right + offset.x;
        y = rect.top;
        break;
      case 'right-end':
        x = rect.right + offset.x;
        y = rect.bottom - height;
        break;
    }
    
    return { x, y };
  }
  
  private flipIfNeeded(
    x: number,
    y: number,
    width: number,
    height: number,
    boundary: DOMRect,
    position: TooltipPosition,
    rect: DOMRect,
    offset: { x: number; y: number }
  ): { x: number; y: number; placement: TooltipPosition } {
    const flipMap: Record<string, TooltipPosition> = {
      'top': 'bottom',
      'top-start': 'bottom-start',
      'top-end': 'bottom-end',
      'bottom': 'top',
      'bottom-start': 'top-start',
      'bottom-end': 'top-end',
      'left': 'right',
      'left-start': 'right-start',
      'left-end': 'right-end',
      'right': 'left',
      'right-start': 'left-start',
      'right-end': 'left-end',
    };
    
    let flipped = false;
    let newPosition = position;
    
    // Check vertical overflow
    if (position.startsWith('top') && y < boundary.top) {
      newPosition = flipMap[position];
      flipped = true;
    } else if (position.startsWith('bottom') && y + height > boundary.bottom) {
      newPosition = flipMap[position];
      flipped = true;
    }
    
    // Check horizontal overflow
    if (position.startsWith('left') && x < boundary.left) {
      newPosition = flipMap[position];
      flipped = true;
    } else if (position.startsWith('right') && x + width > boundary.right) {
      newPosition = flipMap[position];
      flipped = true;
    }
    
    if (flipped) {
      const newCoords = this.getPositionCoords(rect, width, height, newPosition, offset);
      return { x: newCoords.x, y: newCoords.y, placement: newPosition };
    }
    
    return { x, y, placement: position };
  }
  
  // ============================================================================
  // UPDATE
  // ============================================================================
  
  update(id: string, options: Partial<TooltipOptions>): void {
    const tooltip = this.tooltips.get(id);
    if (!tooltip) return;
    
    tooltip.options = { ...tooltip.options, ...this.normalizeOptions({ ...tooltip.options, ...options }) };
    
    if (tooltip.visible) {
      const position = this.calculatePosition(tooltip);
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

import { useState, useEffect, useContext, createContext, useCallback, useMemo, useRef } from 'react';

interface TooltipContextValue {
  manager: TooltipManager;
}

const TooltipContext = createContext<TooltipContextValue | null>(null);

export function TooltipProvider({ 
  children,
  config,
}: { 
  children: React.ReactNode;
  config?: Partial<TooltipConfig>;
}) {
  const value = useMemo(() => ({
    manager: new TooltipManager(config),
  }), []);
  
  useEffect(() => {
    return () => {
      value.manager.dispose();
    };
  }, [value]);
  
  return (
    <TooltipContext.Provider value={value}>
      {children}
    </TooltipContext.Provider>
  );
}

export function useTooltipManager() {
  const context = useContext(TooltipContext);
  if (!context) {
    return TooltipManager.getInstance();
  }
  return context.manager;
}

export function useTooltip(options: TooltipOptions): {
  ref: React.RefObject<HTMLElement>;
  isVisible: boolean;
  show: () => void;
  hide: () => void;
  toggle: () => void;
  update: (newOptions: Partial<TooltipOptions>) => void;
} {
  const manager = useTooltipManager();
  const ref = useRef<HTMLElement>(null);
  const [tooltipId, setTooltipId] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    if (!ref.current) return;
    
    const id = manager.register(ref.current, options);
    setTooltipId(id);
    
    const onShow = (t: Tooltip) => {
      if (t.id === id) setIsVisible(true);
    };
    const onHide = (t: Tooltip) => {
      if (t.id === id) setIsVisible(false);
    };
    
    manager.on('show', onShow);
    manager.on('hide', onHide);
    
    return () => {
      manager.unregister(id);
      manager.off('show', onShow);
      manager.off('hide', onHide);
    };
  }, [manager, ref.current]);
  
  const show = useCallback(() => {
    if (tooltipId) manager.show(tooltipId);
  }, [manager, tooltipId]);
  
  const hide = useCallback(() => {
    if (tooltipId) manager.hide(tooltipId);
  }, [manager, tooltipId]);
  
  const toggle = useCallback(() => {
    if (tooltipId) manager.toggle(tooltipId);
  }, [manager, tooltipId]);
  
  const update = useCallback((newOptions: Partial<TooltipOptions>) => {
    if (tooltipId) manager.update(tooltipId, newOptions);
  }, [manager, tooltipId]);
  
  return { ref: ref as React.RefObject<HTMLElement>, isVisible, show, hide, toggle, update };
}

export function useActiveTooltip() {
  const manager = useTooltipManager();
  const [active, setActive] = useState<Tooltip | undefined>(manager.getActive());
  
  useEffect(() => {
    const onShow = (t: Tooltip) => setActive(t);
    const onHide = () => setActive(undefined);
    
    manager.on('show', onShow);
    manager.on('hide', onHide);
    
    return () => {
      manager.off('show', onShow);
      manager.off('hide', onHide);
    };
  }, [manager]);
  
  return active;
}

export function useVisibleTooltips() {
  const manager = useTooltipManager();
  const [visible, setVisible] = useState<Tooltip[]>(manager.getVisible());
  
  useEffect(() => {
    const update = () => setVisible(manager.getVisible());
    
    manager.on('show', update);
    manager.on('hide', update);
    
    return () => {
      manager.off('show', update);
      manager.off('hide', update);
    };
  }, [manager]);
  
  return visible;
}

export function useTooltipHideAll() {
  const manager = useTooltipManager();
  
  return useCallback(() => {
    manager.hideAll();
  }, [manager]);
}

export default {
  TooltipManager,
  TooltipProvider,
  useTooltipManager,
  useTooltip,
  useActiveTooltip,
  useVisibleTooltips,
  useTooltipHideAll,
};
