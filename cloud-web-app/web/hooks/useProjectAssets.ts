/**
 * useProjectAssets Hook
 * 
 * Fetches and manages project assets with real-time updates.
 * Replaces mock data in ContentBrowser with real server data.
 * 
 * Features:
 * - SWR for caching and revalidation
 * - Optimistic updates
 * - Search and filter support
 * - Pagination for AAA-scale projects
 */

'use client';

import useSWR, { mutate } from 'swr';
import { useCallback, useState } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type AssetType = 
  | 'mesh'
  | 'texture'
  | 'material'
  | 'audio'
  | 'video'
  | 'blueprint'
  | 'animation'
  | 'prefab'
  | 'level'
  | 'script'
  | 'folder'
  | 'other';

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  path: string;
  extension: string;
  size: number;
  thumbnail?: string;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    vertices?: number;
    triangles?: number;
    tags?: string[];
  };
  isFavorite: boolean;
  createdAt: string;
  modifiedAt: string;
}

export interface AssetFolder {
  id: string;
  name: string;
  path: string;
  children: (Asset | AssetFolder)[];
  isExpanded?: boolean;
}

export interface AssetsResponse {
  assets: (Asset | AssetFolder)[];
  flatAssets: Asset[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UseProjectAssetsOptions {
  search?: string;
  type?: AssetType | 'all';
  path?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// FETCHER
// ============================================================================

const fetcher = async (url: string): Promise<AssetsResponse> => {
  const response = await fetch(url);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch assets');
  }
  return response.json();
};

// ============================================================================
// HOOK
// ============================================================================

export function useProjectAssets(projectId: string | null, options: UseProjectAssetsOptions = {}) {
  const { search = '', type = 'all', path = '/Content', page = 1, limit = 100 } = options;
  
  // Build query string
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (type && type !== 'all') params.set('type', type);
  if (path) params.set('path', path);
  params.set('page', page.toString());
  params.set('limit', limit.toString());
  
  const queryString = params.toString();
  const key = projectId ? `/api/projects/${projectId}/assets?${queryString}` : null;
  
  const { data, error, isLoading, isValidating } = useSWR<AssetsResponse>(
    key,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
      errorRetryCount: 3,
    }
  );

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  const uploadAsset = useCallback(async (file: File, assetType?: string) => {
    if (!projectId) throw new Error('No project selected');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', projectId);
    if (assetType) formData.append('type', assetType);

    const response = await fetch('/api/assets/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Upload failed');
    }

    const newAsset = await response.json();
    
    // Revalidate the assets list
    mutate(key);
    
    return newAsset;
  }, [projectId, key]);

  const deleteAsset = useCallback(async (assetId: string) => {
    if (!projectId) throw new Error('No project selected');

    const response = await fetch(`/api/assets/${assetId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Delete failed');
    }

    // Optimistic update
    mutate(
      key,
      (current: AssetsResponse | undefined) => {
        if (!current) return current;
        return {
          ...current,
          flatAssets: current.flatAssets.filter(a => a.id !== assetId),
        };
      },
      { revalidate: true }
    );
  }, [projectId, key]);

  const renameAsset = useCallback(async (assetId: string, newName: string) => {
    if (!projectId) throw new Error('No project selected');

    const response = await fetch(`/api/assets/${assetId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Rename failed');
    }

    // Revalidate
    mutate(key);
  }, [projectId, key]);

  const toggleFavorite = useCallback(async (assetId: string) => {
    if (!projectId) throw new Error('No project selected');

    // Optimistic update
    mutate(
      key,
      (current: AssetsResponse | undefined) => {
        if (!current) return current;
        return {
          ...current,
          flatAssets: current.flatAssets.map(a =>
            a.id === assetId ? { ...a, isFavorite: !a.isFavorite } : a
          ),
        };
      },
      { revalidate: false }
    );

    const response = await fetch(`/api/assets/${assetId}/favorite`, {
      method: 'POST',
    });

    if (!response.ok) {
      // Revert on error
      mutate(key);
    }
  }, [projectId, key]);

  const createFolder = useCallback(async (parentPath: string, folderName: string) => {
    if (!projectId) throw new Error('No project selected');

    const response = await fetch(`/api/projects/${projectId}/folders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentPath, name: folderName }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Create folder failed');
    }

    mutate(key);
  }, [projectId, key]);

  const refresh = useCallback(() => {
    mutate(key);
  }, [key]);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // Data
    assets: data?.assets || [],
    flatAssets: data?.flatAssets || [],
    pagination: data?.pagination || { page: 1, limit: 100, total: 0, totalPages: 0 },
    
    // State
    isLoading,
    isValidating,
    error,
    
    // Actions
    uploadAsset,
    deleteAsset,
    renameAsset,
    toggleFavorite,
    createFolder,
    refresh,
  };
}

// ============================================================================
// PRESIGNED URL UPLOAD (for large files - S3 Direct)
// ============================================================================

export async function uploadLargeAsset(
  projectId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<Asset> {
  // 1. Get presigned URL from server
  const presignResponse = await fetch('/api/assets/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    }),
  });

  if (!presignResponse.ok) {
    throw new Error('Failed to get upload URL');
  }

  const { uploadUrl, assetId, fields, method } = await presignResponse.json();

  if (!uploadUrl || !assetId) {
    throw new Error('Presign response is missing required upload data');
  }

  const uploadMethod = typeof method === 'string'
    ? method.toUpperCase()
    : fields && Object.keys(fields).length > 0
      ? 'POST'
      : 'PUT';

  // 2. Upload directly to storage (bypasses app server)
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener('progress', (event) => {
      if (!onProgress || !event.lengthComputable) return;
      const pct = Math.min(95, Math.max(1, Math.round((event.loaded / event.total) * 95)));
      onProgress(pct);
    });
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(98);
        resolve();
        return;
      }
      reject(new Error(`Direct upload failed (${xhr.status})`));
    });
    xhr.addEventListener('error', () => reject(new Error('Direct upload failed')));

    xhr.open(uploadMethod, uploadUrl);

    if (uploadMethod === 'POST') {
      const formData = new FormData();
      if (fields && typeof fields === 'object') {
        Object.entries(fields).forEach(([key, value]) => {
          formData.append(key, String(value));
        });
      }
      formData.append('file', file);
      xhr.send(formData);
      return;
    }

    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.send(file);
  });

  // 3. Confirm upload and get asset metadata
  const confirmResponse = await fetch(`/api/assets/${assetId}/confirm`, {
    method: 'POST',
  });

  if (!confirmResponse.ok) {
    throw new Error('Failed to confirm upload');
  }

  onProgress?.(100);
  return confirmResponse.json();
}

export default useProjectAssets;
