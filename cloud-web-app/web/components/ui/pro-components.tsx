/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AETHEL PRO COMPONENTS - Ultra Premium UI Components
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Professional-grade UI components that surpass:
 * - Adobe Creative Cloud
 * - Unreal Engine 5 Editor
 * - Unity 6 Editor
 * - DaVinci Resolve
 * - Blender 4
 * 
 * @version 4.0.0
 * @author Aethel Design Authority
 */

'use client';

import React, { forwardRef, useState, useRef, useEffect, useCallback, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AETHEL_COLORS, 
  AETHEL_SHADOWS, 
  AETHEL_ANIMATION, 
  AETHEL_RADIUS,
  AETHEL_TYPOGRAPHY,
  glassmorphism,
  withOpacity,
} from '@/lib/design/aethel-design-system';
import { 
  X, 
  ChevronDown, 
  ChevronRight, 
  Check, 
  Search, 
  Loader2,
  Info,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// BUTTON - AAA Grade
// ═══════════════════════════════════════════════════════════════════════════════

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'premium';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  glow?: boolean;
  fullWidth?: boolean;
}

const buttonStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: `linear-gradient(135deg, ${AETHEL_COLORS.accent.primary[500]} 0%, ${AETHEL_COLORS.accent.primary[600]} 100%)`,
    color: '#ffffff',
    border: 'none',
    boxShadow: AETHEL_SHADOWS.md,
  },
  secondary: {
    background: AETHEL_COLORS.bg.surface,
    color: AETHEL_COLORS.text.primary,
    border: `1px solid ${AETHEL_COLORS.border.default}`,
  },
  ghost: {
    background: 'transparent',
    color: AETHEL_COLORS.text.secondary,
    border: 'none',
  },
  danger: {
    background: `linear-gradient(135deg, ${AETHEL_COLORS.accent.error[500]} 0%, ${AETHEL_COLORS.accent.error[600]} 100%)`,
    color: '#ffffff',
    border: 'none',
  },
  success: {
    background: `linear-gradient(135deg, ${AETHEL_COLORS.accent.success[500]} 0%, ${AETHEL_COLORS.accent.success[600]} 100%)`,
    color: '#ffffff',
    border: 'none',
  },
  premium: {
    background: `linear-gradient(135deg, ${AETHEL_COLORS.accent.secondary[500]} 0%, ${AETHEL_COLORS.accent.primary[500]} 50%, ${AETHEL_COLORS.accent.tertiary[500]} 100%)`,
    color: '#ffffff',
    border: 'none',
    boxShadow: AETHEL_SHADOWS.glow.purple,
  },
};

const buttonSizes: Record<ButtonSize, { padding: string; fontSize: string; height: string }> = {
  xs: { padding: '0 8px', fontSize: AETHEL_TYPOGRAPHY.fontSize['2xs'], height: '24px' },
  sm: { padding: '0 12px', fontSize: AETHEL_TYPOGRAPHY.fontSize.xs, height: '28px' },
  md: { padding: '0 16px', fontSize: AETHEL_TYPOGRAPHY.fontSize.sm, height: '32px' },
  lg: { padding: '0 20px', fontSize: AETHEL_TYPOGRAPHY.fontSize.base, height: '40px' },
  xl: { padding: '0 28px', fontSize: AETHEL_TYPOGRAPHY.fontSize.md, height: '48px' },
};

