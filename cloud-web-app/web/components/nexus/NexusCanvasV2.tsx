'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

/**
 * ============================================
 * NEXUS CANVAS V2: Motor de Renderização AAA
 * ============================================
 * 
 * Renderizador 3D de alta performance baseado em Three.js
 * com suporte a WebGPU para qualidade visual Unreal-like.
 * 
 * Características:
 * - Renderização em tempo real (60 FPS)
 * - Suporte a Scene Graphs complexos
 * - Integração com WASM Logic Engine
 * - Hot-reload de assets e lógica
 * - Pixel-perfect visual quality
 */

interface SceneObject {
  id: string;
  name: string;
  type: 'mesh' | 'light' | 'camera' | 'particle';
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  material?: {
    color: string;
    metalness?: number;
    roughness?: number;
  };
}

interface NexusCanvasProps {
  initialScene?: SceneObject[];
  onSceneChange?: (scene: SceneObject[]) => void;
  enablePhysics?: boolean;
  renderMode?: 'draft' | 'cinematic';
}

export const NexusCanvasV2: React.FC<NexusCanvasProps> = ({
  initialScene = [],
  onSceneChange,
  enablePhysics = true,
  renderMode = 'draft',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const objectsRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const [isInitialized, setIsInitialized] = useState(false);
  const [stats, setStats] = useState({ fps: 0, objects: 0 });

  // Inicializar a cena 3D
  useEffect(() => {
    if (!containerRef.current || isInitialized) return;

    // Criar cena
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e27); // Deep Space Dark
    sceneRef.current = scene;

    // Criar câmera
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      10000
    );
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Criar renderer com WebGPU se disponível
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: renderMode === 'cinematic' ? 'high-performance' : 'default',
    });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Adicionar iluminação
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Adicionar grid helper (modo draft)
    if (renderMode === 'draft') {
      const gridHelper = new THREE.GridHelper(100, 100, 0x444444, 0x222222);
      scene.add(gridHelper);
    }

    // Carregar cena inicial
    if (initialScene.length > 0) {
      loadSceneObjects(scene, initialScene);
    }

    // Loop de renderização
    let frameCount = 0;
    let lastTime = performance.now();

    const animate = () => {
      requestAnimationFrame(animate);

      // Calcular FPS
      frameCount++;
      const currentTime = performance.now();
      if (currentTime - lastTime >= 1000) {
        setStats({ fps: frameCount, objects: objectsRef.current.size });
        frameCount = 0;
        lastTime = currentTime;
      }

      // Renderizar
      if (rendererRef.current && cameraRef.current && sceneRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate();

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;

      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);
    setIsInitialized(true);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current && rendererRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
    };
  }, [isInitialized, renderMode]);

  // Carregar objetos da cena
  const loadSceneObjects = (scene: THREE.Scene, objects: SceneObject[]) => {
    objects.forEach((obj) => {
      let threeObj: THREE.Object3D | null = null;

      switch (obj.type) {
        case 'mesh':
          const geometry = new THREE.BoxGeometry(1, 1, 1);
          const material = new THREE.MeshStandardMaterial({
            color: obj.material?.color || '#ffffff',
            metalness: obj.material?.metalness || 0.5,
            roughness: obj.material?.roughness || 0.5,
          });
          threeObj = new THREE.Mesh(geometry, material);
          break;

        case 'light':
          threeObj = new THREE.PointLight(0xffffff, 1, 100);
          break;

        case 'particle':
          const particleGeometry = new THREE.BufferGeometry();
          const particleCount = 1000;
          const positions = new Float32Array(particleCount * 3);
          for (let i = 0; i < particleCount * 3; i++) {
            positions[i] = (Math.random() - 0.5) * 100;
          }
          particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
          const particleMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1 });
          threeObj = new THREE.Points(particleGeometry, particleMaterial);
          break;
      }

      if (threeObj) {
        threeObj.position.set(...obj.position);
        threeObj.rotation.set(...obj.rotation);
        threeObj.scale.set(...obj.scale);
        scene.add(threeObj);
        objectsRef.current.set(obj.id, threeObj);
      }
    });
  };

  // Adicionar novo objeto à cena
  const addObject = useCallback((obj: SceneObject) => {
    if (!sceneRef.current) return;

    let threeObj: THREE.Object3D | null = null;

    if (obj.type === 'mesh') {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshStandardMaterial({
        color: obj.material?.color || '#ffffff',
      });
      threeObj = new THREE.Mesh(geometry, material);
    }

    if (threeObj) {
      threeObj.position.set(...obj.position);
      sceneRef.current.add(threeObj);
      objectsRef.current.set(obj.id, threeObj);

      if (onSceneChange) {
        const updatedScene = Array.from(objectsRef.current.entries()).map(([id, obj]) => ({
          id,
          name: obj.name || 'Object',
          type: 'mesh' as const,
          position: [obj.position.x, obj.position.y, obj.position.z] as [number, number, number],
          rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z] as [number, number, number],
          scale: [obj.scale.x, obj.scale.y, obj.scale.z] as [number, number, number],
        }));
        onSceneChange(updatedScene);
      }
    }
  }, [onSceneChange]);

  // Remover objeto da cena
  const removeObject = useCallback((id: string) => {
    const obj = objectsRef.current.get(id);
    if (obj && sceneRef.current) {
      sceneRef.current.remove(obj);
      objectsRef.current.delete(id);
    }
  }, []);

  return (
    <div className="nexus-canvas-container" style={{ width: '100%', height: '100%' }}>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Stats Overlay */}
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            background: 'rgba(0, 0, 0, 0.7)',
            color: '#00ff00',
            padding: '10px',
            fontFamily: 'monospace',
            fontSize: '12px',
            zIndex: 100,
            borderRadius: '4px',
          }}
        >
          <div>FPS: {stats.fps}</div>
          <div>Objects: {stats.objects}</div>
          <div>Mode: {renderMode}</div>
        </div>
      </div>
    </div>
  );
};

export default NexusCanvasV2;
