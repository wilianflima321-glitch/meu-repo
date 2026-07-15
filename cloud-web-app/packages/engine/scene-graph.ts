// @aethel-heavy-async-boundary Studio/viewport runtime module; never import from public/dashboard/admin route shells.
/** Canonical scene graph public API. Keep this barrel stable for existing engine imports. */
export { Transform } from './scene-transform';
export type {
  ComponentData,
  ContactPoint,
  EnvironmentData,
  NodeTag,
  SceneData,
  SceneNodeData,
  SceneSettings,
  TransformData,
} from './scene-graph-contracts';
export { Component, SceneNode } from './scene-graph-node';
export { Scene } from './scene-graph-scene';
export type { RaycastHit } from './scene-graph-scene';
export { ComponentRegistry, SceneLoader } from './scene-graph-loading';
export { SceneManager } from './scene-graph-manager';
export { CameraComponent, LightComponent, MeshRenderer } from './scene-graph-components';
export { SceneManager as default } from './scene-graph-manager';
