import type { AnimatedProperty, KeyframeTrack } from "./KeyframeSystem.model";

export type TimelineRow =
  | {
      kind: "track";
      trackId: string;
      track: KeyframeTrack;
      y: number;
      height: number;
    }
  | {
      kind: "property";
      trackId: string;
      track: KeyframeTrack;
      propertyId: string;
      property: AnimatedProperty;
      y: number;
      height: number;
    };

export interface VisibleTimelineRange {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface KeyframePalette {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  surfaceBase: string;
  surfaceMid: string;
  surfaceStrong: string;
  surfaceDeep: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textQuaternary: string;
  textMuted: string;
  border: string;
  error: string;
  primaryAlpha: string;
}

export const TIMELINE_DRAW_OVERSCAN = 160;

export function resolveCssVarColor(varName: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
  return value || fallback;
}

function withAlpha(color: string, alpha: number): string {
  if (color.startsWith("rgb(")) {
    return `rgba(${color.slice(4, -1)}, ${alpha})`;
  }
  if (color.startsWith("rgba(")) {
    const parts = color
      .slice(5, -1)
      .split(",")
      .map((p) => p.trim());
    return `rgba(${parts.slice(0, 3).join(", ")}, ${alpha})`;
  }
  return color;
}

export function resolveCssVarRgba(
  varName: string,
  alpha: number,
  fallback: string,
): string {
  const base = resolveCssVarColor(varName, fallback);
  return withAlpha(base, alpha);
}

export function findScrollableParent(element: HTMLElement): HTMLElement | Window {
  let current: HTMLElement | null = element.parentElement;

  while (current) {
    const style = window.getComputedStyle(current);
    const overflow = `${style.overflow}${style.overflowY}${style.overflowX}`;
    if (/(auto|scroll|overlay)/.test(overflow)) {
      return current;
    }
    current = current.parentElement;
  }

  return window;
}

export function createKeyframePalette(): KeyframePalette {
  return {
    primary: resolveCssVarColor("--aethel-primary", ""),
    primaryLight: resolveCssVarColor("--aethel-primary-light", ""),
    primaryDark: resolveCssVarColor("--aethel-primary-dark", ""),
    surfaceBase: resolveCssVarColor("--aethel-surface-primary", ""),
    surfaceMid: resolveCssVarColor("--aethel-surface-secondary", ""),
    surfaceStrong: resolveCssVarColor("--aethel-surface-tertiary", ""),
    surfaceDeep: resolveCssVarColor("--aethel-surface-quaternary", ""),
    textPrimary: resolveCssVarColor("--aethel-text-primary", ""),
    textSecondary: resolveCssVarColor("--aethel-text-secondary", ""),
    textTertiary: resolveCssVarColor("--aethel-text-tertiary", ""),
    textQuaternary: resolveCssVarColor("--aethel-text-quaternary", ""),
    textMuted: resolveCssVarColor("--aethel-text-muted", ""),
    border: resolveCssVarColor("--aethel-border-primary", ""),
    error: resolveCssVarColor("--aethel-error", ""),
    primaryAlpha: resolveCssVarRgba("--aethel-primary", 0.5, ""),
  };
}
