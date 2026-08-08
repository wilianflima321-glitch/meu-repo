'use client';

// @aethel-heavy-async-boundary: loaded by ContentBrowser only when the asset preview pane is visible.

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import type { Asset } from './ContentBrowser';

interface AssetPreviewPanelProps {
  asset: Asset | null;
  lowPoly: boolean;
}

const AssetMeshPreview = dynamic(
  () => import('@/lib/assets/asset-preview-mesh-runtime').then((mod) => mod.AssetMeshPreview),
  {
    ssr: false,
    loading: () => (
      <div style={{ display: 'grid', height: '100%', placeItems: 'center', color: 'var(--aethel-text-tertiary)', fontSize: '12px' }}>
        Loading mesh...
      </div>
    ),
  },
);

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
          throw new Error(payload?.error || 'Failed to load preview');
        }
        const data = await response.json();
        if (!cancelled) {
          setDownloadUrl(data.downloadUrl || asset.thumbnail || null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load preview');
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
      <div style={{ padding: '16px', color: 'var(--aethel-text-tertiary)', fontSize: '12px' }}>
        Select an asset to preview.
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
          border: '1px solid var(--aethel-border-primary)',
          background: 'var(--aethel-surface-primary)',
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
              background: 'var(--aethel-editor-overlay-bg-soft)',
              color: 'var(--aethel-text-tertiary)',
              fontSize: '12px',
              zIndex: 2,
            }}
          >
            Loading preview...
          </div>
        )}

        {canLoadMesh ? (
          <AssetMeshPreview url={downloadUrl} lowPoly={lowPoly} extension={extension} />
        ) : isTexture && downloadUrl ? (
          <Image
            src={downloadUrl}
            alt={asset.name}
            width={640}
            height={480}
            unoptimized
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
              color: 'var(--aethel-text-quaternary)',
              fontSize: '12px',
              textAlign: 'center',
              padding: '12px',
            }}
          >
            Preview inavailable para este asset.
          </div>
        )}
      </div>

      {error && (
        <div style={{ color: 'var(--aethel-error)', fontSize: '11px' }}>{error}</div>
      )}

      <div style={{ display: 'grid', gap: '6px', fontSize: '12px', color: 'var(--aethel-text-secondary)' }}>
        <div style={{ fontWeight: 600, color: 'var(--aethel-text-primary)' }}>{asset.name}</div>
        <div>Tipo: {asset.type}</div>
        <div>Tamanho: {formatSize(asset.size)}</div>
        <div>Extension: {extension || '-'}</div>
        <div style={{ color: 'var(--aethel-text-tertiary)', wordBreak: 'break-all' }}>{asset.path}</div>
      </div>

      {asset.metadata && (
        <div
          style={{
            borderTop: '1px solid var(--aethel-border-primary)',
            paddingTop: '10px',
            display: 'grid',
            gap: '6px',
            fontSize: '11px',
            color: 'var(--aethel-text-quaternary)',
          }}
        >
          {asset.metadata.vertices !== undefined && (
            <div>Vertices: {asset.metadata.vertices}</div>
          )}
          {asset.metadata.triangles !== undefined && (
            <div>Triangles: {asset.metadata.triangles}</div>
          )}
          {asset.metadata.width !== undefined && asset.metadata.height !== undefined && (
            <div>Dimensions: {asset.metadata.width} × {asset.metadata.height}</div>
          )}
          {asset.metadata.duration !== undefined && (
            <div>Duration: {asset.metadata.duration}s</div>
          )}
        </div>
      )}
    </div>
  );
}