export const ProButton = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  glow = false,
  fullWidth = false,
  children,
  disabled,
  className = '',
  style,
  ...props
}, ref) => {
  const sizeConfig = buttonSizes[size];
  const variantStyle = buttonStyles[variant];
  
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`aethel-pro-button ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        height: sizeConfig.height,
        padding: sizeConfig.padding,
        fontSize: sizeConfig.fontSize,
        fontWeight: 500,
        fontFamily: AETHEL_TYPOGRAPHY.fontFamily.ui,
        borderRadius: AETHEL_RADIUS.md,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: AETHEL_ANIMATION.transition.all,
        width: fullWidth ? '100%' : 'auto',
        outline: 'none',
        position: 'relative',
        overflow: 'hidden',
        ...variantStyle,
        ...(glow && { boxShadow: AETHEL_SHADOWS.glow.blue }),
        ...style,
      }}
      {...props}
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <>
          {icon && iconPosition === 'left' && icon}
          {children}
          {icon && iconPosition === 'right' && icon}
        </>
      )}
    </button>
  );
});
ProButton.displayName = 'ProButton';

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT - AAA Grade
// ═══════════════════════════════════════════════════════════════════════════════

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  inputSize?: 'sm' | 'md' | 'lg';
}

export const ProInput = forwardRef<HTMLInputElement, InputProps>(({
  label,
  hint,
  error,
  icon,
  rightIcon,
  inputSize = 'md',
  className = '',
  style,
  ...props
}, ref) => {
  const [focused, setFocused] = useState(false);
  
  const heights = { sm: '28px', md: '32px', lg: '40px' };
  
  return (
    <div className={`aethel-pro-input-wrapper ${className}`} style={{ width: '100%' }}>
      {label && (
        <label
          style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: AETHEL_TYPOGRAPHY.fontSize.xs,
            fontWeight: 500,
            color: AETHEL_COLORS.text.secondary,
          }}
        >
          {label}
        </label>
      )}
      
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {icon && (
          <span
            style={{
              position: 'absolute',
              left: '10px',
              color: AETHEL_COLORS.text.tertiary,
              pointerEvents: 'none',
            }}
          >
            {icon}
          </span>
        )}
        
        <input
          ref={ref}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%',
            height: heights[inputSize],
            padding: `0 ${rightIcon ? '36px' : '12px'} 0 ${icon ? '36px' : '12px'}`,
            fontSize: AETHEL_TYPOGRAPHY.fontSize.sm,
            fontFamily: AETHEL_TYPOGRAPHY.fontFamily.ui,
            color: AETHEL_COLORS.text.primary,
            background: AETHEL_COLORS.bg.base,
            border: `1px solid ${error ? AETHEL_COLORS.border.error : focused ? AETHEL_COLORS.border.focus : AETHEL_COLORS.border.default}`,
            borderRadius: AETHEL_RADIUS.md,
            outline: 'none',
            transition: AETHEL_ANIMATION.transition.all,
            boxShadow: focused ? AETHEL_SHADOWS.focus.default : 'none',
            ...style,
          }}
          {...props}
        />
        
        {rightIcon && (
          <span
            style={{
              position: 'absolute',
              right: '10px',
              color: AETHEL_COLORS.text.tertiary,
            }}
          >
            {rightIcon}
          </span>
        )}
      </div>
      
      {(hint || error) && (
        <p
          style={{
            marginTop: '4px',
            fontSize: AETHEL_TYPOGRAPHY.fontSize['2xs'],
            color: error ? AETHEL_COLORS.accent.error[400] : AETHEL_COLORS.text.tertiary,
          }}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
});
ProInput.displayName = 'ProInput';

// ═══════════════════════════════════════════════════════════════════════════════
// CARD - AAA Grade with Glassmorphism
// ═══════════════════════════════════════════════════════════════════════════════

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'glass' | 'glow';
  glowColor?: 'blue' | 'purple' | 'cyan' | 'green' | 'amber' | 'red';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

export const ProCard = forwardRef<HTMLDivElement, CardProps>(({
  variant = 'default',
  glowColor = 'blue',
  padding = 'md',
  hover = false,
  children,
  className = '',
  style,
  ...props
}, ref) => {
  const paddings = { none: '0', sm: '12px', md: '16px', lg: '24px' };
  
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'elevated':
        return {
          background: AETHEL_COLORS.bg.surface,
          boxShadow: AETHEL_SHADOWS.lg,
        };
      case 'glass':
        return glassmorphism('medium') as React.CSSProperties;
      case 'glow':
        return {
          background: AETHEL_COLORS.bg.surface,
          boxShadow: AETHEL_SHADOWS.glow[glowColor],
          border: `1px solid ${withOpacity(AETHEL_COLORS.accent[glowColor === 'blue' ? 'primary' : glowColor === 'purple' ? 'secondary' : glowColor === 'cyan' ? 'tertiary' : glowColor === 'green' ? 'success' : glowColor === 'amber' ? 'warning' : 'error'][500], 0.3)}`,
        };
      default:
        return {
          background: AETHEL_COLORS.bg.surface,
        };
    }
  };
  
  return (
    <div
      ref={ref}
      className={`aethel-pro-card ${className}`}
      style={{
        padding: paddings[padding],
        borderRadius: AETHEL_RADIUS.lg,
        border: `1px solid ${AETHEL_COLORS.border.subtle}`,
        transition: AETHEL_ANIMATION.transition.all,
        ...getVariantStyles(),
        ...(hover && {
          cursor: 'pointer',
        }),
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
});
ProCard.displayName = 'ProCard';

// ═══════════════════════════════════════════════════════════════════════════════
// BADGE - AAA Grade
// ═══════════════════════════════════════════════════════════════════════════════

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'premium';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  pulse?: boolean;
}

export const ProBadge = forwardRef<HTMLSpanElement, BadgeProps>(({
  variant = 'default',
  size = 'md',
  dot = false,
  pulse = false,
  children,
  className = '',
  style,
  ...props
}, ref) => {
  const sizes = {
    sm: { padding: '2px 6px', fontSize: '10px' },
    md: { padding: '3px 8px', fontSize: '11px' },
    lg: { padding: '4px 10px', fontSize: '12px' },
  };
  
  const variants: Record<string, { bg: string; text: string; border?: string }> = {
    default: { bg: AETHEL_COLORS.bg.hover, text: AETHEL_COLORS.text.secondary },
    primary: { bg: withOpacity(AETHEL_COLORS.accent.primary[500], 0.2), text: AETHEL_COLORS.accent.primary[400] },
    secondary: { bg: withOpacity(AETHEL_COLORS.accent.secondary[500], 0.2), text: AETHEL_COLORS.accent.secondary[400] },
    success: { bg: withOpacity(AETHEL_COLORS.accent.success[500], 0.2), text: AETHEL_COLORS.accent.success[400] },
    warning: { bg: withOpacity(AETHEL_COLORS.accent.warning[500], 0.2), text: AETHEL_COLORS.accent.warning[400] },
    error: { bg: withOpacity(AETHEL_COLORS.accent.error[500], 0.2), text: AETHEL_COLORS.accent.error[400] },
    premium: {
      bg: `linear-gradient(135deg, ${withOpacity(AETHEL_COLORS.accent.secondary[500], 0.3)} 0%, ${withOpacity(AETHEL_COLORS.accent.primary[500], 0.3)} 100%)`,
      text: AETHEL_COLORS.accent.secondary[300],
      border: `1px solid ${withOpacity(AETHEL_COLORS.accent.secondary[500], 0.4)}`,
    },
  };
  
  const v = variants[variant];
  
  return (
    <span
      ref={ref}
      className={`aethel-pro-badge ${pulse ? 'animate-pulse' : ''} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: sizes[size].padding,
        fontSize: sizes[size].fontSize,
        fontWeight: 600,
        fontFamily: AETHEL_TYPOGRAPHY.fontFamily.ui,
        letterSpacing: '0.02em',
        textTransform: 'uppercase',
        background: v.bg,
        color: v.text,
        border: v.border || 'none',
        borderRadius: AETHEL_RADIUS.full,
        whiteSpace: 'nowrap',
        ...style,
      }}
      {...props}
    >
      {dot && (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: v.text,
          }}
        />
      )}
      {children}
    </span>
  );
});
ProBadge.displayName = 'ProBadge';

