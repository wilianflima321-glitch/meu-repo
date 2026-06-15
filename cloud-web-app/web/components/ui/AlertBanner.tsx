'use client';

/**
 * AlertBanner — Frente A6
 * 
 * Componentized alert banners for Dashboard/IDE error states.
 * Uses pure Aethel design tokens. No hardcoded colors.
 */

import React, { useState, type ReactNode } from 'react';
import { AlertTriangle, Info, CheckCircle, XCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type AlertVariant = 'error' | 'warning' | 'info' | 'success';

interface AlertBannerProps {
  variant: AlertVariant;
  title?: string;
  children: ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  icon?: ReactNode;
  className?: string;
  actions?: ReactNode;
}

const VARIANT_CONFIG: Record<AlertVariant, {
  icon: React.ElementType;
  containerClass: string;
  iconClass: string;
  titleClass: string;
  textClass: string;
  borderClass: string;
  dismissClass: string;
}> = {
  error: {
    icon: XCircle,
    containerClass: 'bg-[color-mix(in_srgb,var(--aethel-error)_8%,transparent)]',
    iconClass: 'text-[var(--aethel-error-light)]',
    titleClass: 'text-[var(--aethel-error-light)]',
    textClass: 'text-[var(--aethel-text-secondary)]',
    borderClass: 'border-[color-mix(in_srgb,var(--aethel-error)_25%,transparent)]',
    dismissClass: 'hover:bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)]',
  },
  warning: {
    icon: AlertTriangle,
    containerClass: 'bg-[color-mix(in_srgb,var(--aethel-warning)_8%,transparent)]',
    iconClass: 'text-[var(--aethel-warning-light)]',
    titleClass: 'text-[var(--aethel-warning-light)]',
    textClass: 'text-[var(--aethel-text-secondary)]',
    borderClass: 'border-[color-mix(in_srgb,var(--aethel-warning)_25%,transparent)]',
    dismissClass: 'hover:bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)]',
  },
  info: {
    icon: Info,
    containerClass: 'bg-[color-mix(in_srgb,var(--aethel-info)_8%,transparent)]',
    iconClass: 'text-[var(--aethel-info-light)]',
    titleClass: 'text-[var(--aethel-info-light)]',
    textClass: 'text-[var(--aethel-text-secondary)]',
    borderClass: 'border-[color-mix(in_srgb,var(--aethel-info)_25%,transparent)]',
    dismissClass: 'hover:bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)]',
  },
  success: {
    icon: CheckCircle,
    containerClass: 'bg-[color-mix(in_srgb,var(--aethel-success)_8%,transparent)]',
    iconClass: 'text-[var(--aethel-success-light)]',
    titleClass: 'text-[var(--aethel-success-light)]',
    textClass: 'text-[var(--aethel-text-secondary)]',
    borderClass: 'border-[color-mix(in_srgb,var(--aethel-success)_25%,transparent)]',
    dismissClass: 'hover:bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)]',
  },
};

export function AlertBanner({
  variant,
  title,
  children,
  dismissible = false,
  onDismiss,
  icon,
  className,
  actions,
}: AlertBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const config = VARIANT_CONFIG[variant];
  const IconComponent = config.icon;

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'flex items-start gap-3 rounded-xl border p-4',
        'transition-all duration-200',
        config.containerClass,
        config.borderClass,
        className
      )}
    >
      {/* Icon */}
      <div className={cn('flex-shrink-0 mt-0.5', config.iconClass)}>
        {icon || <IconComponent className="h-5 w-5" strokeWidth={1.5} />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {title && (
          <p className={cn('text-sm font-medium mb-0.5', config.titleClass)}>
            {title}
          </p>
        )}
        <div className={cn('text-sm leading-relaxed', config.textClass)}>
          {children}
        </div>
        {actions && (
          <div className="mt-3 flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>

      {/* Dismiss button */}
      {dismissible && (
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss alert"
          className={cn(
            'flex-shrink-0 p-1 rounded-md',
            'text-[var(--aethel-text-tertiary)]',
            'transition-colors duration-150',
            config.dismissClass
          )}
        >
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>
      )}
    </div>
  );
}

/**
 * Compact variant for inline/toolbar alerts
 */
export function AlertBannerCompact({
  variant,
  children,
  className,
}: {
  variant: AlertVariant;
  children: ReactNode;
  className?: string;
}) {
  const config = VARIANT_CONFIG[variant];
  const IconComponent = config.icon;

  return (
    <div
      role="alert"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-1',
        'text-xs',
        config.containerClass,
        config.borderClass,
        className
      )}
    >
      <IconComponent className={cn('h-3.5 w-3.5', config.iconClass)} strokeWidth={1.5} />
      <span className={config.textClass}>{children}</span>
    </div>
  );
}

export default AlertBanner;
