import type { ColorStop, FloatCurve, FloatRange } from './advanced-particle-system-types';

export function randomRange(range: FloatRange): number {
  return range.min + Math.random() * (range.max - range.min);
}

export function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function evaluateCurve(curve: FloatCurve[], t: number): number {
  if (curve.length === 0) return 1;
  if (curve.length === 1) return curve[0].value;

  for (let i = 0; i < curve.length - 1; i++) {
    if (t >= curve[i].time && t <= curve[i + 1].time) {
      const localT = (t - curve[i].time) / (curve[i + 1].time - curve[i].time);
      return curve[i].value + (curve[i + 1].value - curve[i].value) * localT;
    }
  }

  return curve[curve.length - 1].value;
}

export function evaluateColorGradient(
  gradient: ColorStop[],
  t: number,
): { r: number; g: number; b: number; a: number } {
  if (gradient.length === 0) return { r: 1, g: 1, b: 1, a: 1 };
  if (gradient.length === 1) return gradient[0].color;

  for (let i = 0; i < gradient.length - 1; i++) {
    if (t >= gradient[i].time && t <= gradient[i + 1].time) {
      const localT = (t - gradient[i].time) / (gradient[i + 1].time - gradient[i].time);
      const a = gradient[i].color;
      const b = gradient[i + 1].color;
      return {
        r: a.r + (b.r - a.r) * localT,
        g: a.g + (b.g - a.g) * localT,
        b: a.b + (b.b - a.b) * localT,
        a: a.a + (b.a - a.a) * localT,
      };
    }
  }

  return gradient[gradient.length - 1].color;
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

export function noise3D(x: number, y: number, z: number): number {
  const p = [151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225];
  const X = Math.floor(x) & 15;
  const Y = Math.floor(y) & 15;
  const Z = Math.floor(z) & 15;
  x -= Math.floor(x);
  y -= Math.floor(y);
  z -= Math.floor(z);
  const u = fade(x);
  const v = fade(y);
  const w = fade(z);
  const A = p[X] + Y;
  const B = p[X + 1] + Y;
  return lerp(
    lerp(
      lerp(p[p[A] + Z] / 255, p[p[B] + Z] / 255, u),
      lerp(p[p[A + 1] + Z] / 255, p[p[B + 1] + Z] / 255, u),
      v
    ),
    lerp(
      lerp(p[p[A] + Z + 1] / 255, p[p[B] + Z + 1] / 255, u),
      lerp(p[p[A + 1] + Z + 1] / 255, p[p[B + 1] + Z + 1] / 255, u),
      v
    ),
    w
  ) * 2 - 1;
}
