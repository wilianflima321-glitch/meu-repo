import { describe, expect, it } from 'vitest';
import { Component, ComponentRegistry, Scene, SceneManager, SceneNode } from '@aethel/engine/scene-graph';

class HealthComponent extends Component {
  value = 100;

  serialize(): Record<string, unknown> {
    return { value: this.value };
  }

  deserialize(data: Record<string, unknown>): void {
    this.value = Number(data.value ?? 0);
  }
}

describe('scene graph public barrel', () => {
  it('preserves node hierarchy, component lookup and serialization loading', () => {
    const scene = new Scene('Contract Scene');
    const root = new SceneNode('Root');
    const child = new SceneNode('Child');
    child.addTag('enemy');
    child.setParent(root);

    const health = child.addComponent(HealthComponent);
    health.value = 42;
    scene.addNode(root);

    expect(scene.findNodeByName('Child')).toBe(child);
    expect(root.findByTag('enemy')).toBe(child);
    expect(child.getComponent(HealthComponent)?.value).toBe(42);

    const registry = new ComponentRegistry();
    registry.register('HealthComponent', HealthComponent);
    const restored = Scene.fromJSON(scene.toJSON(), registry);
    const restoredChild = restored.findNodeByName('Child');

    expect(restoredChild?.hasTag('enemy')).toBe(true);
    expect(restoredChild?.getComponent(HealthComponent)?.value).toBe(42);
  });

  it('keeps SceneManager lifecycle available through the canonical barrel', () => {
    const manager = SceneManager.instance;
    const scene = manager.createScene('Managed Scene');

    manager.loadScene(scene.id);
    expect(manager.activeScene).toBe(scene);

    manager.unloadScene(scene.id);
    expect(manager.getScene(scene.id)).toBeNull();
  });
});
