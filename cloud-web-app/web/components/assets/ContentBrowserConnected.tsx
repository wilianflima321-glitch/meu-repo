/**
 * Content Browser Connected - Real Data Integration
 * 
 * Wrapper around ContentBrowser that connects to real backend APIs.
 * Replaces DEMO_ASSETS with live project data from useProjectAssets hook.
 * 
 * Features:
 * - Real-time asset loading from server
 * - Upload with progress tracking
 * - Large file support via presigned URLs
 * - Optimistic updates
 * - Error handling with toast notifications
 */

'use client';

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import ContentBrowser, { Asset, AssetFolder, AssetType } from './ContentBrowser';
import useProjectAssets, { uploadLargeAsset, Asset as HookAsset, AssetFolder as HookFolder } from '@/hooks/useProjectAssets';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast, ConfirmModal } from '@/components/ui';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// ============================================================================
// TYPES
// ============================================================================

interface ContentBrowserConnectedProps {
  projectId: string;
  onAssetSelect?: (asset: Asset) => void;
  onAssetDragStart?: (asset: Asset) => void;
}

interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'processing' | 'done' | 'error';
  error?: string;
}

// ============================================================================
// PREVIEW HELPERS
// ============================================================================

function isImageAsset(asset: Asset) {
  return asset.type === 'texture' || asset.extension?.match(/\.(png|jpg|jpeg|webp|gif|bmp)$/i);
}

function isVideoAsset(asset: Asset) {
  return asset.type === 'video' || asset.extension?.match(/\.(mp4|webm|mov|mkv|avi)$/i);
}

function isAudioAsset(asset: Asset) {
  return asset.type === 'audio' || asset.extension?.match(/\.(mp3|wav|ogg|flac|aac)$/i);
}

function isModelAsset(asset: Asset) {
  return asset.type === 'mesh' || asset.extension?.match(/\.(gltf|glb)$/i);
}

function ModelPreview({ url }: { url: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x101018);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 5000);
    camera.position.set(0, 0.5, 3);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    rendererRef.current = renderer;

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
        console.error('Failed to load model preview:', error);
      }
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
      rendererRef.current = null;
    };
  }, [url]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block', borderRadius: '8px' }}
    />
  );
}

