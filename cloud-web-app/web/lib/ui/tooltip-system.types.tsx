import type React from 'react';

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

export function createDefaultTooltipConfig(config: Partial<TooltipConfig> = {}): TooltipConfig {
  return {
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
}
