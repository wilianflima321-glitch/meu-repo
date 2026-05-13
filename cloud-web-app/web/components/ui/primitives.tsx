'use client';

/**
 * Aethel UI Primitives
 * Low-level UI components using unified design tokens
 */
import React from 'react';
import { tokens, gradients, presets } from '@/lib/design-tokens';

// ============================================================================
// GLASS PANEL - Container principal com efeito glassmorphism
// ============================================================================

interface GlassPanelProps {
  children: React.ReactNode;
  variant?: 'subtle' | 'medium' | 'strong';
  glow?: 'none' | 'cyan' | 'emerald' | 'indigo';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

export function GlassPanel({
  children,
  variant = 'medium',
  glow = 'none',
  padding = 'md',
  style: customStyle,
  className = '',
  as: Component = 'div',
}: GlassPanelProps) {
  const gradientMap = {
    subtle: gradients.glassSubtle,
    medium: gradients.glassMedium,
    strong: gradients.glassStrong,
  };

  const glowMap = {
    none: 'none',
    cyan: tokens.effects.glow.cyan,
    emerald: tokens.effects.glow.emerald,
    indigo: tokens.effects.glow.indigo,
  };

  const paddingMap = {
    none: '0',
    sm: tokens.spacing['4'],
    md: tokens.spacing['6'],
    lg: tokens.spacing['8'],
  };

  const style: React.CSSProperties = {
    background: gradientMap[variant],
    border: `1px solid ${tokens.colors.border.light}`,
    borderRadius: tokens.radius['2xl'],
    boxShadow: glow !== 'none' ? glowMap[glow] : tokens.effects.shadow.panel,
    padding: paddingMap[padding],
    backdropFilter: 'blur(12px)',
    ...customStyle,
  };

  return React.createElement(Component, { style, className }, children);
}

// ============================================================================
// GLOW BADGE - Badge com efeito glow para status e labels
// ============================================================================

interface GlowBadgeProps {
  children: React.ReactNode;
  color?: 'cyan' | 'emerald' | 'indigo' | 'violet' | 'amber' | 'rose';
  size?: 'sm' | 'md';
  className?: string;
}

export function GlowBadge({
  children,
  color = 'cyan',
  size = 'sm',
  className = '',
}: GlowBadgeProps) {
  const colorMap = {
    cyan: { bg: 'rgba(6, 182, 212, 0.15)', border: 'rgba(6, 182, 212, 0.35)', text: 'var(--aethel-info-light)' },
    emerald: { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.35)', text: 'var(--aethel-success-light)' },
    indigo: { bg: 'rgba(99, 102, 241, 0.15)', border: 'rgba(99, 102, 241, 0.35)', text: 'var(--aethel-primary-light)' },
    violet: { bg: 'rgba(139, 92, 246, 0.15)', border: 'rgba(139, 92, 246, 0.35)', text: 'var(--aethel-accent-light)' },
    amber: { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.35)', text: 'var(--aethel-warning-light)' },
    rose: { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.35)', text: 'var(--aethel-error-light)' },
  };

  const sizeMap = {
    sm: { padding: `${tokens.spacing['1']} ${tokens.spacing['3']}`, fontSize: tokens.typography.fontSize.xs },
    md: { padding: `${tokens.spacing['2']} ${tokens.spacing['4']}`, fontSize: tokens.typography.fontSize.sm },
  };

  const colors = colorMap[color];
  const sizing = sizeMap[size];

  const style: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacing['2'],
    padding: sizing.padding,
    fontSize: sizing.fontSize,
    fontWeight: tokens.typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: '0.15em',
    color: colors.text,
    backgroundColor: colors.bg,
    border: `1px solid ${colors.border}`,
    borderRadius: tokens.radius.full,
    transition: `all ${tokens.animation.duration.fast} ${tokens.animation.easing.smooth}`,
  };

  return (
    <span style={style} className={className}>
      {children}
    </span>
  );
}

// ============================================================================
// AETHEL BUTTON - Botão com variants consistentes
// ============================================================================

