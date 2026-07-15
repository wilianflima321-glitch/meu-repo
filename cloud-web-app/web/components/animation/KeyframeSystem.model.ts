export type EasingType =
  | "linear"
  | "easeIn"
  | "easeOut"
  | "easeInOut"
  | "bezier"
  | "hold"
  | "bounce"
  | "elastic";

export type KeyframeValue = number | number[] | string;

export interface Keyframe {
  id: string;
  time: number; // Time in seconds
  value: KeyframeValue;
  easing: EasingType;
  // Bezier handles for custom curves (normalized 0-1)
  bezierIn?: { x: number; y: number };
  bezierOut?: { x: number; y: number };
  selected?: boolean;
}

export interface AnimatedProperty {
  id: string;
  name: string;
  property: string; // e.g., 'opacity', 'position.x', 'scale', 'rotation'
  keyframes: Keyframe[];
  defaultValue: KeyframeValue;
  min?: number;
  max?: number;
  step?: number;
  unit?: string; // e.g., 'px', '%', 'deg'
}

export interface KeyframeTrack {
  id: string;
  clipId: string;
  properties: AnimatedProperty[];
  expanded?: boolean;
}

export interface KeyframeEditorProps {
  tracks: KeyframeTrack[];
  currentTime: number;
  duration: number;
  pixelsPerSecond: number;
  onKeyframeAdd: (
    trackId: string,
    propertyId: string,
    time: number,
    value: KeyframeValue,
  ) => void;
  onKeyframeUpdate: (
    trackId: string,
    propertyId: string,
    keyframeId: string,
    updates: Partial<Keyframe>,
  ) => void;
  onKeyframeDelete: (
    trackId: string,
    propertyId: string,
    keyframeId: string,
  ) => void;
  onKeyframeMove: (
    trackId: string,
    propertyId: string,
    keyframeId: string,
    newTime: number,
  ) => void;
  onTrackToggle?: (trackId: string) => void;
  selectedKeyframes?: string[];
  onSelectionChange?: (keyframeIds: string[]) => void;
}

// ============================================================================
// EASING FUNCTIONS
// ============================================================================

export function evaluateEasing(
  easing: EasingType,
  t: number,
  bezierIn?: { x: number; y: number },
  bezierOut?: { x: number; y: number },
): number {
  switch (easing) {
    case "linear":
      return t;

    case "easeIn":
      return t * t * t;

    case "easeOut":
      return 1 - Math.pow(1 - t, 3);

    case "easeInOut":
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    case "hold":
      return t < 1 ? 0 : 1;

    case "bounce":
      if (t < 1 / 2.75) {
        return 7.5625 * t * t;
      } else if (t < 2 / 2.75) {
        const t2 = t - 1.5 / 2.75;
        return 7.5625 * t2 * t2 + 0.75;
      } else if (t < 2.5 / 2.75) {
        const t2 = t - 2.25 / 2.75;
        return 7.5625 * t2 * t2 + 0.9375;
      } else {
        const t2 = t - 2.625 / 2.75;
        return 7.5625 * t2 * t2 + 0.984375;
      }

    case "elastic":
      if (t === 0 || t === 1) return t;
      const p = 0.3;
      const s = p / 4;
      return Math.pow(2, -10 * t) * Math.sin(((t - s) * (2 * Math.PI)) / p) + 1;

    case "bezier":
      if (!bezierIn || !bezierOut) return t;
      return cubicBezier(bezierIn.x, bezierIn.y, bezierOut.x, bezierOut.y, t);

    default:
      return t;
  }
}

function cubicBezier(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  t: number,
): number {
  // Newton-Raphson iteration to find t for given x
  const epsilon = 0.0001;
  let guess = t;

  for (let i = 0; i < 8; i++) {
    const x = bezierX(x1, x2, guess) - t;
    if (Math.abs(x) < epsilon) break;
    const dx = bezierDX(x1, x2, guess);
    if (Math.abs(dx) < epsilon) break;
    guess -= x / dx;
  }

  return bezierY(y1, y2, guess);
}

