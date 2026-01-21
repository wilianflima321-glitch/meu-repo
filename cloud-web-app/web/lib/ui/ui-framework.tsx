/**
 * UI Framework System - Sistema de Interface de Usuário para Jogos
 * 
 * Framework completo de UI com:
 * - Componentes de UI de jogos (HUD, menus, overlays)
 * - Sistema de temas e estilos
 * - Animações de UI
 * - Input focus management
 * - Tooltips e modals
 * - Notificações e toasts
 * - Drag and drop
 * - Inventory UI base
 * 
 * @module lib/ui/ui-framework
 */

import { EventEmitter } from 'events';
import { useState, useRef, useEffect, useContext, createContext, useCallback, useMemo } from 'react';
import type { ReactNode, CSSProperties, MouseEvent, KeyboardEvent } from 'react';

// ============================================================================
// TYPES
// ============================================================================

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
}

// ============================================================================
// DEFAULT THEMES
// ============================================================================

export const darkTheme: Theme = {
  name: 'dark',
  colors: {
    primary: '#6366f1',
    secondary: '#8b5cf6',
    accent: '#f59e0b',
    background: '#0f0f0f',
    surface: '#1a1a1a',
    error: '#ef4444',
    warning: '#f59e0b',
    success: '#22c55e',
    info: '#3b82f6',
    text: {
      primary: '#ffffff',
      secondary: '#a1a1aa',
      disabled: '#52525b',
      inverse: '#0f0f0f',
    },
    border: '#27272a',
    divider: '#3f3f46',
    overlay: 'rgba(0, 0, 0, 0.7)',
    shadow: 'rgba(0, 0, 0, 0.5)',
  },
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      md: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      xxl: '1.5rem',
    },
    fontWeight: {
      light: 300,
      regular: 400,
      medium: 500,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    xxl: '3rem',
  },
  borderRadius: {
    none: '0',
    sm: '0.25rem',
    md: '0.5rem',
    lg: '1rem',
    full: '9999px',
  },
  shadows: {
    none: 'none',
    sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px rgba(0, 0, 0, 0.4)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.5)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.6)',
  },
  transitions: {
    fast: '0.1s ease',
    normal: '0.2s ease',
    slow: '0.3s ease',
  },
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modal: 1040,
    popover: 1050,
    tooltip: 1060,
    toast: 1070,
  },
};

export const lightTheme: Theme = {
  ...darkTheme,
  name: 'light',
  colors: {
    ...darkTheme.colors,
    background: '#ffffff',
    surface: '#f4f4f5',
    text: {
      primary: '#18181b',
      secondary: '#52525b',
      disabled: '#a1a1aa',
      inverse: '#ffffff',
    },
    border: '#e4e4e7',
    divider: '#d4d4d8',
    overlay: 'rgba(0, 0, 0, 0.5)',
    shadow: 'rgba(0, 0, 0, 0.1)',
  },
  shadows: {
    none: 'none',
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.15)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.2)',
  },
};

export const gameTheme: Theme = {
  ...darkTheme,
  name: 'game',
  colors: {
    primary: '#fbbf24',
    secondary: '#f59e0b',
    accent: '#ef4444',
    background: '#0a0a0a',
    surface: '#18181b',
    error: '#dc2626',
    warning: '#f59e0b',
    success: '#16a34a',
    info: '#2563eb',
    text: {
      primary: '#fafafa',
      secondary: '#a1a1aa',
      disabled: '#52525b',
      inverse: '#0a0a0a',
    },
    border: '#3f3f46',
    divider: '#52525b',
    overlay: 'rgba(0, 0, 0, 0.85)',
    shadow: 'rgba(0, 0, 0, 0.7)',
  },
};

// ============================================================================
// UI MANAGER
// ============================================================================

export class UIManager extends EventEmitter {
  private theme: Theme = darkTheme;
  private toasts: Map<string, ToastConfig & { createdAt: number }> = new Map();
  private modals: Map<string, ModalConfig> = new Map();
  private activeModalStack: string[] = [];
  private focusStack: HTMLElement[] = [];
  private dragData: DragData | null = null;
  
