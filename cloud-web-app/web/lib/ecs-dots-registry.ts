import type { ComponentField, ComponentSchema, ComponentType } from './ecs-dots-contracts';

export class ComponentRegistry {
  private schemas: Map<ComponentType, ComponentSchema> = new Map();
  private nameToId: Map<string, ComponentType> = new Map();
  private nextComponentId: ComponentType = 0;

  /**
   * Registra um novo tipo de componente
   */
  register<T extends object>(name: string, fields: Omit<ComponentField, 'offset' | 'size'>[]): ComponentType {
    if (this.nameToId.has(name)) {
      return this.nameToId.get(name)!;
    }

    const id = this.nextComponentId++;

    // Calcular offsets e sizes
    let offset = 0;
    const processedFields: ComponentField[] = fields.map(f => {
      const size = this.getTypeSize(f.type);
      const field: ComponentField = {
        ...f,
        offset,
        size,
      };
      offset += size;
      return field;
    });

    const schema: ComponentSchema = {
      id,
      name,
      size: offset,
      fields: processedFields,
    };

    this.schemas.set(id, schema);
    this.nameToId.set(name, id);

    return id;
  }

  private getTypeSize(type: ComponentField['type']): number {
    switch (type) {
      case 'f32': case 'i32': case 'u32': return 4;
      case 'f64': return 8;
      case 'i8': case 'u8': case 'bool': return 1;
      case 'vec2': return 8;
      case 'vec3': return 12;
      case 'vec4': return 16;
      case 'mat4': return 64;
      case 'entity': return 4;
      default: return 4;
    }
  }

  getSchema(id: ComponentType): ComponentSchema | undefined {
    return this.schemas.get(id);
  }

  getIdByName(name: string): ComponentType | undefined {
    return this.nameToId.get(name);
  }

  getAllSchemas(): ComponentSchema[] {
    return Array.from(this.schemas.values());
  }
}

// ============================================================================
// ARCHETYPE
// ============================================================================