// ═══════════════════════════════════════════════════════════════════════════════
// TOOLTIP - AAA Grade
// ═══════════════════════════════════════════════════════════════════════════════

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  arrow?: boolean;
}

export const ProTooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  delay = 200,
  arrow = true,
}) => {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef<NodeJS.Timeout>();
  const triggerRef = useRef<HTMLElement>(null);
  
  const showTooltip = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        let x = rect.left + rect.width / 2;
        let y = rect.top;
        
        switch (position) {
          case 'bottom':
            y = rect.bottom + 8;
            break;
          case 'left':
            x = rect.left - 8;
            y = rect.top + rect.height / 2;
            break;
          case 'right':
            x = rect.right + 8;
            y = rect.top + rect.height / 2;
            break;
          default:
            y = rect.top - 8;
        }
        
        setCoords({ x, y });
        setVisible(true);
      }
    }, delay);
  }, [delay, position]);
  
  const hideTooltip = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  }, []);
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);
  
  const positionStyles: Record<string, React.CSSProperties> = {
    top: { bottom: '100%', left: '50%', transform: 'translateX(-50%) translateY(-8px)' },
    bottom: { top: '100%', left: '50%', transform: 'translateX(-50%) translateY(8px)' },
    left: { right: '100%', top: '50%', transform: 'translateY(-50%) translateX(-8px)' },
    right: { left: '100%', top: '50%', transform: 'translateY(-50%) translateX(8px)' },
  };
  
  return (
    <>
      {React.cloneElement(children, {
        ref: triggerRef,
        onMouseEnter: showTooltip,
        onMouseLeave: hideTooltip,
        onFocus: showTooltip,
        onBlur: hideTooltip,
      })}
      
      {visible && typeof window !== 'undefined' && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'fixed',
              left: coords.x,
              top: coords.y,
              ...positionStyles[position],
              zIndex: 9999,
              padding: '6px 10px',
              fontSize: AETHEL_TYPOGRAPHY.fontSize['2xs'],
              fontFamily: AETHEL_TYPOGRAPHY.fontFamily.ui,
              color: AETHEL_COLORS.text.primary,
              background: AETHEL_COLORS.bg.overlay,
              border: `1px solid ${AETHEL_COLORS.border.default}`,
              borderRadius: AETHEL_RADIUS.md,
              boxShadow: AETHEL_SHADOWS.lg,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              maxWidth: '300px',
            }}
          >
            {content}
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDER - AAA Grade
// ═══════════════════════════════════════════════════════════════════════════════

interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  showValue?: boolean;
  formatValue?: (value: number) => string;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
}

export const ProSlider: React.FC<SliderProps> = ({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  showValue = true,
  formatValue = (v) => v.toString(),
  color = 'primary',
}) => {
  const colors = {
    primary: AETHEL_COLORS.accent.primary[500],
    secondary: AETHEL_COLORS.accent.secondary[500],
    success: AETHEL_COLORS.accent.success[500],
    warning: AETHEL_COLORS.accent.warning[500],
    error: AETHEL_COLORS.accent.error[500],
  };
  
  const percentage = ((value - min) / (max - min)) * 100;
  
  return (
    <div style={{ width: '100%' }}>
      {(label || showValue) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '6px',
          }}
        >
          {label && (
            <span
              style={{
                fontSize: AETHEL_TYPOGRAPHY.fontSize.xs,
                fontWeight: 500,
                color: AETHEL_COLORS.text.secondary,
              }}
            >
              {label}
            </span>
          )}
          {showValue && (
            <span
              style={{
                fontSize: AETHEL_TYPOGRAPHY.fontSize.xs,
                fontFamily: AETHEL_TYPOGRAPHY.fontFamily.mono,
                color: AETHEL_COLORS.text.tertiary,
              }}
            >
              {formatValue(value)}
            </span>
          )}
        </div>
      )}
      
      <div
        style={{
          position: 'relative',
          height: '20px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: '100%',
            height: '4px',
            background: AETHEL_COLORS.bg.hover,
            borderRadius: AETHEL_RADIUS.full,
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: `${percentage}%`,
            height: '4px',
            background: colors[color],
            borderRadius: AETHEL_RADIUS.full,
          }}
        />
        <input
          type="range"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          min={min}
          max={max}
          step={step}
          style={{
            position: 'absolute',
            width: '100%',
            height: '20px',
            opacity: 0,
            cursor: 'pointer',
            margin: 0,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: `calc(${percentage}% - 8px)`,
            width: '16px',
            height: '16px',
            background: colors[color],
            borderRadius: '50%',
            boxShadow: `0 0 8px ${withOpacity(colors[color], 0.5)}`,
            pointerEvents: 'none',
            transition: 'box-shadow 150ms ease',
          }}
        />
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ALERT/NOTIFICATION - AAA Grade
// ═══════════════════════════════════════════════════════════════════════════════

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  icon?: boolean;
}

