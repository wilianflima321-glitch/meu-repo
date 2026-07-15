// @aethel-heavy-async-boundary Studio/viewport runtime module; never import from public/dashboard/admin route shells.
/** Scene graph loading helpers and component registry. */
import { SceneNode } from './scene-graph-node';
import type { Component } from './scene-graph-node';
import type { SceneNodeData } from './scene-graph-contracts';

export class ComponentRegistry {
  private _constructors: Map<string, new () => Component> = new Map();
  register<T extends Component>(name: string, constructor: new () => T): void {
    this._constructors.set(name, constructor);
  }
  create(name: string): Component | null {
    const ctor = this._constructors.get(name);
    if (ctor) {
      return new ctor();
    }
    return null;
  }
  has(name: string): boolean {
    return this._constructors.has(name);
  }
  getAll(): string[] {
    return Array.from(this._constructors.keys());
  }
}
export class SceneLoader {
  static createNodeFromData(data: SceneNodeData, registry: ComponentRegistry): SceneNode {
    const node = new SceneNode(data.name);
    node.transform.fromJSON(data.transform);
    node.enabled = data.enabled;
    node.layer = data.layer;
    for (const tag of data.tags) {
      node.addTag(tag);
    }
    node.prefabId = data.prefabId;
    for (const compData of data.components) {
      const component = registry.create(compData.type);
      if (component) {
        component.enabled = compData.enabled;
        component.deserialize?.(compData.data);
        component.node = node;
        (node as any)._components.set(compData.type, component);
      }
    }
    for (const childData of data.children) {
      const child = this.createNodeFromData(childData, registry);
      child.setParent(node);
    }
    return node;
  }
}
