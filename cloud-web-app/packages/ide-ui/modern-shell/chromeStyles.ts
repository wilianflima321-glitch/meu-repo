import type { CSSProperties } from 'react';
import { gradients, tokens } from '../../../web/lib/design-tokens';

export const chromeBarPadding = `${tokens.spacing['1.5']} ${tokens.spacing['3']}`;
export const chromeBarHeight = '44px';
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
    background: active ? 'var(--aethel-interactive-active)' : 'transparent',
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
    minHeight: '36px',
    padding: `${tokens.spacing['2']} ${tokens.spacing['3.5']}`,
    background: 'var(--aethel-primary)',
    backgroundImage: 'linear-gradient(135deg, var(--aethel-primary-light) 0%, var(--aethel-primary) 60%)',
    border: 'none',
    borderRadius: tokens.radius.md,
    color: 'var(--aethel-text-inverse)',
    fontSize: tokens.typography.fontSize.xs,
    fontWeight: tokens.typography.fontWeight.semibold,
    cursor: isEnabled ? 'pointer' : 'not-allowed',
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing['1.5'],
    opacity: isEnabled ? 1 : 0.55,
    boxShadow: isEnabled ? '0 2px 8px color-mix(in srgb, var(--aethel-primary) 45%, transparent)' : 'none',
    transition: `all ${tokens.animation.duration.fast} ${tokens.animation.easing.default}`,
    letterSpacing: '0.01em',
  };
}

export function getDockButtonStyle(active: boolean): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing['1.5'],
    minHeight: '30px',
    padding: `${tokens.spacing['1']} ${tokens.spacing['2.5']}`,
    background: active
      ? 'color-mix(in srgb, var(--aethel-primary) 14%, var(--aethel-surface-tertiary))'
      : 'transparent',
    border: `1px solid ${active ? 'color-mix(in srgb, var(--aethel-primary) 28%, transparent)' : 'transparent'}`,
    borderRadius: tokens.radius.md,
    color: active ? 'var(--aethel-primary-light)' : TEXT_TERTIARY,
    fontSize: tokens.typography.fontSize.xs,
    fontWeight: active ? tokens.typography.fontWeight.medium : tokens.typography.fontWeight.normal,
    cursor: 'pointer',
    flexShrink: 0,
    transition: `all ${tokens.animation.duration.fast} ${tokens.animation.easing.default}`,
    whiteSpace: 'nowrap',
    letterSpacing: active ? '0.005em' : '0',
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
