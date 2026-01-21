'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import type { Asset } from './ContentBrowser';

interface AssetPreviewPanelProps {
  asset: Asset | null;
  lowPoly: boolean;
}

function formatSize(bytes?: number): string {
  if (!bytes) return '-';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value.toFixed(value >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`;
}

function getExtension(asset: Asset): string {
  if (asset.extension) return asset.extension.replace('.', '').toLowerCase();
  const fromPath = asset.path.split('.').pop();
  return fromPath ? fromPath.toLowerCase() : '';
}

function getLoaderByExtension(ext: string) {
  if (['gltf', 'glb'].includes(ext)) return GLTFLoader;
  if (['fbx'].includes(ext)) return FBXLoader;
  if (['obj'].includes(ext)) return OBJLoader;
  return null;
}

function applyLowPolyStyle(object: THREE.Object3D) {
  object.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const geom = mesh.geometry as THREE.BufferGeometry;
      const flatGeom = geom.index ? geom.toNonIndexed() : geom.clone();
      flatGeom.computeVertexNormals();
      mesh.geometry = flatGeom;
      mesh.material = new THREE.MeshStandardMaterial({
        color: '#7c83ff',
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

function ModelPreview({ url, lowPoly, extension }: { url: string; lowPoly: boolean; extension: string }) {
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
    const scale = 1.6 / maxDim;
    previewObject.scale.setScalar(scale);
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

export default function AssetPreviewPanel({ asset, lowPoly }: AssetPreviewPanelProps) {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadUrl() {
      if (!asset) {
        setDownloadUrl(null);
        setError(null);
        return;
      }

      if (asset.thumbnail && asset.type !== 'mesh') {
        setDownloadUrl(asset.thumbnail);
        setError(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/assets/${asset.id}/download`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error || 'Falha ao carregar preview');
        }
        const data = await response.json();
        if (!cancelled) {
          setDownloadUrl(data.downloadUrl || asset.thumbnail || null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Falha ao carregar preview');
          setDownloadUrl(asset?.thumbnail || null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadUrl();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [asset]);

  if (!asset) {
    return (
      <div style={{ padding: '16px', color: '#8b8b9e', fontSize: '12px' }}>
        Selecione um asset para visualizar o preview.
      </div>
    );
  }

  const extension = getExtension(asset);
  const isMesh = asset.type === 'mesh';
  const isTexture = asset.type === 'texture';
  const isAudio = asset.type === 'audio';
  const isVideo = asset.type === 'video';
  const canLoadMesh = isMesh && !!downloadUrl && ['gltf', 'glb', 'fbx', 'obj'].includes(extension);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>
      <div
        style={{
          width: '100%',
          aspectRatio: '16 / 10',
          borderRadius: '10px',
          border: '1px solid #2a2a3a',
          background: '#0f0f14',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {loading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(15, 15, 20, 0.8)',
              color: '#8b8b9e',
              fontSize: '12px',
              zIndex: 2,
            }}
          >
            Carregando preview...
          </div>
        )}

        {canLoadMesh ? (
          <Canvas camera={{ position: [2.4, 2.1, 2.4], fov: 45 }}>
            <ambientLight intensity={0.6} />
            <directionalLight position={[4, 6, 4]} intensity={0.9} />
            <Suspense fallback={null}>
              <ModelPreview url={downloadUrl} lowPoly={lowPoly} extension={extension} />
            </Suspense>
            <OrbitControls enablePan={false} />
          </Canvas>
        ) : isTexture && downloadUrl ? (
          <img
            src={downloadUrl}
            alt={asset.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : isAudio && downloadUrl ? (
          <div style={{ padding: '16px' }}>
            <audio controls style={{ width: '100%' }} src={downloadUrl} />
          </div>
        ) : isVideo && downloadUrl ? (
          <video controls style={{ width: '100%', height: '100%' }} src={downloadUrl} />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6b7280',
              fontSize: '12px',
              textAlign: 'center',
              padding: '12px',
            }}
          >
            Preview indisponível para este asset.
          </div>
        )}
      </div>

      {error && (
        <div style={{ color: '#ef4444', fontSize: '11px' }}>{error}</div>
      )}

      <div style={{ display: 'grid', gap: '6px', fontSize: '12px', color: '#cbd5f5' }}>
        <div style={{ fontWeight: 600, color: '#e4e4eb' }}>{asset.name}</div>
        <div>Tipo: {asset.type}</div>
        <div>Tamanho: {formatSize(asset.size)}</div>
        <div>Extensão: {extension || '-'}</div>
        <div style={{ color: '#8b8b9e', wordBreak: 'break-all' }}>{asset.path}</div>
      </div>

      {asset.metadata && (
        <div
          style={{
            borderTop: '1px solid #2a2a3a',
            paddingTop: '10px',
            display: 'grid',
            gap: '6px',
            fontSize: '11px',
            color: '#9aa4b2',
          }}
        >
          {asset.metadata.vertices !== undefined && (
            <div>Vertices: {asset.metadata.vertices}</div>
          )}
          {asset.metadata.triangles !== undefined && (
            <div>Triangles: {asset.metadata.triangles}</div>
          )}
          {asset.metadata.width !== undefined && asset.metadata.height !== undefined && (
            <div>Dimensão: {asset.metadata.width} × {asset.metadata.height}</div>
          )}
          {asset.metadata.duration !== undefined && (
            <div>Duração: {asset.metadata.duration}s</div>
          )}
        </div>
      )}
    </div>
  );
}
