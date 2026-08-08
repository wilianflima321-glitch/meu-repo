import { tokenColor } from '@/lib/design-system/DesignTokenSync'
'use client';

// @aethel-heavy-async-boundary Asset mesh preview runtime; import only through dynamic preview boundaries.

import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

interface AssetMeshPreviewProps {
  url: string;
  lowPoly: boolean;
  extension: string;
}

function resolveCssVarColor(varName: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return value || fallback;
}

function getLoaderByExtension(ext: string) {
  if (['gltf', 'glb'].includes(ext)) return GLTFLoader;
  if (['fbx'].includes(ext)) return FBXLoader;
  if (['obj'].includes(ext)) return OBJLoader;
  return null;
}

function applyLowPolyStyle(object: THREE.Object3D) {
  const baseColor = resolveCssVarColor('--aethel-accent', tokenColor('--aethel-accent'));
  object.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const geom = mesh.geometry as THREE.BufferGeometry;
      const flatGeom = geom.index ? geom.toNonIndexed() : geom.clone();
      flatGeom.computeVertexNormals();
      mesh.geometry = flatGeom;
      mesh.material = new THREE.MeshStandardMaterial({
        color: baseColor,
        roughness: 0.85,
        metalness: 0.1,
        flatShading: true,
      });
    }
  });
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      mesh.geometry?.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((mat) => mat.dispose());
      } else {
        mesh.material?.dispose();
      }
    }
  });
}

function ModelPreview({ url, lowPoly, extension }: AssetMeshPreviewProps) {
  const loader = useMemo(() => getLoaderByExtension(extension), [extension]);
  const loaded = useLoader(loader as any, url);

  const sourceObject = useMemo(() => {
    if ((loaded as { scene?: THREE.Object3D }).scene) {
      return (loaded as { scene: THREE.Object3D }).scene;
    }
    return loaded as THREE.Object3D;
  }, [loaded]);

  const previewObject = useMemo(() => {
    const clone = sourceObject.clone(true);
    if (lowPoly) {
      applyLowPolyStyle(clone);
    }
    return clone;
  }, [sourceObject, lowPoly]);

  useEffect(() => () => disposeObject(previewObject), [previewObject]);

  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    const box = new THREE.Box3().setFromObject(previewObject);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;

    previewObject.position.sub(center);
    previewObject.scale.setScalar(1.6 / maxDim);
  }, [previewObject]);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.35;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={previewObject} />
    </group>
  );
}

export function AssetMeshPreview(props: AssetMeshPreviewProps) {
  return (
    <Canvas camera={{ position: [2.4, 2.1, 2.4], fov: 45 }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 6, 4]} intensity={0.9} />
      <Suspense fallback={null}>
        <ModelPreview {...props} />
      </Suspense>
      <OrbitControls enablePan={false} />
    </Canvas>
  );
}