function bezierX(x1: number, x2: number, t: number): number {
  return 3 * (1 - t) * (1 - t) * t * x1 + 3 * (1 - t) * t * t * x2 + t * t * t;
}

function bezierY(y1: number, y2: number, t: number): number {
  return 3 * (1 - t) * (1 - t) * t * y1 + 3 * (1 - t) * t * t * y2 + t * t * t;
}

function bezierDX(x1: number, x2: number, t: number): number {
  return (
    3 * (1 - t) * (1 - t) * x1 +
    6 * (1 - t) * t * (x2 - x1) +
    3 * t * t * (1 - x2)
  );
}

// ============================================================================
// INTERPOLATION
// ============================================================================

export function interpolateValue(
  keyframes: Keyframe[],
  time: number,
  defaultValue: KeyframeValue,
): KeyframeValue {
  if (keyframes.length === 0) return defaultValue;

  const sorted = [...keyframes].sort((a, b) => a.time - b.time);

  // Before first keyframe
  if (time <= sorted[0].time) return sorted[0].value;

  // After last keyframe
  if (time >= sorted[sorted.length - 1].time)
    return sorted[sorted.length - 1].value;

  // Find surrounding keyframes
  let prevKf = sorted[0];
  let nextKf = sorted[1];

  for (let i = 0; i < sorted.length - 1; i++) {
    if (time >= sorted[i].time && time <= sorted[i + 1].time) {
      prevKf = sorted[i];
      nextKf = sorted[i + 1];
      break;
    }
  }

  // Calculate normalized time between keyframes
  const duration = nextKf.time - prevKf.time;
  const localT = duration > 0 ? (time - prevKf.time) / duration : 0;

  // Apply easing
  const easedT = evaluateEasing(
    prevKf.easing,
    localT,
    prevKf.bezierOut,
    nextKf.bezierIn,
  );

  // Interpolate based on value type
  if (typeof prevKf.value === "number" && typeof nextKf.value === "number") {
    return prevKf.value + (nextKf.value - prevKf.value) * easedT;
  }

  if (Array.isArray(prevKf.value) && Array.isArray(nextKf.value)) {
    return prevKf.value.map((v, i) => {
      const nextV = (nextKf.value as number[])[i] ?? v;
      return v + (nextV - v) * easedT;
    });
  }

  // For strings (e.g., colors), return prev value until we reach next keyframe
  return easedT < 0.5 ? prevKf.value : nextKf.value;
}

// ============================================================================
// KEYFRAME EDITOR COMPONENT
// ============================================================================

// ============================================================================
// UTILITY: Create default animated properties for a clip
// ============================================================================

export function createDefaultAnimatedProperties(): AnimatedProperty[] {
  return [
    {
      id: "opacity",
      name: "Opacity",
      property: "opacity",
      keyframes: [],
      defaultValue: 1,
      min: 0,
      max: 1,
      step: 0.01,
    },
    {
      id: "position-x",
      name: "Position X",
      property: "position.x",
      keyframes: [],
      defaultValue: 0,
      unit: "px",
    },
    {
      id: "position-y",
      name: "Position Y",
      property: "position.y",
      keyframes: [],
      defaultValue: 0,
      unit: "px",
    },
    {
      id: "scale",
      name: "Scale",
      property: "scale",
      keyframes: [],
      defaultValue: 100,
      min: 0,
      max: 500,
      step: 1,
      unit: "%",
    },
    {
      id: "rotation",
      name: "Rotation",
      property: "rotation",
      keyframes: [],
      defaultValue: 0,
      unit: "deg",
    },
    {
      id: "volume",
      name: "Volume",
      property: "volume",
      keyframes: [],
      defaultValue: 1,
      min: 0,
      max: 2,
      step: 0.01,
    },
  ];
}
