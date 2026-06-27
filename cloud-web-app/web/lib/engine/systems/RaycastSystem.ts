// @aethel-heavy-async-boundary
import * as THREE from 'three';
import { SceneManager } from '../scene-graph-manager';

export class RaycastSystem {
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private sceneManager: SceneManager;

  // The node currently selected by the Spatial Ghost Composer
  public targetedNodeId: string | null = null;
  public intersectionPoint: THREE.Vector3 | null = null;

  constructor(manager: SceneManager) {
    this.sceneManager = manager;

    // Listen for Ctrl+K
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        this.triggerSpatialComposer();
      }
    });
  }

  public updateMousePosition(clientX: number, clientY: number): void {
    this.mouse.x = (clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(clientY / window.innerHeight) * 2 + 1;
  }

  private triggerSpatialComposer(): void {
    if (!this.sceneManager.activeScene) return;

    // Assuming we have a reference to the active camera
    // this.raycaster.setFromCamera(this.mouse, camera);

    const intersects = this.raycaster.intersectObjects(
      this.sceneManager.activeScene.threeScene.children, 
      true
    );

    if (intersects.length > 0) {
      const hit = intersects[0];
      // Walk up to find the root SceneNode ID
      let obj: THREE.Object3D | null = hit.object;
      while (obj && !obj.userData?.nodeId) {
        obj = obj.parent;
      }

      if (obj && obj.userData?.nodeId) {
        this.targetedNodeId = obj.userData.nodeId;
        this.intersectionPoint = hit.point;

        // Dispatch Custom Event to open the React Overlay (InlineComposer.tsx)
        const event = new CustomEvent('open-spatial-composer', {
          detail: {
            nodeId: this.targetedNodeId,
            x: window.innerWidth * (this.mouse.x + 1) / 2,
            y: window.innerHeight * (-this.mouse.y + 1) / 2,
          }
        });
        window.dispatchEvent(event);
      }
    }
  }
}
