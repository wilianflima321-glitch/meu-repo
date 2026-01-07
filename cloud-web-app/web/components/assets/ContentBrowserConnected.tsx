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

import React, { useState, useCallback, useMemo } from 'react';
import ContentBrowser, { Asset, AssetFolder, AssetType } from './ContentBrowser';
import useProjectAssets, { uploadLargeAsset, Asset as HookAsset, AssetFolder as HookFolder } from '@/hooks/useProjectAssets';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

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
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<AssetType | 'all'>('all');
  const [currentPath, setCurrentPath] = useState('/Content');

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
    path: currentPath,
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
    if (!confirm(`Tem certeza que deseja excluir "${asset.name}"?`)) return;
    
    try {
      await deleteAsset(asset.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete asset');
    }
  }, [deleteAsset]);

  // ============================================================================
  // RENAME HANDLER
  // ============================================================================

  const handleRename = useCallback(async (asset: Asset, newName: string) => {
    try {
      await renameAsset(asset.id, newName);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to rename asset');
    }
  }, [renameAsset]);

  // ============================================================================
  // CREATE FOLDER HANDLER
  // ============================================================================

  const handleCreateFolder = useCallback(async (parentPath: string, name: string) => {
    try {
      await createFolder(parentPath, name);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create folder');
    }
  }, [createFolder]);

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
        onAssetSelect={onAssetSelect}
        onAssetDragStart={(asset) => onAssetDragStart?.(asset)}
        onAssetDelete={handleDelete}
        onAssetRename={handleRename}
        onUpload={handleUpload}
        onCreateFolder={handleCreateFolder}
        onRefresh={refresh}
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
