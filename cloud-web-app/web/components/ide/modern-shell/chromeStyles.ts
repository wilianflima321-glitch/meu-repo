import type { CSSProperties } from 'react';
import { gradients, tokens } from '@/lib/design-tokens';

export const chromeBarPadding = `${tokens.spacing['2']} ${tokens.spacing['4']}`;
export const chromeBarHeight = '48px';
export const SURFACE_PRIMARY = 'var(--aethel-surface-primary)';
export const SURFACE_SECONDARY = 'var(--aethel-surface-secondary)';
export const TEXT_PRIMARY = 'var(--aethel-text-primary)';
export const TEXT_SECONDARY = 'var(--aethel-text-secondary)';
export const TEXT_TERTIARY = 'var(--aethel-text-tertiary)';
export const BORDER_PRIMARY = 'var(--aethel-border-primary)';
export const BORDER_SECONDARY = 'var(--aethel-border-secondary)';
export const STATUS_SUCCESS = 'var(--aethel-success)';
export const STATUS_WARNING = 'var(--aethel-warning)';
export const STATUS_ERROR = 'var(--aethel-error)';
export const ACCENT_CYAN = 'var(--aethel-info)';

export const HEADER_ACTION_BUTTON: CSSProperties = {
  minHeight: '36px',
  padding: `${tokens.spacing['2']} ${tokens.spacing['3']}`,
  background: 'color-mix(in srgb, var(--aethel-surface-secondary) 52%, transparent)',
  border: `1px solid ${BORDER_SECONDARY}`,
  borderRadius: tokens.radius.md,
  color: TEXT_SECONDARY,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: tokens.spacing['2'],
  fontSize: tokens.typography.fontSize.xs,
  fontWeight: tokens.typography.fontWeight.medium,
  transition: `all ${tokens.animation.duration.fast} ${tokens.animation.easing.default}`,
};

export const iconButtonStyle: CSSProperties = {
  minWidth: '36px',
  minHeight: '36px',
  padding: tokens.spacing['2'],
  background: 'transparent',
  border: 'none',
  borderRadius: tokens.radius.md,
  color: TEXT_TERTIARY,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: `all ${tokens.animation.duration.fast} ${tokens.animation.easing.default}`,
};

export function getPanelToggleStyle(active: boolean): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing['2'],
    minHeight: '36px',
    padding: `${tokens.spacing['2']} ${tokens.spacing['3']}`,
    background: active ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
    border: `1px solid ${active ? BORDER_PRIMARY : 'transparent'}`,
    borderRadius: tokens.radius.md,
    color: active ? TEXT_PRIMARY : TEXT_SECONDARY,
    fontSize: tokens.typography.fontSize.xs,
    fontWeight: tokens.typography.fontWeight.medium,
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    transition: `all ${tokens.animation.duration.fast} ${tokens.animation.easing.default}`,
  };
}

export function getPrimaryActionButtonStyle(isEnabled: boolean): CSSProperties {
  return {
    minHeight: '40px',
    padding: `${tokens.spacing['2']} ${tokens.spacing['3']}`,
    background: gradients.brand,
    border: 'none',
    borderRadius: tokens.radius.md,
    color: TEXT_PRIMARY,
    fontSize: tokens.typography.fontSize.xs,
    fontWeight: tokens.typography.fontWeight.semibold,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing['2'],
    opacity: isEnabled ? 1 : 0.65,
  };
}

export function getDockButtonStyle(active: boolean): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing['2'],
    minHeight: '36px',
    padding: `${tokens.spacing['1.5']} ${tokens.spacing['2.5']}`,
    background: active ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
    border: `1px solid ${active ? BORDER_PRIMARY : 'transparent'}`,
    borderRadius: tokens.radius.sm,
    color: active ? TEXT_PRIMARY : TEXT_TERTIARY,
    fontSize: tokens.typography.fontSize.xs,
    cursor: 'pointer',
    flexShrink: 0,
    transition: `all ${tokens.animation.duration.fast} ${tokens.animation.easing.default}`,
    whiteSpace: 'nowrap',
  };
}

export function getMobileBottomButtonStyle(active: boolean): CSSProperties {
  return {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: tokens.spacing['1'],
    minWidth: '64px',
    minHeight: '44px',
    padding: `${tokens.spacing['1.5']} ${tokens.spacing['3']}`,
    background: 'transparent',
    border: 'none',
    color: active ? ACCENT_CYAN : TEXT_TERTIARY,
    fontSize: tokens.typography.fontSize.xs,
    cursor: 'pointer',
  };
}
