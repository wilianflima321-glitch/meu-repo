/**
 * Aethel Toast System - Unified Notifications
 * Modern toast notifications with auto-dismiss and stacking
 */

'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { tokens } from '@/lib/design-tokens';

// ============================================================================
// TYPES
// ============================================================================

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  updateToast: (id: string, updates: Partial<Toast>) => void;
}

// ============================================================================
// CONTEXT
// ============================================================================

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

// ============================================================================
// PROVIDER
// ============================================================================

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>): string => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = { ...toast, id };
    
    setToasts((prev) => [...prev, newToast]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const updateToast = useCallback((id: string, updates: Partial<Toast>) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, updateToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

// ============================================================================
// TOAST CONTAINER
// ============================================================================

function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: Toast[];
  onRemove: (id: string) => void;
}) {
  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: tokens.spacing['6'],
    right: tokens.spacing['6'],
    zIndex: tokens.zIndex.toast,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing['3'],
    maxWidth: '400px',
    pointerEvents: 'none',
  };

  return (
    <div style={containerStyle}>
      {toasts.map((toast, index) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          index={index}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}

// ============================================================================
// TOAST ITEM
// ============================================================================

function ToastItem({
  toast,
  index,
  onRemove,
}: {
  toast: Toast;
  index: number;
  onRemove: (id: string) => void;
}) {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);

  const duration = toast.duration || 5000;

  useEffect(() => {
    if (duration === Infinity) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        handleDismiss();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [duration]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 300);
  };

  const typeStyles = {
    success: {
      borderColor: 'rgba(16, 185, 129, 0.4)',
      background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05))',
      iconColor: '#10b981',
      icon: '✓',
    },
    error: {
      borderColor: 'rgba(239, 68, 68, 0.4)',
      background: 'linear-gradient(180deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05))',
      iconColor: '#ef4444',
      icon: '✕',
    },
    warning: {
      borderColor: 'rgba(245, 158, 11, 0.4)',
      background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.05))',
      iconColor: '#f59e0b',
      icon: '!',
    },
    info: {
      borderColor: 'rgba(6, 182, 212, 0.4)',
      background: 'linear-gradient(180deg, rgba(6, 182, 212, 0.15), rgba(6, 182, 212, 0.05))',
      iconColor: '#06b6d4',
      icon: 'i',
    },
  };

  const style = typeStyles[toast.type];

  const containerStyle: React.CSSProperties = {
    pointerEvents: 'auto',
    padding: tokens.spacing['4'],
    background: style.background,
    backdropFilter: 'blur(12px)',
    border: `1px solid ${style.borderColor}`,
    borderRadius: tokens.radius.xl,
    boxShadow: tokens.effects.shadow.xl,
    display: 'flex',
    alignItems: 'flex-start',
    gap: tokens.spacing['3'],
    transform: isExiting ? 'translateX(100%)' : 'translateX(0)',
    opacity: isExiting ? 0 : 1,
    transition: `all ${tokens.animation.duration.normal} ${tokens.animation.easing.smooth}`,
  };

  const iconStyle: React.CSSProperties = {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: style.iconColor,
    color: tokens.colors.text.inverse,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 'bold',
    flexShrink: 0,
  };

  const contentStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: tokens.colors.text.primary,
    marginBottom: toast.title ? tokens.spacing['1'] : 0,
  };

  const messageStyle: React.CSSProperties = {
    fontSize: tokens.typography.fontSize.sm,
    color: tokens.colors.text.secondary,
    lineHeight: tokens.typography.lineHeight.relaxed,
  };

  const closeButtonStyle: React.CSSProperties = {
    padding: tokens.spacing['1'],
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: tokens.colors.text.muted,
    fontSize: '18px',
    lineHeight: 1,
    transition: `color ${tokens.animation.duration.fast}`,
  };

  const progressBarStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: '2px',
    width: `${progress}%`,
    backgroundColor: style.iconColor,
    transition: 'width 50ms linear',
    borderRadius: `0 0 0 ${tokens.radius.xl}`,
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={containerStyle}>
        <span style={iconStyle}>{style.icon}</span>
        <div style={contentStyle}>
          {toast.title && <div style={titleStyle}>{toast.title}</div>}
          <div style={messageStyle}>{toast.message}</div>
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              style={{
                marginTop: tokens.spacing['2'],
                padding: `${tokens.spacing['1']} ${tokens.spacing['3']}`,
                backgroundColor: style.iconColor,
                color: tokens.colors.text.inverse,
                border: 'none',
                borderRadius: tokens.radius.md,
                fontSize: tokens.typography.fontSize.xs,
                fontWeight: tokens.typography.fontWeight.medium,
                cursor: 'pointer',
                transition: `opacity ${tokens.animation.duration.fast}`,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              {toast.action.label}
            </button>
          )}
        </div>
        <button
          onClick={handleDismiss}
          style={closeButtonStyle}
          onMouseEnter={(e) => (e.currentTarget.style.color = tokens.colors.text.primary)}
          onMouseLeave={(e) => (e.currentTarget.style.color = tokens.colors.text.muted)}
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
      {duration !== Infinity && <div style={progressBarStyle} />}
    </div>
  );
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

export function useToastActions() {
  const { addToast, removeToast, updateToast } = useToast();

  const success = useCallback(
    (message: string, title?: string, duration?: number) => {
      return addToast({ type: 'success', message, title, duration });
    },
    [addToast]
  );

  const error = useCallback(
    (message: string, title?: string, duration?: number) => {
      return addToast({ type: 'error', message, title, duration });
    },
    [addToast]
  );

  const warning = useCallback(
    (message: string, title?: string, duration?: number) => {
      return addToast({ type: 'warning', message, title, duration });
    },
    [addToast]
  );

  const info = useCallback(
    (message: string, title?: string, duration?: number) => {
      return addToast({ type: 'info', message, title, duration });
    },
    [addToast]
  );

  const promise = useCallback(
    async <T,>(
      promise: Promise<T>,
      {
        loading,
        success,
        error,
      }: {
        loading: string;
        success: (data: T) => string;
        error: (err: Error) => string;
      }
    ): Promise<T> => {
      const id = addToast({
        type: 'info',
        message: loading,
        duration: Infinity,
      });

      try {
        const data = await promise;
        updateToast(id, {
          type: 'success',
          message: success(data),
          duration: 5000,
        });
        return data;
      } catch (err) {
        updateToast(id, {
          type: 'error',
          message: error(err as Error),
          duration: 5000,
        });
        throw err;
      }
    },
    [addToast, updateToast]
  );

  return {
    success,
    error,
    warning,
    info,
    promise,
    remove: removeToast,
    update: updateToast,
  };
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default ToastProvider;