  private toastCounter = 0;
  private defaultToastDuration = 5000;
  private defaultToastPosition: ToastPosition = 'top-right';
  
  constructor(theme?: Theme) {
    super();
    if (theme) this.theme = theme;
  }
  
  // ============================================================================
  // THEME
  // ============================================================================
  
  setTheme(theme: Theme): void {
    this.theme = theme;
    this.emit('themeChanged', { theme });
    this.applyThemeToDocument();
  }
  
  getTheme(): Theme {
    return this.theme;
  }
  
  private applyThemeToDocument(): void {
    if (typeof document === 'undefined') return;
    
    const root = document.documentElement;
    
    // Apply CSS custom properties
    root.style.setProperty('--ui-color-primary', this.theme.colors.primary);
    root.style.setProperty('--ui-color-secondary', this.theme.colors.secondary);
    root.style.setProperty('--ui-color-accent', this.theme.colors.accent);
    root.style.setProperty('--ui-color-background', this.theme.colors.background);
    root.style.setProperty('--ui-color-surface', this.theme.colors.surface);
    root.style.setProperty('--ui-color-error', this.theme.colors.error);
    root.style.setProperty('--ui-color-warning', this.theme.colors.warning);
    root.style.setProperty('--ui-color-success', this.theme.colors.success);
    root.style.setProperty('--ui-color-info', this.theme.colors.info);
    root.style.setProperty('--ui-color-text-primary', this.theme.colors.text.primary);
    root.style.setProperty('--ui-color-text-secondary', this.theme.colors.text.secondary);
    root.style.setProperty('--ui-color-border', this.theme.colors.border);
    root.style.setProperty('--ui-font-family', this.theme.typography.fontFamily);
  }
  
  // ============================================================================
  // TOASTS
  // ============================================================================
  
  showToast(config: ToastConfig): string {
    const id = config.id || `toast_${++this.toastCounter}`;
    const duration = config.duration ?? this.defaultToastDuration;
    const position = config.position ?? this.defaultToastPosition;
    
    const toast = {
      ...config,
      id,
      position,
      createdAt: Date.now(),
    };
    
    this.toasts.set(id, toast);
    this.emit('toastAdded', { toast });
    
    if (duration > 0) {
      setTimeout(() => {
        this.dismissToast(id);
      }, duration);
    }
    
    return id;
  }
  
  dismissToast(id: string): void {
    const toast = this.toasts.get(id);
    if (toast) {
      this.toasts.delete(id);
      this.emit('toastRemoved', { toast });
    }
  }
  
  dismissAllToasts(): void {
    this.toasts.clear();
    this.emit('toastsCleared');
  }
  
  getToasts(): (ToastConfig & { createdAt: number })[] {
    return Array.from(this.toasts.values());
  }
  
  // Convenience methods
  info(message: string, duration?: number): string {
    return this.showToast({ message, type: 'info', duration });
  }
  
  success(message: string, duration?: number): string {
    return this.showToast({ message, type: 'success', duration });
  }
  
  warning(message: string, duration?: number): string {
    return this.showToast({ message, type: 'warning', duration });
  }
  
  error(message: string, duration?: number): string {
    return this.showToast({ message, type: 'error', duration });
  }
  
  // ============================================================================
  // MODALS
  // ============================================================================
  
  openModal(config: ModalConfig): void {
    this.modals.set(config.id, config);
    this.activeModalStack.push(config.id);
    
    // Save current focus
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      this.focusStack.push(document.activeElement);
    }
    
