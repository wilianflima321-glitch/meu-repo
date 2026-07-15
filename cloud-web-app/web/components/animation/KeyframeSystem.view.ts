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
    primary: resolveCssVarColor("--aethel-primary", "rgb(99, 102, 241)"),
    primaryLight: resolveCssVarColor("--aethel-primary-light", "rgb(129, 140, 248)"),
    primaryDark: resolveCssVarColor("--aethel-primary-dark", "rgb(79, 70, 229)"),
    surfaceBase: resolveCssVarColor("--aethel-surface-primary", "rgb(10, 10, 15)"),
    surfaceMid: resolveCssVarColor("--aethel-surface-secondary", "rgb(17, 17, 24)"),
    surfaceStrong: resolveCssVarColor("--aethel-surface-tertiary", "rgb(26, 26, 36)"),
    surfaceDeep: resolveCssVarColor("--aethel-surface-quaternary", "rgb(37, 37, 50)"),
    textPrimary: resolveCssVarColor("--aethel-text-primary", "rgb(248, 250, 252)"),
    textSecondary: resolveCssVarColor("--aethel-text-secondary", "rgb(226, 232, 240)"),
    textTertiary: resolveCssVarColor("--aethel-text-tertiary", "rgb(148, 163, 184)"),
    textQuaternary: resolveCssVarColor("--aethel-text-quaternary", "rgb(100, 116, 139)"),
    textMuted: resolveCssVarColor("--aethel-text-muted", "rgb(71, 85, 105)"),
    border: resolveCssVarColor("--aethel-border-primary", "rgba(255, 255, 255, 0.12)"),
    error: resolveCssVarColor("--aethel-error", "rgb(239, 68, 68)"),
    primaryAlpha: resolveCssVarRgba("--aethel-primary", 0.5, "rgb(99, 102, 241)"),
  };
}