export const ProAlert = forwardRef<HTMLDivElement, AlertProps>(({
  variant = 'info',
  title,
  dismissible = false,
  onDismiss,
  icon = true,
  children,
  className = '',
  style,
  ...props
}, ref) => {
  const configs = {
    info: {
      bg: withOpacity(AETHEL_COLORS.accent.primary[500], 0.1),
      border: withOpacity(AETHEL_COLORS.accent.primary[500], 0.3),
      text: AETHEL_COLORS.accent.primary[400],
      icon: <Info size={18} />,
    },
    success: {
      bg: withOpacity(AETHEL_COLORS.accent.success[500], 0.1),
      border: withOpacity(AETHEL_COLORS.accent.success[500], 0.3),
      text: AETHEL_COLORS.accent.success[400],
      icon: <CheckCircle size={18} />,
    },
    warning: {
      bg: withOpacity(AETHEL_COLORS.accent.warning[500], 0.1),
      border: withOpacity(AETHEL_COLORS.accent.warning[500], 0.3),
      text: AETHEL_COLORS.accent.warning[400],
      icon: <AlertTriangle size={18} />,
    },
    error: {
      bg: withOpacity(AETHEL_COLORS.accent.error[500], 0.1),
      border: withOpacity(AETHEL_COLORS.accent.error[500], 0.3),
      text: AETHEL_COLORS.accent.error[400],
      icon: <AlertCircle size={18} />,
    },
  };
  
  const config = configs[variant];
  
  return (
    <div
      ref={ref}
      className={`aethel-pro-alert ${className}`}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '12px 16px',
        background: config.bg,
        border: `1px solid ${config.border}`,
        borderRadius: AETHEL_RADIUS.lg,
        ...style,
      }}
      role="alert"
      {...props}
    >
      {icon && (
        <span style={{ color: config.text, flexShrink: 0, marginTop: '1px' }}>
          {config.icon}
        </span>
      )}
      
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && (
          <div
            style={{
              fontSize: AETHEL_TYPOGRAPHY.fontSize.sm,
              fontWeight: 600,
              color: config.text,
              marginBottom: '4px',
            }}
          >
            {title}
          </div>
        )}
        <div
          style={{
            fontSize: AETHEL_TYPOGRAPHY.fontSize.sm,
            color: AETHEL_COLORS.text.secondary,
          }}
        >
          {children}
        </div>
      </div>
      
      {dismissible && (
        <button
          onClick={onDismiss}
          style={{
            padding: '4px',
            background: 'transparent',
            border: 'none',
            color: AETHEL_COLORS.text.tertiary,
            cursor: 'pointer',
            borderRadius: AETHEL_RADIUS.sm,
            transition: AETHEL_ANIMATION.transition.colors,
          }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
});
ProAlert.displayName = 'ProAlert';

// ═══════════════════════════════════════════════════════════════════════════════
// PROGRESS BAR - AAA Grade
// ═══════════════════════════════════════════════════════════════════════════════

interface ProgressProps {
  value: number;
  max?: number;
  variant?: 'default' | 'gradient' | 'striped' | 'animated';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  showValue?: boolean;
}

export const ProProgress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  variant = 'default',
  color = 'primary',
  size = 'md',
  label,
  showValue = true,
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  const heights = { sm: '4px', md: '8px', lg: '12px' };
  
  const colors = {
    primary: AETHEL_COLORS.accent.primary[500],
    secondary: AETHEL_COLORS.accent.secondary[500],
    success: AETHEL_COLORS.accent.success[500],
    warning: AETHEL_COLORS.accent.warning[500],
    error: AETHEL_COLORS.accent.error[500],
  };
  
  const getBackground = () => {
    const baseColor = colors[color];
    switch (variant) {
      case 'gradient':
        return `linear-gradient(90deg, ${baseColor} 0%, ${AETHEL_COLORS.accent.tertiary[500]} 100%)`;
      case 'striped':
      case 'animated':
        return `repeating-linear-gradient(
          45deg,
          ${baseColor},
          ${baseColor} 10px,
          ${withOpacity(baseColor, 0.7)} 10px,
          ${withOpacity(baseColor, 0.7)} 20px
        )`;
      default:
        return baseColor;
    }
  };
  
  return (
    <div style={{ width: '100%' }}>
      {(label || showValue) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '6px',
          }}
        >
          {label && (
            <span
              style={{
                fontSize: AETHEL_TYPOGRAPHY.fontSize.xs,
                color: AETHEL_COLORS.text.secondary,
              }}
            >
              {label}
            </span>
          )}
          {showValue && (
            <span
              style={{
                fontSize: AETHEL_TYPOGRAPHY.fontSize.xs,
                fontFamily: AETHEL_TYPOGRAPHY.fontFamily.mono,
                color: AETHEL_COLORS.text.tertiary,
              }}
            >
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      
      <div
        style={{
          width: '100%',
          height: heights[size],
          background: AETHEL_COLORS.bg.hover,
          borderRadius: AETHEL_RADIUS.full,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: '100%',
            background: getBackground(),
            borderRadius: AETHEL_RADIUS.full,
            transition: 'width 300ms ease-out',
            ...(variant === 'animated' && {
              backgroundSize: '40px 40px',
              animation: 'progress-stripes 1s linear infinite',
            }),
          }}
        />
      </div>
      
      <style>{`
        @keyframes progress-stripes {
          0% { background-position: 40px 0; }
          100% { background-position: 0 0; }
        }
      `}</style>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TABS - AAA Grade
// ═══════════════════════════════════════════════════════════════════════════════

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (id: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

interface TabsProps {
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export const ProTabs: React.FC<TabsProps> = ({
  defaultValue,
  value,
  onChange,
  children,
  className = '',
}) => {
  const [internalValue, setInternalValue] = useState(defaultValue || '');
  const activeTab = value !== undefined ? value : internalValue;
  
  const setActiveTab = useCallback((id: string) => {
    if (value === undefined) {
      setInternalValue(id);
    }
    onChange?.(id);
  }, [value, onChange]);
  
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
};

interface TabListProps {
  children: React.ReactNode;
  className?: string;
}

export const ProTabList: React.FC<TabListProps> = ({ children, className = '' }) => {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        gap: '2px',
        padding: '2px',
        background: AETHEL_COLORS.bg.elevated,
        borderRadius: AETHEL_RADIUS.lg,
        border: `1px solid ${AETHEL_COLORS.border.subtle}`,
      }}
      role="tablist"
    >
      {children}
    </div>
  );
};

interface TabTriggerProps {
  value: string;
  children: React.ReactNode;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export const ProTabTrigger: React.FC<TabTriggerProps> = ({
  value,
  children,
  disabled = false,
  icon,
}) => {
  const context = useContext(TabsContext);
  if (!context) throw new Error('ProTabTrigger must be used within ProTabs');
  
  const isActive = context.activeTab === value;
  
  return (
    <button
      role="tab"
      aria-selected={isActive}
      disabled={disabled}
      onClick={() => context.setActiveTab(value)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 14px',
        fontSize: AETHEL_TYPOGRAPHY.fontSize.sm,
        fontWeight: 500,
        fontFamily: AETHEL_TYPOGRAPHY.fontFamily.ui,
        color: isActive ? AETHEL_COLORS.text.primary : AETHEL_COLORS.text.secondary,
        background: isActive ? AETHEL_COLORS.bg.surface : 'transparent',
        border: 'none',
        borderRadius: AETHEL_RADIUS.md,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: AETHEL_ANIMATION.transition.all,
        boxShadow: isActive ? AETHEL_SHADOWS.sm : 'none',
      }}
    >
      {icon}
      {children}
    </button>
  );
};

interface TabContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export const ProTabContent: React.FC<TabContentProps> = ({
  value,
  children,
  className = '',
}) => {
  const context = useContext(TabsContext);
  if (!context) throw new Error('ProTabContent must be used within ProTabs');
  
  if (context.activeTab !== value) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={className}
      role="tabpanel"
    >
      {children}
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SKELETON LOADER - AAA Grade
// ═══════════════════════════════════════════════════════════════════════════════

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  animation?: 'pulse' | 'wave' | 'none';
  className?: string;
}

export const ProSkeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '20px',
  variant = 'text',
  animation = 'pulse',
  className = '',
}) => {
  const borderRadius = variant === 'circular' ? '50%' : variant === 'rounded' ? AETHEL_RADIUS.lg : AETHEL_RADIUS.sm;
  
  return (
    <div
      className={`aethel-skeleton ${animation === 'pulse' ? 'animate-pulse' : ''} ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius,
        background: animation === 'wave'
          ? `linear-gradient(90deg, ${AETHEL_COLORS.bg.hover} 25%, ${AETHEL_COLORS.bg.active} 50%, ${AETHEL_COLORS.bg.hover} 75%)`
          : AETHEL_COLORS.bg.hover,
        backgroundSize: animation === 'wave' ? '200% 100%' : undefined,
        animation: animation === 'wave' ? 'shimmer 1.5s infinite' : undefined,
      }}
    />
  );
};

// Types are already exported inline above