    this.emit('modalOpened', { modal: config });
  }
  
  closeModal(id?: string): void {
    const modalId = id || this.activeModalStack[this.activeModalStack.length - 1];
    if (!modalId) return;
    
    const modal = this.modals.get(modalId);
    if (!modal) return;
    
    this.modals.delete(modalId);
    
    const index = this.activeModalStack.indexOf(modalId);
    if (index >= 0) {
      this.activeModalStack.splice(index, 1);
    }
    
    modal.onClose?.();
    
    // Restore focus
    const previousFocus = this.focusStack.pop();
    if (previousFocus) {
      previousFocus.focus();
    }
    
    this.emit('modalClosed', { modal });
  }
  
  closeAllModals(): void {
    for (const id of [...this.activeModalStack]) {
      this.closeModal(id);
    }
  }
  
  getActiveModal(): ModalConfig | undefined {
    const topId = this.activeModalStack[this.activeModalStack.length - 1];
    return topId ? this.modals.get(topId) : undefined;
  }
  
  isModalOpen(id?: string): boolean {
    if (id) {
      return this.modals.has(id);
    }
    return this.activeModalStack.length > 0;
  }
  
  // ============================================================================
  // DRAG AND DROP
  // ============================================================================
  
  startDrag(type: string, data: unknown, sourceId: string): void {
    this.dragData = { type, data, sourceId };
    this.emit('dragStart', { dragData: this.dragData });
  }
  
  endDrag(): void {
    const data = this.dragData;
    this.dragData = null;
    this.emit('dragEnd', { dragData: data });
  }
  
  getDragData(): DragData | null {
    return this.dragData;
  }
  
  isDragging(): boolean {
    return this.dragData !== null;
  }
  
  canDrop(acceptedTypes: string[]): boolean {
    if (!this.dragData) return false;
    return acceptedTypes.includes(this.dragData.type);
  }
  
  drop(targetId: string): DropResult | null {
    if (!this.dragData) return null;
    
    const result: DropResult = {
      success: true,
      targetId,
      data: this.dragData,
    };
    
    this.emit('drop', { result });
    this.endDrag();
    
    return result;
  }
  
  // ============================================================================
  // FOCUS MANAGEMENT
  // ============================================================================
  
  trapFocus(container: HTMLElement): () => void {
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };
    
    container.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();
    
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }
  
  // ============================================================================
  // UTILITIES
  // ============================================================================
  
  dispose(): void {
    this.toasts.clear();
    this.modals.clear();
    this.activeModalStack = [];
    this.focusStack = [];
    this.dragData = null;
    this.removeAllListeners();
  }
}

// ============================================================================
// CONTEXT
// ============================================================================

const UIContext = createContext<UIManager | null>(null);

export function UIProvider({ 
  children, 
  theme = darkTheme 
}: { 
  children: ReactNode; 
  theme?: Theme;
}) {
  const managerRef = useRef<UIManager>(new UIManager(theme));
  
  useEffect(() => {
    managerRef.current.setTheme(theme);
  }, [theme]);
  
  useEffect(() => {
    return () => {
      managerRef.current.dispose();
    };
  }, []);
  
  return (
    <UIContext.Provider value={managerRef.current}>
      {children}
    </UIContext.Provider>
  );
}

// ============================================================================
// HOOKS
// ============================================================================

export function useUI() {
  const manager = useContext(UIContext);
  if (!manager) {
    throw new Error('useUI must be used within a UIProvider');
  }
  
  return manager;
}

export function useTheme() {
  const manager = useUI();
  const [theme, setThemeState] = useState<Theme>(manager.getTheme());
  
  useEffect(() => {
    const handleChange = ({ theme: newTheme }: { theme: Theme }) => {
      setThemeState(newTheme);
    };
    
    manager.on('themeChanged', handleChange);
    
    return () => {
      manager.off('themeChanged', handleChange);
    };
  }, [manager]);
  
  const setTheme = useCallback((newTheme: Theme) => {
    manager.setTheme(newTheme);
  }, [manager]);
  
  return { theme, setTheme };
}

