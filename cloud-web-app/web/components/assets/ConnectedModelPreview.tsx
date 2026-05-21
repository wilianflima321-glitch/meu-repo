'use client';

// @aethel-heavy-async-boundary: loaded only by ContentBrowserConnected when a model preview is opened.

import { logger } from '@/lib/observability/logger';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export default function ConnectedModelPreview({ url }: { url: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x101018);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 5000);
    camera.position.set(0, 0.5, 3);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);

    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambient);
    const directional = new THREE.DirectionalLight(0xffffff, 0.6);
    directional.position.set(3, 6, 4);
    scene.add(directional);

    const loader = new GLTFLoader();
    let currentObject: THREE.Object3D | null = null;

    loader.load(
      url,
      (gltf) => {
        currentObject = gltf.scene;
        scene.add(currentObject);

        const box = new THREE.Box3().setFromObject(currentObject);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);
        currentObject.position.sub(center);

        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const distance = maxDim * 1.6;
        camera.position.set(0, maxDim * 0.2, distance);
        camera.lookAt(0, 0, 0);
      },
      undefined,
      (error) => {
        logger.error('Failed to load model preview:', error);
      },
    );

    const resize = () => {
      const width = canvas.clientWidth || 1;
      const height = canvas.clientHeight || 1;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      if (currentObject) {
        currentObject.rotation.y += 0.004;
      }
      resize();
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      if (currentObject) {
        currentObject.traverse((child) => {
          const mesh = child as THREE.Mesh;
          if (mesh.isMesh) {
            mesh.geometry?.dispose();
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((mat) => mat.dispose());
            } else {
              mesh.material?.dispose();
            }
          }
        });
        scene.remove(currentObject);
      }
      renderer.dispose();
    };
  }, [url]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block', borderRadius: '8px' }}
    />
  );
}
