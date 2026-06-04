'use client';

import Image from 'next/image';
import { AlertTriangle, Download, Package, Play, RefreshCw, Square, Star, Trash2, Verified } from 'lucide-react';
import type { LoadedExtension, MarketplaceExtension } from '@/lib/extensions/extension-system';
import type { DisplayMode } from './ExtensionManagerPanel.types';

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

export function InstalledExtensionCard({
  extension,
  displayMode,
  selected,
  onSelect,
  onActivate,
  onDeactivate,
  onUninstall,
}: {
  extension: LoadedExtension;
  displayMode: DisplayMode;
  selected: boolean;
  onSelect: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
  onUninstall: () => void;
}) {
  const isActive = extension.status === 'active';
  const hasError = extension.status === 'error';

  if (displayMode === 'grid') {
    return (
      <div
        onClick={onSelect}
        className={`
          p-4 rounded-lg border cursor-pointer transition-colors
          ${selected ? 'border-[var(--aethel-info)] bg-[var(--aethel-surface-secondary)]' : 'border-[var(--aethel-border-primary)] hover:border-[var(--aethel-border-strong)]'}
        `}
      >
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-[var(--aethel-surface-tertiary)] rounded-lg flex items-center justify-center text-2xl">
            {extension.manifest.icon ? (
              <Image
                src={extension.manifest.icon}
                alt=""
                width={48}
                height={48}
                unoptimized
                className="w-full h-full rounded-lg"
              />
            ) : (
              <Package size={22} className="text-[var(--aethel-text-tertiary)]" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate">{extension.manifest.displayName}</h3>
            <p className="text-xs text-[var(--aethel-text-tertiary)]">{extension.manifest.publisher}</p>
          </div>
          {hasError && <AlertTriangle size={16} className="text-[var(--aethel-error-light)]" />}
        </div>
        <p className="mt-2 text-xs text-[var(--aethel-text-secondary)] line-clamp-2">
          {extension.manifest.description}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <span className={`
            px-2 py-0.5 rounded text-xs
            ${isActive ? 'bg-[color-mix(in_srgb,var(--aethel-success)_20%,transparent)] text-[var(--aethel-success-light)]' : 'bg-[color-mix(in_srgb,var(--aethel-text-tertiary)_20%,transparent)] text-[var(--aethel-text-tertiary)]'}
          `}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
          <span className="text-xs text-[var(--aethel-text-tertiary)]">v{extension.manifest.version}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onSelect}
      className={`
        flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors
        ${selected ? 'bg-[var(--aethel-surface-secondary)]' : 'hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)]'}
      `}
    >
      <div className="w-10 h-10 bg-[var(--aethel-surface-tertiary)] rounded-lg flex items-center justify-center">
        {extension.manifest.icon ? (
          <Image
            src={extension.manifest.icon}
            alt=""
            width={40}
            height={40}
            unoptimized
            className="w-full h-full rounded-lg"
          />
        ) : (
          <Package size={20} className="text-[var(--aethel-text-tertiary)]" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium truncate">{extension.manifest.displayName}</h3>
          {hasError && <AlertTriangle size={14} className="text-[var(--aethel-error-light)]" />}
        </div>
        <p className="text-xs text-[var(--aethel-text-tertiary)] truncate">
          {extension.manifest.publisher} • v{extension.manifest.version}
        </p>
      </div>

      <div className="flex items-center gap-1">
        <button type="button" aria-label={isActive ? `Disable extension ${extension.manifest.displayName}` : `Enable extension ${extension.manifest.displayName}`}
          onClick={(e) => {
            e.stopPropagation();
            isActive ? onDeactivate() : onActivate();
          }}
          className="p-1.5 hover:bg-[var(--aethel-surface-tertiary)] rounded"
          title={isActive ? 'Disable' : 'Enable'}
        >
          {isActive ? <Square size={14} /> : <Play size={14} />}
        </button>
        <button type="button" aria-label={`Uninstall extension ${extension.manifest.displayName}`}
          onClick={(e) => {
            e.stopPropagation();
            onUninstall();
          }}
          className="p-1.5 hover:bg-[var(--aethel-surface-tertiary)] rounded text-[var(--aethel-error-light)]"
          title="Uninstall"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

export function MarketplaceExtensionCard({
  extension,
  displayMode,
  installing,
  onInstall,
}: {
  extension: MarketplaceExtension;
  displayMode: DisplayMode;
  installing: boolean;
  onInstall: () => void;
}) {
  if (displayMode === 'grid') {
    return (
      <div className="p-4 rounded-lg border border-[var(--aethel-border-primary)] hover:border-[var(--aethel-border-strong)] transition-colors">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-[var(--aethel-surface-tertiary)] rounded-lg flex items-center justify-center">
            {extension.icon ? (
              <Image
                src={extension.icon}
                alt=""
                width={48}
                height={48}
                unoptimized
                className="w-full h-full rounded-lg"
              />
            ) : (
              <Package size={22} className="text-[var(--aethel-text-tertiary)]" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <h3 className="font-medium truncate">{extension.displayName}</h3>
              {extension.verified && (
                <Verified size={14} className="text-[var(--aethel-info-light)]" />
              )}
            </div>
            <p className="text-xs text-[var(--aethel-text-tertiary)]">{extension.publisherDisplayName}</p>
          </div>
        </div>
        <p className="mt-2 text-xs text-[var(--aethel-text-secondary)] line-clamp-2">
          {extension.description}
        </p>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-[var(--aethel-text-tertiary)]">
            <span className="flex items-center gap-1">
              <Star size={12} className="text-[var(--aethel-warning-light)]" />
              {extension.rating.toFixed(1)}
            </span>
            <span className="flex items-center gap-1">
              <Download size={12} />
              {formatNumber(extension.downloads)}
            </span>
          </div>
          <button type="button" aria-label={`Install extension ${extension.displayName}`}
            onClick={onInstall}
            disabled={installing}
            className="px-3 py-1 bg-[var(--aethel-info)] text-[var(--aethel-text-primary)] rounded text-xs font-medium disabled:opacity-50"
          >
            {installing ? <RefreshCw size={12} className="animate-spin" /> : 'Install'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] transition-colors">
      <div className="w-10 h-10 bg-[var(--aethel-surface-tertiary)] rounded-lg flex items-center justify-center">
        {extension.icon ? (
          <Image
            src={extension.icon}
            alt=""
            width={40}
            height={40}
            unoptimized
            className="w-full h-full rounded-lg"
          />
        ) : (
          <Package size={20} className="text-[var(--aethel-text-tertiary)]" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <h3 className="font-medium truncate">{extension.displayName}</h3>
          {extension.verified && <Verified size={14} className="text-[var(--aethel-info-light)]" />}
        </div>
        <p className="text-xs text-[var(--aethel-text-tertiary)] truncate">
          {extension.publisherDisplayName} •
          <span className="ml-1 inline-flex items-center gap-1">
            <Star size={10} className="text-[var(--aethel-warning-light)]" />
            {extension.rating.toFixed(1)}
          </span>
          <span className="ml-2 inline-flex items-center gap-1">
            <Download size={10} />
            {formatNumber(extension.downloads)}
          </span>
        </p>
      </div>

      <button type="button" aria-label={`Install extension ${extension.displayName}`}
        onClick={onInstall}
        disabled={installing}
        className="px-3 py-1.5 bg-[var(--aethel-info)] text-[var(--aethel-text-primary)] rounded text-sm font-medium disabled:opacity-50"
      >
        {installing ? <RefreshCw size={14} className="animate-spin" /> : 'Install'}
      </button>
    </div>
  );
}

export function UpdateCard({
  update,
  installing,
  onUpdate,
}: {
  update: { id: string; currentVersion: string; latestVersion: string };
  installing: boolean;
  onUpdate: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--aethel-surface-secondary)]">
      <div className="w-10 h-10 bg-[var(--aethel-surface-tertiary)] rounded-lg flex items-center justify-center">
        <Package size={20} className="text-[var(--aethel-text-tertiary)]" />
      </div>

      <div className="flex-1">
        <h3 className="font-medium">{update.id}</h3>
        <p className="text-xs text-[var(--aethel-text-tertiary)]">
          {update.currentVersion} → {update.latestVersion}
        </p>
      </div>

      <button type="button" aria-label={`Update extension ${update.id}`}
        onClick={onUpdate}
        disabled={installing}
        className="px-3 py-1.5 bg-[var(--aethel-success)] text-[var(--aethel-text-primary)] rounded text-sm font-medium disabled:opacity-50"
      >
        {installing ? <RefreshCw size={14} className="animate-spin" /> : 'Update'}
      </button>
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}