export function useToasts() {
  const manager = useUI();
  const [toasts, setToasts] = useState(manager.getToasts());
  
  useEffect(() => {
    const update = () => setToasts(manager.getToasts());
    
    manager.on('toastAdded', update);
    manager.on('toastRemoved', update);
    manager.on('toastsCleared', update);
    
    return () => {
      manager.off('toastAdded', update);
      manager.off('toastRemoved', update);
      manager.off('toastsCleared', update);
    };
  }, [manager]);
  
  return {
    toasts,
    show: manager.showToast.bind(manager),
    dismiss: manager.dismissToast.bind(manager),
    dismissAll: manager.dismissAllToasts.bind(manager),
    info: manager.info.bind(manager),
    success: manager.success.bind(manager),
    warning: manager.warning.bind(manager),
    error: manager.error.bind(manager),
  };
}

export function useModal() {
  const manager = useUI();
  const [isOpen, setIsOpen] = useState(manager.isModalOpen());
  const [activeModal, setActiveModal] = useState(manager.getActiveModal());
  
  useEffect(() => {
    const handleOpen = ({ modal }: { modal: ModalConfig }) => {
      setIsOpen(true);
      setActiveModal(modal);
    };
    
    const handleClose = () => {
      setIsOpen(manager.isModalOpen());
      setActiveModal(manager.getActiveModal());
    };
    
    manager.on('modalOpened', handleOpen);
    manager.on('modalClosed', handleClose);
    
    return () => {
      manager.off('modalOpened', handleOpen);
      manager.off('modalClosed', handleClose);
    };
  }, [manager]);
  
  return {
    isOpen,
    activeModal,
    open: manager.openModal.bind(manager),
    close: manager.closeModal.bind(manager),
    closeAll: manager.closeAllModals.bind(manager),
  };
}

export function useDragDrop() {
  const manager = useUI();
  const [isDragging, setIsDragging] = useState(false);
  const [dragData, setDragData] = useState<DragData | null>(null);
  
  useEffect(() => {
    const handleStart = ({ dragData: data }: { dragData: DragData }) => {
      setIsDragging(true);
      setDragData(data);
    };
    
    const handleEnd = () => {
      setIsDragging(false);
      setDragData(null);
    };
    
    manager.on('dragStart', handleStart);
    manager.on('dragEnd', handleEnd);
    
    return () => {
      manager.off('dragStart', handleStart);
      manager.off('dragEnd', handleEnd);
    };
  }, [manager]);
  
  const startDrag = useCallback((type: string, data: unknown, sourceId: string) => {
    manager.startDrag(type, data, sourceId);
  }, [manager]);
  
  const endDrag = useCallback(() => {
    manager.endDrag();
  }, [manager]);
  
  const drop = useCallback((targetId: string) => {
    return manager.drop(targetId);
  }, [manager]);
  
  const canDrop = useCallback((acceptedTypes: string[]) => {
    return manager.canDrop(acceptedTypes);
  }, [manager]);
  
  return {
    isDragging,
    dragData,
    startDrag,
    endDrag,
    drop,
    canDrop,
  };
}

// ============================================================================
// UI COMPONENTS (JSX - Styled with inline styles for portability)
// ============================================================================

export interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  style?: CSSProperties;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  onClick,
  className = '',
  style = {},
}: ButtonProps) {
  const { theme } = useTheme();
  
  const baseStyles: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    fontFamily: theme.typography.fontFamily,
    fontWeight: theme.typography.fontWeight.medium,
    borderRadius: theme.borderRadius.md,
    transition: theme.transitions.normal,
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    width: fullWidth ? '100%' : 'auto',
    border: 'none',
    outline: 'none',
  };
  
  const sizeStyles: Record<string, CSSProperties> = {
    sm: { padding: `${theme.spacing.xs} ${theme.spacing.sm}`, fontSize: theme.typography.fontSize.sm },
    md: { padding: `${theme.spacing.sm} ${theme.spacing.md}`, fontSize: theme.typography.fontSize.md },
    lg: { padding: `${theme.spacing.md} ${theme.spacing.lg}`, fontSize: theme.typography.fontSize.lg },
  };
  
  const variantStyles: Record<string, CSSProperties> = {
    primary: { backgroundColor: theme.colors.primary, color: theme.colors.text.inverse },
    secondary: { backgroundColor: theme.colors.secondary, color: theme.colors.text.inverse },
    outline: { backgroundColor: 'transparent', color: theme.colors.primary, border: `1px solid ${theme.colors.primary}` },
    ghost: { backgroundColor: 'transparent', color: theme.colors.text.primary },
    danger: { backgroundColor: theme.colors.error, color: theme.colors.text.inverse },
  };
  
  const combinedStyles: CSSProperties = {
    ...baseStyles,
    ...sizeStyles[size],
    ...variantStyles[variant],
    ...style,
  };
  
  return (
    <button
      className={className}
      style={combinedStyles}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading && <span>⟳</span>}
      {!loading && icon && iconPosition === 'left' && icon}
      {children}
      {!loading && icon && iconPosition === 'right' && icon}
    </button>
  );
}