function AssetPreviewModal({
  asset,
  previewUrl,
  isLoading,
  error,
  onClose,
}: {
  asset: Asset | null;
  previewUrl: string | null;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  if (!asset) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(6, 6, 10, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 200,
      padding: '24px',
    }} onClick={onClose}>
      <div style={{
        width: 'min(900px, 92vw)',
        height: 'min(640px, 86vh)',
        background: '#0f0f14',
        border: '1px solid #2a2a3a',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 40px rgba(0,0,0,0.45)',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid #1f1f2d',
          color: '#e4e4eb',
          fontSize: '14px',
        }}>
          <div style={{ fontWeight: 600 }}>{asset.name}</div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#a1a1b3',
              cursor: 'pointer',
              fontSize: '18px',
            }}
            aria-label="Fechar preview"
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1, padding: '16px', display: 'flex', gap: '16px', minHeight: 0 }}>
          <div style={{ flex: 1, minHeight: 0, background: '#12121a', borderRadius: '8px', padding: '12px' }}>
            {isLoading && (
              <div style={{ color: '#8b8b9e', fontSize: '13px' }}>Carregando preview...</div>
            )}
            {error && (
              <div style={{ color: '#ef4444', fontSize: '13px' }}>{error}</div>
            )}
            {!isLoading && !error && isImageAsset(asset) && (
              <img
                src={previewUrl || asset.path}
                alt={asset.name}
                style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '6px' }}
              />
            )}
            {!isLoading && !error && isVideoAsset(asset) && (
              <video controls style={{ width: '100%', height: '100%', borderRadius: '6px' }}>
                <source src={previewUrl || asset.path} />
              </video>
            )}
            {!isLoading && !error && isAudioAsset(asset) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', color: '#e4e4eb' }}>
                <audio controls src={previewUrl || asset.path} />
                <span style={{ fontSize: '12px', color: '#8b8b9e' }}>Preview de áudio</span>
              </div>
            )}
            {!isLoading && !error && isModelAsset(asset) && (
              <div style={{ width: '100%', height: '100%' }}>
                <ModelPreview url={previewUrl || asset.path} />
              </div>
            )}
            {!isLoading && !error && !isImageAsset(asset) && !isVideoAsset(asset) && !isAudioAsset(asset) && !isModelAsset(asset) && (
              <div style={{ color: '#8b8b9e', fontSize: '13px' }}>Preview não disponível para este tipo.</div>
            )}
          </div>

          <div style={{ width: '260px', color: '#c9c9d4', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <div style={{ color: '#8b8b9e', textTransform: 'uppercase', fontSize: '10px' }}>Tipo</div>
              <div>{asset.type}</div>
            </div>
            <div>
              <div style={{ color: '#8b8b9e', textTransform: 'uppercase', fontSize: '10px' }}>Tamanho</div>
              <div>{((asset.size ?? 0) / (1024 * 1024)).toFixed(2)} MB</div>
            </div>
            <div>
              <div style={{ color: '#8b8b9e', textTransform: 'uppercase', fontSize: '10px' }}>Path</div>
              <div style={{ wordBreak: 'break-all' }}>{asset.path}</div>
            </div>
            {asset.metadata && (
              <div>
                <div style={{ color: '#8b8b9e', textTransform: 'uppercase', fontSize: '10px' }}>Metadata</div>
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: '11px', color: '#9fa0b3' }}>
                  {JSON.stringify(asset.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// UPLOAD THRESHOLD - Files larger than this use presigned URLs
// ============================================================================

const LARGE_FILE_THRESHOLD = 50 * 1024 * 1024; // 50MB

// ============================================================================
// TYPE CONVERSION
// ============================================================================

function convertHookAsset(hookAsset: HookAsset): Asset {
  return {
    id: hookAsset.id,
    name: hookAsset.name,
    type: hookAsset.type === 'script' ? 'other' : hookAsset.type as AssetType,
    path: hookAsset.path,
    extension: hookAsset.extension,
    size: hookAsset.size,
    thumbnail: hookAsset.thumbnail,
    metadata: hookAsset.metadata,
    isFavorite: hookAsset.isFavorite,
    createdAt: hookAsset.createdAt,
    modifiedAt: hookAsset.modifiedAt,
  };
}

function convertHookFolder(hookFolder: HookFolder): AssetFolder {
  return {
    id: hookFolder.id,
    name: hookFolder.name,
    path: hookFolder.path,
    children: hookFolder.children.map(item => {
      if ('children' in item) {
        return convertHookFolder(item as HookFolder);
      }
      return convertHookAsset(item as HookAsset);
    }),
    isExpanded: hookFolder.isExpanded,
  };
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ContentBrowserConnected: React.FC<ContentBrowserConnectedProps> = ({
  projectId,
  onAssetSelect,
  onAssetDragStart,
}) => {
  const toast = useToast();
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<AssetType | 'all'>('all');
  const [currentPath, setCurrentPath] = useState<string | null>('/Content');

  // Fetch assets from server
  const {
    assets: hookAssets,
    flatAssets,
    pagination,
    isLoading,
    isValidating,
    error,
    uploadAsset,
    deleteAsset,
    renameAsset,
    toggleFavorite,
    createFolder,
    refresh,
  } = useProjectAssets(projectId, {
    search,
    type: filterType === 'all' ? undefined : filterType,
    path: currentPath ?? undefined,
  });

  // Convert hook types to component types
  const assets = useMemo(() => {
    return hookAssets.map(item => {
      if ('children' in item) {
        return convertHookFolder(item as HookFolder);
      }
      return convertHookAsset(item as HookAsset);
    });
  }, [hookAssets]);

  // ============================================================================
  // UPLOAD HANDLER - Smart routing based on file size
  // ============================================================================

  const handleUpload = useCallback(async (files: FileList) => {
    const fileArray = Array.from(files);

    for (const file of fileArray) {
      const uploadId = `${file.name}-${Date.now()}`;
      
      // Add to progress tracking
      setUploadProgress(prev => [...prev, {
        fileName: file.name,
        progress: 0,
        status: 'uploading',
      }]);

      try {
        if (file.size > LARGE_FILE_THRESHOLD) {
          // Large file - use presigned URL for direct S3 upload
          await uploadLargeAsset(projectId, file, (progress) => {
            setUploadProgress(prev => 
              prev.map(p => p.fileName === file.name ? { ...p, progress } : p)
            );
          });
        } else {
          // Small file - upload through our server
          await uploadAsset(file);
        }

        // Mark as done
        setUploadProgress(prev => 
          prev.map(p => p.fileName === file.name ? { ...p, status: 'done', progress: 100 } : p)
        );

        // Remove from list after delay
        setTimeout(() => {
          setUploadProgress(prev => prev.filter(p => p.fileName !== file.name));
        }, 3000);

      } catch (err) {
        setUploadProgress(prev => 
          prev.map(p => p.fileName === file.name ? {
            ...p,
            status: 'error',
            error: err instanceof Error ? err.message : 'Upload failed',
          } : p)
        );
      }
    }
  }, [projectId, uploadAsset]);

  // ============================================================================
  // DELETE HANDLER
  // ============================================================================

  const handleDelete = useCallback(async (asset: Asset) => {
    if (!window.confirm(`Tem certeza que deseja excluir "${asset.name}"?`)) return;
    
    try {
      await deleteAsset(asset.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete asset');
    }
  }, [deleteAsset, toast]);

  // ============================================================================
  // RENAME HANDLER
  // ============================================================================

  const handleRename = useCallback(async (asset: Asset, newName: string) => {
    try {
      await renameAsset(asset.id, newName);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to rename asset');
    }
  }, [renameAsset, toast]);

  // ============================================================================
  // EXPORT HANDLER
  // ============================================================================

  const handleExport = useCallback(async (asset: Asset) => {
    try {
      let downloadUrl = asset.path;
      let fileName = asset.name || 'asset';

      if (!asset.id.startsWith('fs-')) {
        const response = await fetch(`/api/assets/${asset.id}/download`);
        if (response.ok) {
          const data = await response.json();
          if (data?.downloadUrl) downloadUrl = data.downloadUrl;
          if (data?.fileName) fileName = data.fileName;
        }
      }

      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = fileName;
      anchor.rel = 'noopener';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to export asset');
    }
  }, [toast]);

  // ============================================================================
  // CREATE FOLDER HANDLER
  // ============================================================================

  const handleCreateFolder = useCallback(async (parentPath: string, name: string) => {
    try {
      await createFolder(parentPath, name);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create folder');
    }
  }, [createFolder, toast]);

  // ============================================================================
  // DUPLICATE HANDLER
  // ============================================================================

  const handleDuplicate = useCallback(async (asset: Asset) => {
    try {
      const response = await fetch(`/api/assets/${asset.id}/duplicate`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error || 'Duplicate failed');
      }

      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to duplicate asset');
    }
  }, [refresh, toast]);

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (isLoading && !assets.length) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        background: '#0f0f14',
        color: '#8b8b9e',
      }}>
        <Loader2 size={32} className="animate-spin" style={{ marginRight: '12px' }} />
        <span>Carregando assets...</span>
      </div>
    );
  }

  // ============================================================================
  // ERROR STATE
  // ============================================================================

  if (error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        background: '#0f0f14',
        color: '#ef4444',
        gap: '12px',
      }}>
        <AlertCircle size={48} />
        <span>Erro ao carregar assets</span>
        <span style={{ color: '#8b8b9e', fontSize: '12px' }}>{error.message}</span>
        <button
          onClick={refresh}
          style={{
            padding: '8px 16px',
            background: '#6366f1',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      <ContentBrowser
        assets={assets}
        searchValue={search}
        filterTypeValue={filterType}
        selectedPathValue={currentPath}
        onSearchChange={setSearch}
        onFilterChange={setFilterType}
        onPathChange={setCurrentPath}
        onAssetSelect={(asset) => {
          setPreviewAsset(asset);
          setPreviewUrl(null);
          setPreviewError(null);
          setPreviewLoading(true);

          const resolvePreviewUrl = async () => {
            try {
              if (asset.path?.startsWith('s3://')) {
                const response = await fetch(`/api/assets/${asset.id}/download`);
                if (response.ok) {
                  const data = await response.json();
                  if (data?.downloadUrl) {
                    setPreviewUrl(data.downloadUrl);
                  }
                }
              }
            } catch (error) {
              setPreviewError(error instanceof Error ? error.message : 'Failed to load preview URL');
            } finally {
              setPreviewLoading(false);
            }
          };

          resolvePreviewUrl();
          onAssetSelect?.(asset);
        }}
        onAssetDragStart={(asset) => onAssetDragStart?.(asset)}
        onAssetDelete={handleDelete}
        onAssetRename={handleRename}
        onAssetExport={handleExport}
        onAssetDuplicate={handleDuplicate}
        onUpload={handleUpload}
        onCreateFolder={handleCreateFolder}
        onRefresh={refresh}
      />

      <AssetPreviewModal
        asset={previewAsset}
        previewUrl={previewUrl}
        isLoading={previewLoading}
        error={previewError}
        onClose={() => {
          setPreviewAsset(null);
          setPreviewUrl(null);
          setPreviewError(null);
          setPreviewLoading(false);
        }}
      />

      {/* Upload Progress Overlay */}
      {uploadProgress.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: '16px',
          right: '16px',
          background: '#16161d',
          border: '1px solid #2a2a3a',
          borderRadius: '8px',
          padding: '12px',
          minWidth: '280px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          zIndex: 100,
        }}>
          <div style={{ fontWeight: 600, marginBottom: '12px', color: '#e4e4eb' }}>
            Uploading {uploadProgress.length} file(s)
          </div>

          {uploadProgress.map((item, index) => (
            <div key={index} style={{ marginBottom: '8px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '4px',
              }}>
                {item.status === 'uploading' && (
                  <Loader2 size={14} className="animate-spin" style={{ color: '#6366f1' }} />
                )}
                {item.status === 'done' && (
                  <CheckCircle2 size={14} style={{ color: '#22c55e' }} />
                )}
                {item.status === 'error' && (
                  <AlertCircle size={14} style={{ color: '#ef4444' }} />
                )}
                <span style={{
                  color: '#e4e4eb',
                  fontSize: '12px',
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {item.fileName}
                </span>
                <span style={{ color: '#8b8b9e', fontSize: '11px' }}>
                  {item.progress}%
                </span>
              </div>

              {/* Progress bar */}
              <div style={{
                height: '4px',
                background: '#2a2a3a',
                borderRadius: '2px',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${item.progress}%`,
                  background: item.status === 'error' ? '#ef4444' : '#6366f1',
                  transition: 'width 0.2s',
                }} />
              </div>

              {item.error && (
                <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px' }}>
                  {item.error}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Validating indicator */}
      {isValidating && (
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          background: 'rgba(99, 102, 241, 0.1)',
          padding: '4px 8px',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <Loader2 size={12} className="animate-spin" style={{ color: '#6366f1' }} />
          <span style={{ color: '#6366f1', fontSize: '11px' }}>Sincronizando...</span>
        </div>
      )}
    </div>
  );
};

export default ContentBrowserConnected;
