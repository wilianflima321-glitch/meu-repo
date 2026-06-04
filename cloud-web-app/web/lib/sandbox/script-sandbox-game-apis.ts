// ============================================================================
// AETHEL GAME APIs (para scripts de jogo)
// ============================================================================

/**
 * APIs seguras expostas para scripts de jogo
 */
export const AethelGameAPIs = {
  // Matemática de jogo
  lerp: (a: number, b: number, t: number) => a + (b - a) * t,
  clamp: (value: number, min: number, max: number) => Math.min(Math.max(value, min), max),
  randomRange: (min: number, max: number) => Math.random() * (max - min) + min,
  distance: (x1: number, y1: number, x2: number, y2: number) =>
    Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2),

  // Vetores 2D
  vec2: {
    add: (a: [number, number], b: [number, number]): [number, number] =>
      [a[0] + b[0], a[1] + b[1]],
    sub: (a: [number, number], b: [number, number]): [number, number] =>
      [a[0] - b[0], a[1] - b[1]],
    mul: (a: [number, number], s: number): [number, number] =>
      [a[0] * s, a[1] * s],
    normalize: (a: [number, number]): [number, number] => {
      const len = Math.sqrt(a[0] ** 2 + a[1] ** 2);
      return len > 0 ? [a[0] / len, a[1] / len] : [0, 0];
    },
  },

  // Vetores 3D
  vec3: {
    add: (a: [number, number, number], b: [number, number, number]): [number, number, number] =>
      [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    sub: (a: [number, number, number], b: [number, number, number]): [number, number, number] =>
      [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    mul: (a: [number, number, number], s: number): [number, number, number] =>
      [a[0] * s, a[1] * s, a[2] * s],
    cross: (a: [number, number, number], b: [number, number, number]): [number, number, number] => [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ],
    dot: (a: [number, number, number], b: [number, number, number]): number =>
      a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  },

  // Easing functions
  ease: {
    linear: (t: number) => t,
    inQuad: (t: number) => t * t,
    outQuad: (t: number) => t * (2 - t),
    inOutQuad: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    inCubic: (t: number) => t * t * t,
    outCubic: (t: number) => (--t) * t * t + 1,
    inOutCubic: (t: number) => t < 0.5
      ? 4 * t * t * t
      : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  },
};