export interface ProgressBarProps {
  value: number;
  max?: number;
  showLabel?: boolean;
  labelFormat?: (value: number, max: number) => string;
  variant?: 'default' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function ProgressBar({
  value,
  max = 100,
  showLabel = false,
  labelFormat,
  variant = 'default',
  size = 'md',
  animated = false,
  className = '',
  style = {},
}: ProgressBarProps) {
  const { theme } = useTheme();
  
  const percent = Math.min(100, Math.max(0, (value / max) * 100));
  
  const heights: Record<string, string> = {
    sm: '4px',
    md: '8px',
    lg: '12px',
  };
  
  const colors: Record<string, string> = {
    default: theme.colors.primary,
    success: theme.colors.success,
    warning: theme.colors.warning,
    error: theme.colors.error,
  };
  
  const containerStyles: CSSProperties = {
    width: '100%',
    height: heights[size],
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
    ...style,
  };
  
  const barStyles: CSSProperties = {
    width: `${percent}%`,
    height: '100%',
    backgroundColor: colors[variant],
    borderRadius: theme.borderRadius.full,
    transition: animated ? 'width 0.3s ease' : 'none',
  };
  
  const label = labelFormat 
    ? labelFormat(value, max) 
    : `${Math.round(percent)}%`;
  
  return (
    <div className={className}>
      <div style={containerStyles}>
        <div style={barStyles} />
      </div>
      {showLabel && (
        <span style={{ 
          fontSize: theme.typography.fontSize.sm, 
          color: theme.colors.text.secondary,
          marginTop: theme.spacing.xs,
          display: 'block',
        }}>
          {label}
        </span>
      )}
    </div>
  );
}

export interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  rounded?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  rounded = false,
  className = '',
  style = {},
}: BadgeProps) {
  const { theme } = useTheme();
  
  const colors: Record<string, { bg: string; text: string }> = {
    default: { bg: theme.colors.surface, text: theme.colors.text.primary },
    primary: { bg: theme.colors.primary, text: theme.colors.text.inverse },
    success: { bg: theme.colors.success, text: theme.colors.text.inverse },
    warning: { bg: theme.colors.warning, text: theme.colors.text.inverse },
    error: { bg: theme.colors.error, text: theme.colors.text.inverse },
    info: { bg: theme.colors.info, text: theme.colors.text.inverse },
  };
  
  const sizes: Record<string, CSSProperties> = {
    sm: { padding: `${theme.spacing.xs} ${theme.spacing.sm}`, fontSize: theme.typography.fontSize.xs },
    md: { padding: `${theme.spacing.xs} ${theme.spacing.md}`, fontSize: theme.typography.fontSize.sm },
    lg: { padding: `${theme.spacing.sm} ${theme.spacing.md}`, fontSize: theme.typography.fontSize.md },
  };
  
  const badgeStyles: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: theme.typography.fontFamily,
    fontWeight: theme.typography.fontWeight.medium,
    backgroundColor: colors[variant].bg,
    color: colors[variant].text,
    borderRadius: rounded ? theme.borderRadius.full : theme.borderRadius.sm,
    ...sizes[size],
    ...style,
  };
  
  return (
    <span className={className} style={badgeStyles}>
      {children}
    </span>
  );
}

