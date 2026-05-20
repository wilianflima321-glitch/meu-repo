import type { RuntimeComponentData, SerializedQuaternion, SerializedVector3 } from './types';

export const cloneData = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const toComponentData = (value: unknown): RuntimeComponentData =>
  value && typeof value === 'object' ? (value as RuntimeComponentData) : {};

export const numeric = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

export const vector3 = (value: unknown, fallback: SerializedVector3): SerializedVector3 => {
  const source = toComponentData(value);

  return {
    x: numeric(source.x, fallback.x),
    y: numeric(source.y, fallback.y),
    z: numeric(source.z, fallback.z),
  };
};

export const quaternion = (value: unknown, fallback: SerializedQuaternion): SerializedQuaternion => {
  const source = toComponentData(value);

  return {
    x: numeric(source.x, fallback.x),
    y: numeric(source.y, fallback.y),
    z: numeric(source.z, fallback.z),
    w: numeric(source.w, fallback.w),
  };
};
