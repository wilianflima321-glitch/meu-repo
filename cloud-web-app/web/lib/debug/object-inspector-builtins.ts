import type { CustomInspector } from './object-inspector-contracts';
import { isInspectorColor, isInspectorVector3 } from './object-inspector-values';

type BuiltInInspectorRegistrar = (inspector: CustomInspector) => void;

export function registerBuiltInObjectInspectors(register: BuiltInInspectorRegistrar): void {
  register({
    type: 'Vector3',
    match: isInspectorVector3,
    getProperties: (value) => {
      const vector = value as { x: number; y: number; z: number };
      return [
        { name: 'x', path: 'x', type: 'number', value: vector.x, writable: true, enumerable: true, configurable: true, metadata: { step: 0.1 } },
        { name: 'y', path: 'y', type: 'number', value: vector.y, writable: true, enumerable: true, configurable: true, metadata: { step: 0.1 } },
        { name: 'z', path: 'z', type: 'number', value: vector.z, writable: true, enumerable: true, configurable: true, metadata: { step: 0.1 } },
      ];
    },
  });

  register({
    type: 'Color',
    match: isInspectorColor,
    getProperties: (value) => {
      const color = value as { r: number; g: number; b: number };
      return [
        { name: 'r', path: 'r', type: 'number', value: color.r, writable: true, enumerable: true, configurable: true, metadata: { min: 0, max: 1, step: 0.01 } },
        { name: 'g', path: 'g', type: 'number', value: color.g, writable: true, enumerable: true, configurable: true, metadata: { min: 0, max: 1, step: 0.01 } },
        { name: 'b', path: 'b', type: 'number', value: color.b, writable: true, enumerable: true, configurable: true, metadata: { min: 0, max: 1, step: 0.01 } },
      ];
    },
  });
}