interface AethelButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  glow?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

export function AethelButton({
  variant = 'primary',
  size = 'md',
  glow = false,
  loading = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  type,
  style: userStyle,
  ...props
}: AethelButtonProps) {
  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing['2'],
    fontFamily: tokens.typography.fontFamily.sans,
    fontWeight: tokens.typography.fontWeight.semibold,
    border: 'none',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled || loading ? 0.5 : 1,
    transition: `all ${tokens.animation.duration.fast} ${tokens.animation.easing.smooth}`,
  };

  const sizeMap = {
    sm: { padding: `${tokens.spacing['2']} ${tokens.spacing['3']}`, fontSize: tokens.typography.fontSize.xs, borderRadius: tokens.radius.md },
    md: { padding: `${tokens.spacing['3']} ${tokens.spacing['4']}`, fontSize: tokens.typography.fontSize.sm, borderRadius: tokens.radius.lg },
    lg: { padding: `${tokens.spacing['4']} ${tokens.spacing['6']}`, fontSize: tokens.typography.fontSize.base, borderRadius: tokens.radius.xl },
  };

  const variantMap = {
    primary: {
      background: gradients.brand,
      color: tokens.colors.text.primary,
      boxShadow: glow ? tokens.effects.glow.indigo : 'none',
    },
    secondary: {
      background: tokens.colors.bg.elevated,
      color: tokens.colors.text.primary,
      border: `1px solid ${tokens.colors.border.light}`,
    },
    ghost: {
      background: 'transparent',
      color: tokens.colors.text.secondary,
      border: `1px solid ${tokens.colors.border.light}`,
    },
    danger: {
      background: 'rgba(239, 68, 68, 0.9)',
      color: tokens.colors.text.primary,
    },
  };

  const sizing = sizeMap[size];
  const variantStyle = variantMap[variant];

  const style: React.CSSProperties = {
    ...baseStyles,
    ...sizing,
    ...variantStyle,
    ...userStyle,
  };

  return (
    <button type={type ?? 'button'} style={style} disabled={disabled || loading} {...props}>
      {loading && (
        <span
          style={{
            width: '1em',
            height: '1em',
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: `spin 1s linear infinite`,
          }}
        />
      )}
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  );
}

// ============================================================================
// AETHEL INPUT - Input field consistente
// ============================================================================

interface AethelInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function AethelInput({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  style: userStyle,
  ...props
}: AethelInputProps) {
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing['1.5'],
  };

  const labelStyle: React.CSSProperties = {
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: tokens.typography.fontWeight.medium,
    color: tokens.colors.text.secondary,
  };

  const inputWrapperStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing['3'],
    padding: `${tokens.spacing['3']} ${tokens.spacing['4']}`,
    backgroundColor: tokens.colors.bg.primary,
    border: `1px solid ${error ? tokens.colors.status.error : tokens.colors.border.light}`,
    borderRadius: tokens.radius.lg,
    transition: `all ${tokens.animation.duration.fast} ${tokens.animation.easing.smooth}`,
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: tokens.colors.text.primary,
    fontSize: tokens.typography.fontSize.sm,
    fontFamily: tokens.typography.fontFamily.sans,
  };

  const helperStyle: React.CSSProperties = {
    fontSize: tokens.typography.fontSize.xs,
    color: error ? tokens.colors.status.error : tokens.colors.text.muted,
  };

  return (
    <div style={containerStyle}>
      {label && <label style={labelStyle}>{label}</label>}
      <div style={inputWrapperStyle}>
        {leftIcon}
        <input style={inputStyle} {...props} />
        {rightIcon}
      </div>
      {(error || hint) && (
        <span style={helperStyle}>{error || hint}</span>
      )}
    </div>
  );
}

// ============================================================================
// SKELETON - Loading states consistentes
// ============================================================================

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  circle?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export function Skeleton({
  width = '100%',
  height = '1rem',
  circle = false,
  className = '',
  style: customStyle,
}: SkeletonProps) {
  const style: React.CSSProperties = {
    width,
    height,
    backgroundColor: tokens.colors.bg.elevated,
    borderRadius: circle ? '50%' : tokens.radius.md,
    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    ...customStyle,
  };

  return <div style={style} className={className} />;
}

