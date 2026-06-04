'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  Download,
  Trash2,
  X,
  Star,
  Settings,
  RefreshCw,
  ExternalLink,
  CheckCircle,
  Circle,
  Clock,
} from 'lucide-react'
import {
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  formatDownloads,
  formatDate,
  type Extension,
} from './ExtensionManager.model'

// ============= Extension Card =============

interface ExtensionCardProps {
  extension: Extension
  isLoading: boolean
  isSelected: boolean
  onSelect: () => void
  onInstall: () => void
  onUninstall: () => void
  onToggle: () => void
  onOpenSettings: () => void
}

export function ExtensionCard({
  extension,
  isLoading,
  isSelected,
  onSelect,
  onInstall,
  onUninstall,
  onToggle,
  onOpenSettings,
}: ExtensionCardProps) {
  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 border-b border-[var(--aethel-border-primary)] cursor-pointer transition-colors ${
        isSelected ? 'bg-[var(--aethel-surface-secondary)]' : 'hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)]'
      } ${!extension.isEnabled && extension.isInstalled ? 'opacity-60' : ''}`}
      onClick={onSelect}
    >
      {/* Icon */}
      <div className="w-12 h-12 rounded-lg bg-[var(--aethel-surface-quaternary)] flex items-center justify-center flex-shrink-0">
        {extension.icon ? (
          <Image
            src={extension.icon}
            alt=""
            width={32}
            height={32}
            unoptimized
            className="w-8 h-8 rounded"
          />
        ) : (
          CATEGORY_ICONS[extension.category]
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-[var(--aethel-text-primary)] truncate">{extension.displayName}</span>
          <span className="text-xs text-[var(--aethel-text-tertiary)]">v{extension.version}</span>
          {extension.isBuiltIn && (
            <span className="px-1.5 py-0.5 bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-tertiary)] text-[10px] rounded">
              Built-in
            </span>
          )}
        </div>
        <p className="text-sm text-[var(--aethel-text-tertiary)] truncate mt-0.5">{extension.description}</p>
        <div className="flex items-center gap-3 mt-1 text-xs text-[var(--aethel-text-tertiary)]">
          <span>{extension.publisherDisplayName}</span>
          <span className="flex items-center gap-1">
            <Star className="w-3 h-3 text-[var(--aethel-warning-light)]" />
            {extension.rating.toFixed(1)}
          </span>
          <span className="flex items-center gap-1">
            <Download className="w-3 h-3" />
            {formatDownloads(extension.downloadCount)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        {isLoading ? (
          <RefreshCw className="w-4 h-4 animate-spin text-[var(--aethel-text-tertiary)]" />
        ) : extension.isInstalled ? (
          <>
            <button type="button" aria-label={extension.isEnabled ? `Disable extension ${extension.name}` : `Enable extension ${extension.name}`}
              onClick={onToggle}
              className={`p-1.5 rounded transition-colors ${
                extension.isEnabled
                  ? 'text-[var(--aethel-success)] hover:bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)]'
                  : 'text-[var(--aethel-text-tertiary)] hover:bg-[var(--aethel-surface-quaternary)]'
              }`}
              title={extension.isEnabled ? 'Disable' : 'Enable'}
            >
              {extension.isEnabled ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Circle className="w-4 h-4" />
              )}
            </button>
            <button type="button" aria-label={`Open settings for extension ${extension.name}`}
              onClick={onOpenSettings}
              className="p-1.5 text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-surface-quaternary)] rounded"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            {!extension.isBuiltIn && (
              <button type="button" aria-label={`Uninstall extension ${extension.name}`}
                onClick={onUninstall}
                className="p-1.5 text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-error)] hover:bg-[var(--aethel-surface-quaternary)] rounded"
                title="Uninstall"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </>
        ) : (
          <button type="button" aria-label={`Install extension ${extension.name}`}
            onClick={onInstall}
            className="px-3 py-1.5 bg-[var(--aethel-info)] hover:bg-[var(--aethel-info-dark)] text-[var(--aethel-text-primary)] text-sm rounded transition-colors"
          >Install</button>
        )}
      </div>
    </div>
  )
}

// ============= Extension Details =============

interface ExtensionDetailsProps {
  extension: Extension
  isLoading: boolean
  onClose: () => void
  onInstall: () => void
  onUninstall: () => void
  onToggle: () => void
  onOpenSettings: () => void
}

export function ExtensionDetails({
  extension,
  isLoading,
  onClose,
  onInstall,
  onUninstall,
  onToggle,
  onOpenSettings,
}: ExtensionDetailsProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'changelog'>('details')

  return (
    <div className="w-96 border-l border-[var(--aethel-border-primary)] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[var(--aethel-border-primary)]">
        <div className="flex items-start gap-3">
          <div className="w-16 h-16 rounded-lg bg-[var(--aethel-surface-quaternary)] flex items-center justify-center">
            {extension.icon ? (
              <Image
                src={extension.icon}
                alt=""
                width={48}
                height={48}
                unoptimized
                className="w-12 h-12 rounded"
              />
            ) : (
              <div className="text-[var(--aethel-text-tertiary)]">{CATEGORY_ICONS[extension.category]}</div>
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{extension.displayName}</h3>
            <p className="text-sm text-[var(--aethel-text-tertiary)]">{extension.publisherDisplayName}</p>
          </div>
          <button type="button" aria-label="Close extension details" onClick={onClose} className="p-1 text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mt-4 text-sm">
          <span className="flex items-center gap-1 text-[var(--aethel-warning-light)]">
            <Star className="w-4 h-4" />
            {extension.rating.toFixed(1)} ({extension.ratingCount.toLocaleString()})
          </span>
          <span className="flex items-center gap-1 text-[var(--aethel-text-tertiary)]">
            <Download className="w-4 h-4" />
            {formatDownloads(extension.downloadCount)}
          </span>
          <span className="flex items-center gap-1 text-[var(--aethel-text-tertiary)]">
            <Clock className="w-4 h-4" />
            {formatDate(extension.lastUpdated)}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4">
          {isLoading ? (
            <button type="button" aria-label="Loading extension action" disabled className="flex-1 px-4 py-2 bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-tertiary)] rounded">
              <RefreshCw className="w-4 h-4 inline animate-spin mr-2" />
              Loading...
            </button>
          ) : extension.isInstalled ? (
            <>
              <button type="button" aria-label={extension.isEnabled ? `Disable extension ${extension.name}` : `Enable extension ${extension.name}`}
                onClick={onToggle}
                className={`flex-1 px-4 py-2 rounded transition-colors ${
                  extension.isEnabled
                    ? 'bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-quaternary)]'
                    : 'bg-[var(--aethel-success)] text-[var(--aethel-text-primary)] hover:bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)]'
                }`}
              >
                {extension.isEnabled ? 'Disable' : 'Enable'}
              </button>
              {!extension.isBuiltIn && (
                <button type="button" aria-label={`Uninstall extension ${extension.name}`}
                  onClick={onUninstall}
                  className="px-4 py-2 bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] text-[var(--aethel-error)] hover:bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] rounded"
                >
                  Uninstall
                </button>
              )}
            </>
          ) : (
            <button type="button" aria-label={`Install extension ${extension.name}`}
              onClick={onInstall}
              className="flex-1 px-4 py-2 bg-[var(--aethel-info)] hover:bg-[var(--aethel-info-dark)] text-[var(--aethel-text-primary)] rounded"
            >
              <Download className="w-4 h-4 inline mr-2" />Install</button>
          )}
          <button type="button" aria-label={`Open settings for extension ${extension.name}`}
            onClick={onOpenSettings}
            className="p-2 text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-surface-quaternary)] rounded"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--aethel-border-primary)]">
        <button type="button" aria-label="Open extension details tab"
          onClick={() => setActiveTab('details')}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === 'details' ? 'text-[var(--aethel-text-primary)] border-b-2 border-[var(--aethel-info)]' : 'text-[var(--aethel-text-tertiary)]'
          }`}
        >
          Details
        </button>
        <button type="button" aria-label="Open extension changelog tab"
          onClick={() => setActiveTab('changelog')}
          className={`flex-1 px-4 py-2 text-sm font-medium ${
            activeTab === 'changelog' ? 'text-[var(--aethel-text-primary)] border-b-2 border-[var(--aethel-info)]' : 'text-[var(--aethel-text-tertiary)]'
          }`}
        >
          History
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'details' && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--aethel-text-secondary)]">{extension.description}</p>

            <div>
              <h4 className="text-xs font-semibold text-[var(--aethel-text-tertiary)] uppercase mb-2">Version</h4>
              <p className="text-sm text-[var(--aethel-text-secondary)]">{extension.version}</p>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-[var(--aethel-text-tertiary)] uppercase mb-2">Category</h4>
              <p className="text-sm text-[var(--aethel-text-secondary)]">{CATEGORY_LABELS[extension.category]}</p>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-[var(--aethel-text-tertiary)] uppercase mb-2">Tags</h4>
              <div className="flex flex-wrap gap-1">
                {extension.tags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-tertiary)] text-xs rounded">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {extension.repository && (
              <div>
                <h4 className="text-xs font-semibold text-[var(--aethel-text-tertiary)] uppercase mb-2">Repository</h4>
                <a
                  href={extension.repository}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-[var(--aethel-info-light)] hover:text-[var(--aethel-info)]"
                >
                  <ExternalLink className="w-3 h-3" />
                  View on GitHub
                </a>
              </div>
            )}
          </div>
        )}

        {activeTab === 'changelog' && (
          <div className="text-sm text-[var(--aethel-text-tertiary)]">
            {extension.changelog || 'No changelog available.'}
          </div>
        )}
      </div>
    </div>
  )
}
