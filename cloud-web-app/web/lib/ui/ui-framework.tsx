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

import { darkTheme, gameTheme, lightTheme } from './ui-framework-themes';
import { UIManager } from './ui-manager';
import { useState, useRef, useEffect, useContext, createContext, useCallback } from 'react';
import type { ReactNode, CSSProperties, MouseEvent } from 'react';
import type { DragData, ModalConfig, Theme } from './ui-framework.types';
export type {
  ContextMenuItem,
  DragData,
  DropResult,
  ModalConfig,
  Theme,
  ToastConfig,
  ToastPosition,
  TooltipConfig,
} from './ui-framework.types';
export { darkTheme, gameTheme, lightTheme } from './ui-framework-themes';
export { UIManager } from './ui-manager';

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
    const manager = managerRef.current;
    return () => {
      manager.dispose();
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

const __defaultExport = {
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

export default __defaultExport;