// ============================================================================
// STATUS INDICATOR - Indicador visual de status
// ============================================================================

interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'busy' | 'away' | 'error';
  label?: string;
  pulse?: boolean;
}

export function StatusIndicator({
  status,
  label,
  pulse = false,
}: StatusIndicatorProps) {
  const colorMap = {
    online: tokens.colors.status.success,
    offline: tokens.colors.text.muted,
    busy: tokens.colors.status.warning,
    away: tokens.colors.accent.amber,
    error: tokens.colors.status.error,
  };

  const dotStyle: React.CSSProperties = {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: colorMap[status],
    animation: pulse ? 'pulse 2s infinite' : undefined,
  };

  const containerStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacing['2'],
  };

  const labelStyle: React.CSSProperties = {
    fontSize: tokens.typography.fontSize.xs,
    color: tokens.colors.text.muted,
  };

  return (
    <span style={containerStyle}>
      <span style={dotStyle} />
      {label && <span style={labelStyle}>{label}</span>}
    </span>
  );
}

// ============================================================================
// DIVIDER - Separador visual
// ============================================================================

interface DividerProps {
  label?: string;
  vertical?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function Divider({ label, vertical = false, className = '', style: customStyle }: DividerProps) {
  const baseStyle: React.CSSProperties = {
    backgroundColor: tokens.colors.border.light,
    ...customStyle,
  };

  if (vertical) {
    return (
      <div
        style={{
          ...baseStyle,
          width: '1px',
          alignSelf: 'stretch',
        }}
        className={className}
      />
    );
  }

  if (label) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: tokens.spacing['4'],
        }}
        className={className}
      >
        <div style={{ ...baseStyle, height: '1px', flex: 1 }} />
        <span
          style={{
            fontSize: tokens.typography.fontSize.xs,
            color: tokens.colors.text.muted,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          {label}
        </span>
        <div style={{ ...baseStyle, height: '1px', flex: 1 }} />
      </div>
    );
  }

  return (
    <div
      style={{ ...baseStyle, height: '1px', width: '100%' }}
      className={className}
    />
  );
}

// ============================================================================
// TOOLTIP - Dica contextual
// ============================================================================

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({
  children,
  content,
  position = 'top',
}: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false);

  const wrapperStyle: React.CSSProperties = {
    position: 'relative',
    display: 'inline-block',
  };

  const tooltipStyle: React.CSSProperties = {
    position: 'absolute',
    padding: `${tokens.spacing['2']} ${tokens.spacing['3']}`,
    backgroundColor: tokens.colors.bg.elevated,
    color: tokens.colors.text.primary,
    fontSize: tokens.typography.fontSize.xs,
    borderRadius: tokens.radius.md,
    border: `1px solid ${tokens.colors.border.light}`,
    boxShadow: tokens.effects.shadow.lg,
    whiteSpace: 'nowrap',
    zIndex: tokens.zIndex.tooltip,
    opacity: isVisible ? 1 : 0,
    visibility: isVisible ? 'visible' : 'hidden',
    transition: `opacity ${tokens.animation.duration.fast} ${tokens.animation.easing.smooth}`,
    ...getTooltipPosition(position),
  };

  function getTooltipPosition(pos: string): React.CSSProperties {
    switch (pos) {
      case 'top':
        return { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: tokens.spacing['2'] };
      case 'bottom':
        return { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: tokens.spacing['2'] };
      case 'left':
        return { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: tokens.spacing['2'] };
      case 'right':
        return { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: tokens.spacing['2'] };
      default:
        return {};
    }
  }

  return (
    <span
      style={wrapperStyle}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      <span style={tooltipStyle}>{content}</span>
    </span>
  );
}

// ============================================================================
// EXPORT ALL
// ============================================================================

export {
  tokens,
  gradients,
  presets,
} from '@/lib/design-tokens';