export interface CardProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  header?: ReactNode;
  footer?: ReactNode;
  hoverable?: boolean;
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
}

export function Card({
  children,
  title,
  subtitle,
  header,
  footer,
  hoverable = false,
  onClick,
  className = '',
  style = {},
}: CardProps) {
  const { theme } = useTheme();
  
  const cardStyles: CSSProperties = {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    border: `1px solid ${theme.colors.border}`,
    boxShadow: theme.shadows.sm,
    overflow: 'hidden',
    transition: theme.transitions.normal,
    cursor: onClick ? 'pointer' : 'default',
    ...style,
  };
  
  const headerStyles: CSSProperties = {
    padding: theme.spacing.md,
    borderBottom: `1px solid ${theme.colors.divider}`,
  };
  
  const bodyStyles: CSSProperties = {
    padding: theme.spacing.md,
  };
  
  const footerStyles: CSSProperties = {
    padding: theme.spacing.md,
    borderTop: `1px solid ${theme.colors.divider}`,
    backgroundColor: theme.colors.background,
  };
  
  return (
    <div className={className} style={cardStyles} onClick={onClick}>
      {(title || subtitle || header) && (
        <div style={headerStyles}>
          {header || (
            <>
              {title && (
                <h3 style={{ 
                  margin: 0, 
                  fontSize: theme.typography.fontSize.lg,
                  fontWeight: theme.typography.fontWeight.bold,
                  color: theme.colors.text.primary,
                }}>
                  {title}
                </h3>
              )}
              {subtitle && (
                <p style={{ 
                  margin: `${theme.spacing.xs} 0 0`, 
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.text.secondary,
                }}>
                  {subtitle}
                </p>
              )}
            </>
          )}
        </div>
      )}
      <div style={bodyStyles}>{children}</div>
      {footer && <div style={footerStyles}>{footer}</div>}
    </div>
  );
}

export interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'password' | 'email' | 'number' | 'search';
  disabled?: boolean;
  error?: string;
  label?: string;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled = false,
  error,
  label,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  className = '',
  style = {},
}: InputProps) {
  const { theme } = useTheme();
  
  const containerStyles: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xs,
    width: fullWidth ? '100%' : 'auto',
  };
  
  const inputContainerStyles: CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  };
  
  const inputStyles: CSSProperties = {
    width: '100%',
    padding: theme.spacing.sm,
    paddingLeft: icon && iconPosition === 'left' ? theme.spacing.xl : theme.spacing.sm,
    paddingRight: icon && iconPosition === 'right' ? theme.spacing.xl : theme.spacing.sm,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.background,
    border: `1px solid ${error ? theme.colors.error : theme.colors.border}`,
    borderRadius: theme.borderRadius.md,
    outline: 'none',
    transition: theme.transitions.fast,
    opacity: disabled ? 0.5 : 1,
    ...style,
  };
  
  const iconStyles: CSSProperties = {
    position: 'absolute',
    [iconPosition]: theme.spacing.sm,
    color: theme.colors.text.secondary,
    pointerEvents: 'none',
  };
  
  return (
    <div className={className} style={containerStyles}>
      {label && (
        <label style={{ 
          fontSize: theme.typography.fontSize.sm, 
          color: theme.colors.text.secondary,
          fontWeight: theme.typography.fontWeight.medium,
        }}>
          {label}
        </label>
      )}
      <div style={inputContainerStyles}>
        {icon && <span style={iconStyles}>{icon}</span>}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          style={inputStyles}
        />
      </div>
      {error && (
        <span style={{ 
          fontSize: theme.typography.fontSize.sm, 
          color: theme.colors.error,
        }}>
          {error}
        </span>
      )}
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  UIManager,
  UIProvider,
  useUI,
  useTheme,
  useToasts,
  useModal,
  useDragDrop,
  // Components
  Button,
  ProgressBar,
  Badge,
  Card,
  Input,
  // Themes
  darkTheme,
  lightTheme,
  gameTheme,
};
