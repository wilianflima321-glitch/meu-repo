/**
 * Shared type contracts for the UI framework runtime and components.
 */
import type { ReactNode } from 'react';

export interface Theme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    error: string;
    warning: string;
    success: string;
    info: string;
    text: {
      primary: string;
      secondary: string;
      disabled: string;
      inverse: string;
    };
    border: string;
    divider: string;
    overlay: string;
    shadow: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
      xxl: string;
    };
    fontWeight: {
      light: number;
      regular: number;
      medium: number;
      bold: number;
    };
    lineHeight: {
      tight: number;
      normal: number;
      relaxed: number;
    };
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    xxl: string;
  };
  borderRadius: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    full: string;
  };
  shadows: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  transitions: {
    fast: string;
    normal: string;
    slow: string;
  };
  zIndex: {
    base: number;
    dropdown: number;
    sticky: number;
    fixed: number;
    modal: number;
    popover: number;
    tooltip: number;
    toast: number;
  };
}

export interface ToastConfig {
  id?: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  icon?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  position?: ToastPosition;
}

export type ToastPosition = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

export interface ModalConfig {
  id: string;
  title?: string;
  content: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closable?: boolean;
  closeOnOverlay?: boolean;
  closeOnEscape?: boolean;
  onClose?: () => void;
  footer?: ReactNode;
  className?: string;
}

export interface TooltipConfig {
  content: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  maxWidth?: number;
}

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  separator?: boolean;
  children?: ContextMenuItem[];
  onClick?: () => void;
}

export interface DragData {
  type: string;
  data: unknown;
  sourceId: string;
}

export interface DropResult {
  success: boolean;
  targetId: string;
  data: DragData;
