import * as THREE from 'three';
import { AAARenderer } from './aaa-renderer-impl';
import { World, Entity, MeshComponent, TransformComponent } from './game-engine-core';

export class RenderSystem {
    private meshMap: Map<string, THREE.Mesh> = new Map();
    private groupMap: Map<string, THREE.Group> = new Map();

    constructor(private world: World, private renderer: AAARenderer) {}

    update() {
        // 1. Check for new entities with MeshComponent
        const entities = this.world.getEntitiesWithComponents(['mesh', 'transform']);
        
        for (const entity of entities) {
            this.syncEntity(entity);
        }

        // 2. Cleanup removed entities (Simplistic GC)
        // In real engine use onEntityRemoved event
    }

    private syncEntity(entity: Entity) {
        const meshComp = this.world.getComponent<MeshComponent>(entity.id, 'mesh');
        const transform = this.world.getComponent<TransformComponent>(entity.id, 'transform');
        
        if (!meshComp || !transform) return;

        let mesh = this.meshMap.get(entity.id);

        // Instantiate if missing
        if (!mesh) {
            mesh = new THREE.Mesh(meshComp.geometry, meshComp.material);
            mesh.castShadow = meshComp.castShadow;
            mesh.receiveShadow = meshComp.receiveShadow;
            
            this.renderer.scene.add(mesh);
            this.meshMap.set(entity.id, mesh);
        }

        // Update Transform
        mesh.position.copy(transform.position);
        mesh.rotation.copy(transform.rotation);
        mesh.scale.copy(transform.scale);
        
        // Update Material/Geometry if changed (Diffing logic omitted for perf)
    }
}
