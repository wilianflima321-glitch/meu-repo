import type { Quaternion, Vector3 } from './physics-engine-types';

export const Vec3 = {
  create(x = 0, y = 0, z = 0): Vector3 {
    return { x, y, z };
  },

  add(a: Vector3, b: Vector3): Vector3 {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
  },

  sub(a: Vector3, b: Vector3): Vector3 {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  },

  scale(v: Vector3, s: number): Vector3 {
    return { x: v.x * s, y: v.y * s, z: v.z * s };
  },

  dot(a: Vector3, b: Vector3): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  },

  cross(a: Vector3, b: Vector3): Vector3 {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x,
    };
  },

  length(v: Vector3): number {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  },

  lengthSq(v: Vector3): number {
    return v.x * v.x + v.y * v.y + v.z * v.z;
  },

  normalize(v: Vector3): Vector3 {
    const len = Vec3.length(v);
    if (len === 0) return { x: 0, y: 0, z: 0 };
    return { x: v.x / len, y: v.y / len, z: v.z / len };
  },

  distance(a: Vector3, b: Vector3): number {
    return Vec3.length(Vec3.sub(a, b));
  },

  lerp(a: Vector3, b: Vector3, t: number): Vector3 {
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      z: a.z + (b.z - a.z) * t,
    };
  },

  zero(): Vector3 {
    return { x: 0, y: 0, z: 0 };
  },

  clone(v: Vector3): Vector3 {
    return { x: v.x, y: v.y, z: v.z };
  },
};

export const Quat = {
  identity(): Quaternion {
    return { x: 0, y: 0, z: 0, w: 1 };
  },

  fromEuler(x: number, y: number, z: number): Quaternion {
    const cx = Math.cos(x * 0.5);
    const sx = Math.sin(x * 0.5);
    const cy = Math.cos(y * 0.5);
    const sy = Math.sin(y * 0.5);
    const cz = Math.cos(z * 0.5);
    const sz = Math.sin(z * 0.5);

    return {
      x: sx * cy * cz - cx * sy * sz,
      y: cx * sy * cz + sx * cy * sz,
      z: cx * cy * sz - sx * sy * cz,
      w: cx * cy * cz + sx * sy * sz,
    };
  },

  multiply(a: Quaternion, b: Quaternion): Quaternion {
    return {
      x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
      y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
      z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
      w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    };
  },

  rotateVector(q: Quaternion, v: Vector3): Vector3 {
    const u = { x: q.x, y: q.y, z: q.z };
    const s = q.w;

    const dotUV = Vec3.dot(u, v);
    const dotUU = Vec3.dot(u, u);
    const crossUV = Vec3.cross(u, v);

    return Vec3.add(
      Vec3.add(
        Vec3.scale(u, 2 * dotUV),
        Vec3.scale(v, s * s - dotUU)
      ),
      Vec3.scale(crossUV, 2 * s)
    );
  },

  normalize(q: Quaternion): Quaternion {
    const len = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);
    if (len === 0) return Quat.identity();
    return { x: q.x / len, y: q.y / len, z: q.z / len, w: q.w / len };
  },

  slerp(a: Quaternion, b: Quaternion, t: number): Quaternion {
    let dot = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;

    if (dot < 0) {
      b = { x: -b.x, y: -b.y, z: -b.z, w: -b.w };
      dot = -dot;
    }

    if (dot > 0.9995) {
      return Quat.normalize({
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        z: a.z + (b.z - a.z) * t,
        w: a.w + (b.w - a.w) * t,
      });
    }

    const theta0 = Math.acos(dot);
    const theta = theta0 * t;
    const sinTheta = Math.sin(theta);
    const sinTheta0 = Math.sin(theta0);

    const s0 = Math.cos(theta) - dot * sinTheta / sinTheta0;
    const s1 = sinTheta / sinTheta0;

    return {
      x: a.x * s0 + b.x * s1,
      y: a.y * s0 + b.y * s1,
      z: a.z * s0 + b.z * s1,
      w: a.w * s0 + b.w * s1,
    };
  },
};
