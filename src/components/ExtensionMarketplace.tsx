import React, { useState, useEffect } from 'react';
import { ExtensionService, Extension } from '../services/ExtensionService';
import { EventBus } from '../services/EventBus';

export const ExtensionMarketplace: React.FC = () => {
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [installedExtensions, setInstalledExtensions] = useState<Extension[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'installed' | 'recommended'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const extensionService = ExtensionService.getInstance();

  useEffect(() => {
    loadExtensions();
    loadInstalledExtensions();

    const unsubscribe1 = EventBus.getInstance().subscribe('extension:installed', loadInstalledExtensions);
    const unsubscribe2 = EventBus.getInstance().subscribe('extension:uninstalled', loadInstalledExtensions);
    const unsubscribe3 = EventBus.getInstance().subscribe('extension:enabled', loadInstalledExtensions);
    const unsubscribe4 = EventBus.getInstance().subscribe('extension:disabled', loadInstalledExtensions);

    return () => {
      unsubscribe1();
      unsubscribe2();
      unsubscribe3();
      unsubscribe4();
    };
  }, []);

  const loadExtensions = async () => {
    setIsLoading(true);
    try {
      const allExtensions = extensionService.getAvailableExtensions();
      setExtensions(allExtensions);
    } catch (error) {
      console.error('Failed to load extensions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadInstalledExtensions = () => {
    const installed = extensionService.getInstalledExtensions();
    setInstalledExtensions(installed);
  };

  const handleInstall = async (extensionId: string) => {
    setIsLoading(true);
    try {
      await extensionService.installExtension(extensionId);
      EventBus.getInstance().emit('notification:show', {
        message: 'Extension installed successfully',
        type: 'success'
      });
      loadInstalledExtensions();
    } catch (error) {
      console.error('Failed to install extension:', error);
      EventBus.getInstance().emit('notification:show', {
        message: `Installation failed: ${error.message}`,
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUninstall = async (extensionId: string) => {
    if (!confirm('Are you sure you want to uninstall this extension?')) return;

    setIsLoading(true);
    try {
      await extensionService.uninstallExtension(extensionId);
      EventBus.getInstance().emit('notification:show', {
        message: 'Extension uninstalled successfully',
        type: 'success'
      });
      loadInstalledExtensions();
    } catch (error) {
      console.error('Failed to uninstall extension:', error);
      EventBus.getInstance().emit('notification:show', {
        message: `Uninstallation failed: ${error.message}`,
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (extensionId: string) => {
    const extension = installedExtensions.find(e => e.id === extensionId);
    if (!extension) return;

    try {
      if (extension.enabled) {
        await extensionService.disableExtension(extensionId);
      } else {
        await extensionService.enableExtension(extensionId);
      }
      loadInstalledExtensions();
    } catch (error) {
      console.error('Failed to toggle extension:', error);
    }
  };

  const isInstalled = (extensionId: string) => {
    return installedExtensions.some(e => e.id === extensionId);
  };

  const getExtension = (extensionId: string) => {
    return installedExtensions.find(e => e.id === extensionId);
  };

  const filteredExtensions = extensions.filter(ext => {
    const matchesSearch = searchQuery === '' ||
      ext.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ext.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ext.publisher.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = 
      filter === 'all' ||
      (filter === 'installed' && isInstalled(ext.id)) ||
      (filter === 'recommended' && ext.recommended);

    return matchesSearch && matchesFilter;
  });

  const formatDownloads = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div className="extension-marketplace">
      <div className="marketplace-header">
        <h2>Extensions</h2>
        <input
          type="text"
          className="search-input"
          placeholder="Search extensions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="filter-bar">
        <button
          className={`filter-button ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={`filter-button ${filter === 'installed' ? 'active' : ''}`}
          onClick={() => setFilter('installed')}
        >
          Installed
        </button>
        <button
          className={`filter-button ${filter === 'recommended' ? 'active' : ''}`}
          onClick={() => setFilter('recommended')}
        >
          Recommended
        </button>
      </div>

      <div className="extensions-list">
        {filteredExtensions.map(extension => {
          const installed = isInstalled(extension.id);
          const installedExt = getExtension(extension.id);

          return (
            <div key={extension.id} className="extension-item">
              <div className="extension-icon">
                {extension.icon ? (
                  <img src={extension.icon} alt={extension.name} />
                ) : (
                  <div className="default-icon">📦</div>
                )}
              </div>
              <div className="extension-info">
                <div className="extension-header">
                  <h3 className="extension-name">{extension.name}</h3>
                  {extension.recommended && (
                    <span className="recommended-badge">⭐ Recommended</span>
                  )}
                </div>
                <div className="extension-publisher">{extension.publisher}</div>
                <div className="extension-description">{extension.description}</div>
                <div className="extension-meta">
                  <span className="meta-item">
                    ⬇ {formatDownloads(extension.downloads)}
                  </span>
                  <span className="meta-item">
                    ⭐ {extension.rating.toFixed(1)}
                  </span>
                  <span className="meta-item">
                    v{extension.version}
                  </span>
                </div>
              </div>
              <div className="extension-actions">
                {installed ? (
                  <>
                    <button
                      className="action-button toggle-button"
                      onClick={() => handleToggle(extension.id)}
                      disabled={isLoading}
                    >
                      {installedExt?.enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      className="action-button uninstall-button"
                      onClick={() => handleUninstall(extension.id)}
                      disabled={isLoading}
                    >
                      Uninstall
                    </button>
                  </>
                ) : (
                  <button
                    className="action-button install-button"
                    onClick={() => handleInstall(extension.id)}
                    disabled={isLoading}
                  >
                    Install
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {filteredExtensions.length === 0 && (
          <div className="no-extensions">
            <p>No extensions found</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .extension-marketplace {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--vscode-editor-background);
          color: var(--vscode-editor-foreground);
        }

        .marketplace-header {
          padding: 20px;
          border-bottom: 1px solid var(--vscode-panel-border);
        }

        .marketplace-header h2 {
          margin: 0 0 16px 0;
          font-size: 24px;
          font-weight: 400;
        }

        .search-input {
          width: 100%;
          padding: 8px 12px;
          background: var(--vscode-input-background);
          color: var(--vscode-input-foreground);
          border: 1px solid var(--vscode-input-border);
          outline: none;
          font-size: 14px;
        }

        .search-input:focus {
          border-color: var(--vscode-focusBorder);
        }

        .filter-bar {
          display: flex;
          gap: 8px;
          padding: 12px 20px;
          border-bottom: 1px solid var(--vscode-panel-border);
        }

        .filter-button {
          padding: 6px 12px;
          background: none;
          border: 1px solid var(--vscode-button-border);
          color: var(--vscode-foreground);
          cursor: pointer;
          font-size: 13px;
          border-radius: 2px;
        }

        .filter-button:hover {
          background: var(--vscode-button-hoverBackground);
        }

        .filter-button.active {
          background: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border-color: var(--vscode-button-background);
        }

        .extensions-list {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }

        .extension-item {
          display: flex;
          gap: 16px;
          padding: 16px;
          border: 1px solid var(--vscode-panel-border);
          border-radius: 4px;
          margin-bottom: 12px;
          background: var(--vscode-sideBar-background);
        }

        .extension-icon {
          flex-shrink: 0;
          width: 64px;
          height: 64px;
        }

        .extension-icon img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 4px;
        }

        .default-icon {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--vscode-button-background);
          border-radius: 4px;
          font-size: 32px;
        }

        .extension-info {
          flex: 1;
          min-width: 0;
        }

        .extension-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }

        .extension-name {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }

        .recommended-badge {
          font-size: 11px;
          padding: 2px 6px;
          background: var(--vscode-badge-background);
          color: var(--vscode-badge-foreground);
          border-radius: 2px;
        }

        .extension-publisher {
          font-size: 12px;
          color: var(--vscode-descriptionForeground);
          margin-bottom: 8px;
        }

        .extension-description {
          font-size: 13px;
          margin-bottom: 8px;
          line-height: 1.5;
        }

        .extension-meta {
          display: flex;
          gap: 16px;
          font-size: 12px;
          color: var(--vscode-descriptionForeground);
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .extension-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: flex-end;
        }

        .action-button {
          padding: 6px 16px;
          border: none;
          cursor: pointer;
          font-size: 13px;
          border-radius: 2px;
          min-width: 100px;
        }

        .action-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .install-button {
          background: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
        }

        .install-button:hover:not(:disabled) {
          background: var(--vscode-button-hoverBackground);
        }

        .toggle-button {
          background: var(--vscode-button-secondaryBackground);
          color: var(--vscode-button-secondaryForeground);
        }

        .toggle-button:hover:not(:disabled) {
          background: var(--vscode-button-secondaryHoverBackground);
        }

        .uninstall-button {
          background: transparent;
          color: var(--vscode-errorForeground);
          border: 1px solid var(--vscode-errorForeground);
        }

        .uninstall-button:hover:not(:disabled) {
          background: var(--vscode-errorForeground);
          color: var(--vscode-errorBackground);
        }

        .no-extensions {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 200px;
          color: var(--vscode-descriptionForeground);
        }

        .no-extensions p {
          margin: 0;
        }
      `}</style>
    </div>
  );
};
