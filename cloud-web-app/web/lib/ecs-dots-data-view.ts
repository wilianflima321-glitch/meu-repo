import type { ComponentField, ComponentSchema } from './ecs-dots-contracts';

export class ComponentDataView<T extends object> {
  private buffer: ArrayBuffer;
  private schema: ComponentSchema;
  private index: number;
  private dataView: DataView;

  constructor(buffer: ArrayBuffer, schema: ComponentSchema, index: number) {
    this.buffer = buffer;
    this.schema = schema;
    this.index = index;
    this.dataView = new DataView(buffer, index * schema.size, schema.size);
  }

  get<K extends keyof T>(field: K): T[K] {
    const fieldDef = this.schema.fields.find(f => f.name === String(field));
    if (!fieldDef) throw new Error(`Field ${String(field)} not found`);

    return this.readField(fieldDef) as T[K];
  }

  set<K extends keyof T>(field: K, value: T[K]): void {
    const fieldDef = this.schema.fields.find(f => f.name === String(field));
    if (!fieldDef) throw new Error(`Field ${String(field)} not found`);

    this.writeField(fieldDef, value);
  }

  private readField(field: ComponentField): unknown {
    switch (field.type) {
      case 'f32': return this.dataView.getFloat32(field.offset, true);
      case 'f64': return this.dataView.getFloat64(field.offset, true);
      case 'i32': return this.dataView.getInt32(field.offset, true);
      case 'u32': return this.dataView.getUint32(field.offset, true);
      case 'i8': return this.dataView.getInt8(field.offset);
      case 'u8': return this.dataView.getUint8(field.offset);
      case 'bool': return this.dataView.getUint8(field.offset) !== 0;
      case 'entity': return this.dataView.getUint32(field.offset, true);
      case 'vec2': return {
        x: this.dataView.getFloat32(field.offset, true),
        y: this.dataView.getFloat32(field.offset + 4, true),
      };
      case 'vec3': return {
        x: this.dataView.getFloat32(field.offset, true),
        y: this.dataView.getFloat32(field.offset + 4, true),
        z: this.dataView.getFloat32(field.offset + 8, true),
      };
      case 'vec4': return {
        x: this.dataView.getFloat32(field.offset, true),
        y: this.dataView.getFloat32(field.offset + 4, true),
        z: this.dataView.getFloat32(field.offset + 8, true),
        w: this.dataView.getFloat32(field.offset + 12, true),
      };
      default: return null;
    }
  }

  private writeField(field: ComponentField, value: unknown): void {
    switch (field.type) {
      case 'f32': this.dataView.setFloat32(field.offset, value as number, true); break;
      case 'f64': this.dataView.setFloat64(field.offset, value as number, true); break;
      case 'i32': this.dataView.setInt32(field.offset, value as number, true); break;
      case 'u32': this.dataView.setUint32(field.offset, value as number, true); break;
      case 'i8': this.dataView.setInt8(field.offset, value as number); break;
      case 'u8': this.dataView.setUint8(field.offset, value as number); break;
      case 'bool': this.dataView.setUint8(field.offset, (value as boolean) ? 1 : 0); break;
      case 'entity': this.dataView.setUint32(field.offset, value as number, true); break;
      case 'vec2': {
        const v = value as { x: number; y: number };
        this.dataView.setFloat32(field.offset, v.x, true);
        this.dataView.setFloat32(field.offset + 4, v.y, true);
        break;
      }
      case 'vec3': {
        const v = value as { x: number; y: number; z: number };
        this.dataView.setFloat32(field.offset, v.x, true);
        this.dataView.setFloat32(field.offset + 4, v.y, true);
        this.dataView.setFloat32(field.offset + 8, v.z, true);
        break;
      }
      case 'vec4': {
        const v = value as { x: number; y: number; z: number; w: number };
        this.dataView.setFloat32(field.offset, v.x, true);
        this.dataView.setFloat32(field.offset + 4, v.y, true);
        this.dataView.setFloat32(field.offset + 8, v.z, true);
        this.dataView.setFloat32(field.offset + 12, v.w, true);
        break;
      }
    }
  }
}
