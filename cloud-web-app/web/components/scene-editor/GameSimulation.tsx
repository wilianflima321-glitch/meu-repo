import React, { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SceneObject } from './SceneEditor';
import { PhysicsWorld, RigidBodyConfig, ColliderConfig, initPhysicsEngine } from '@/lib/physics-engine-real';

interface GameSimulationProps {
  objects: SceneObject[];
  onUpdate?: (objects: SceneObject[]) => void; // Optional sync back to React state
}

export function GameSimulation({ objects }: GameSimulationProps) {
  const { scene } = useThree();
  const physicsWorld = useRef<PhysicsWorld | null>(null);
  const bodyMap = useRef<Map<string, any>>(new Map());

  // Initialize Physics
  useEffect(() => {
    let active = true;

    async function init() {
      await initPhysicsEngine();
      if (!active) return;
      
      const world = new PhysicsWorld();
      world.init(new THREE.Vector3(0, -9.81, 0)); // Standard Gravity
      physicsWorld.current = world;
      
      // Create bodies for current scene objects
      objects.forEach(obj => {
        // Only if it has physics properties (we'll assume a 'rigidbody' property for now)
        if (obj.properties.rigidbody) {
          createBody(world, obj);
        }
      });
    }

    init();

    return () => {
      active = false;
      physicsWorld.current = null;
      bodyMap.current.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only init once on mount

  function createBody(world: PhysicsWorld, obj: SceneObject) {
    const rbProps = obj.properties.rigidbody as any;
    if (!rbProps) return;

    try {
        const bodyConfig: RigidBodyConfig = {
            type: rbProps.type || 'dynamic',
            position: new THREE.Vector3(...obj.position),
            rotation: new THREE.Quaternion().setFromEuler(new THREE.Euler(...obj.rotation)),
            mass: rbProps.mass || 1.0,
            linearDamping: 0.1,
            angularDamping: 0.1,
        };

        const body = world.createBody(bodyConfig);
        
        // Default Collider (Box) matching the visual geometry
        const geometryType = obj.properties.geometry as string || 'box';
        // Simplification: Assume 1x1x1 for now or read scale
        const scale = new THREE.Vector3(...obj.scale);
        
        let colliderConfig: ColliderConfig;
        
        if (geometryType === 'sphere') {
            colliderConfig = { shape: 'sphere', radius: 0.5 * scale.x };
        } else if (geometryType === 'plane') { // Floor
           colliderConfig = { shape: 'box', halfExtents: new THREE.Vector3(5, 0.1, 5) }; // Mock floor
        } else {
            colliderConfig = { shape: 'box', halfExtents: scale.clone().multiplyScalar(0.5) };
        }
        
        colliderConfig.material = { 
            friction: 0.5, 
            restitution: 0.5, 
            density: 1, 
            frictionCombine: 'average', 
            restitutionCombine: 'average' 
        };

        // Use PhysicsWorld.addCollider instead of body.addCollider
        world.addCollider(body.id, colliderConfig);
        bodyMap.current.set(obj.id, body);
        
    } catch (e) {
        console.error("Failed to create body for", obj.name, e);
    }
  }

  useFrame((state, dt) => {
    if (!physicsWorld.current) return;

    // Step Physics
    physicsWorld.current.step(dt);

    // Sync Physics -> Scene
    bodyMap.current.forEach((body, id) => {
      // Find the visual object in the Three.js scene
      const object3D = scene.getObjectByName(id);
      
      if (object3D && body.rawBody.isDynamic()) {
         const pos = body.position; // Use getter instead of getPosition()
         const rot = body.rotation; // Use getter instead of getRotation()
         
         object3D.position.set(pos.x, pos.y, pos.z);
         object3D.quaternion.set(rot.x, rot.y, rot.z, rot.w);
      }
    });
  });

  return null;
}
