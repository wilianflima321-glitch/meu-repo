import React, { useState, useEffect } from 'react';
import { UnrealAssetService, Asset, AssetType } from '../../services/UnrealAssetService';
import { EventBus } from '../../services/EventBus';

export const AssetBrowser: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<AssetType | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPath, setCurrentPath] = useState('/Game');
  const [isLoading, setIsLoading] = useState(false);
  const assetService = UnrealAssetService.getInstance();

  useEffect(() => {
    loadAssets();
  }, [currentPath, filterType]);

  const loadAssets = async () => {
    setIsLoading(true);
    try {
      const loadedAssets = await assetService.getAssets(currentPath, filterType === 'all' ? undefined : filterType);
      setAssets(loadedAssets);
    } catch (error) {
      console.error('Failed to load assets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssetClick = (asset: Asset) => {
    setSelectedAsset(asset);
    EventBus.getInstance().emit('unreal:assetSelected', { asset });
  };

  const handleAssetDoubleClick = (asset: Asset) => {
    if (asset.type === 'Folder') {
      setCurrentPath(asset.path);
    } else {
      EventBus.getInstance().emit('unreal:assetOpen', { asset });
    }
  };

  const handleImport = async () => {
    try {
      const files = await assetService.showImportDialog();
      if (files.length > 0) {
        await assetService.importAssets(files, currentPath);
        await loadAssets();
      }
    } catch (error) {
      console.error('Failed to import assets:', error);
    }
  };

  const handleExport = async () => {
    if (!selectedAsset) return;
    
    try {
      await assetService.exportAsset(selectedAsset);
    } catch (error) {
      console.error('Failed to export asset:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedAsset) return;
    
    if (!confirm(`Delete ${selectedAsset.name}?`)) return;

    try {
      await assetService.deleteAsset(selectedAsset.path);
      await loadAssets();
      setSelectedAsset(null);
    } catch (error) {
      console.error('Failed to delete asset:', error);
    }
  };

  const handleNavigateUp = () => {
    const parts = currentPath.split('/').filter(p => p);
    if (parts.length > 1) {
      parts.pop();
      setCurrentPath('/' + parts.join('/'));
    }
  };

  const filteredAssets = assets.filter(asset => {
    if (!searchQuery) return true;
    return asset.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getAssetIcon = (type: AssetType): string => {
    const icons: Record<AssetType, string> = {
      'StaticMesh': '🗿',
      'SkeletalMesh': '🦴',
      'Material': '🎨',
      'Texture': '🖼️',
      'Blueprint': '📘',
      'Animation': '🎬',
      'Sound': '🔊',
      'Particle': '✨',
      'Level': '🗺️',
      'Folder': '📁'
    };
    return icons[type] || '📄';
  };

  return (
    <div className="asset-browser">
      <div className="browser-toolbar">
        <div className="navigation">
          <button onClick={handleNavigateUp} disabled={currentPath === '/Game'}>
            ←
          </button>
          <span className="current-path">{currentPath}</span>
        </div>
        
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="toolbar-actions">
          <select value={filterType} onChange={(e) => setFilterType(e.target.value as AssetType | 'all')}>
            <option value="all">All Types</option>
            <option value="StaticMesh">Static Mesh</option>
            <option value="SkeletalMesh">Skeletal Mesh</option>
            <option value="Material">Material</option>
            <option value="Texture">Texture</option>
            <option value="Blueprint">Blueprint</option>
            <option value="Animation">Animation</option>
            <option value="Sound">Sound</option>
            <option value="Particle">Particle</option>
            <option value="Level">Level</option>
          </select>

          <div className="view-mode-toggle">
            <button
              className={viewMode === 'grid' ? 'active' : ''}
              onClick={() => setViewMode('grid')}
            >
              Grid
            </button>
            <button
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => setViewMode('list')}
            >
              List
            </button>
          </div>

          <button onClick={handleImport}>Import</button>
          <button onClick={handleExport} disabled={!selectedAsset}>Export</button>
          <button onClick={handleDelete} disabled={!selectedAsset}>Delete</button>
        </div>
      </div>

      <div className={`asset-grid ${viewMode}`}>
        {isLoading ? (
          <div className="loading">Loading assets...</div>
        ) : filteredAssets.length === 0 ? (
          <div className="no-assets">No assets found</div>
        ) : (
          filteredAssets.map(asset => (
            <div
              key={asset.path}
              className={`asset-item ${selectedAsset?.path === asset.path ? 'selected' : ''}`}
              onClick={() => handleAssetClick(asset)}
              onDoubleClick={() => handleAssetDoubleClick(asset)}
            >
              <div className="asset-thumbnail">
                {asset.thumbnail ? (
                  <img src={asset.thumbnail} alt={asset.name} />
                ) : (
                  <div className="asset-icon">{getAssetIcon(asset.type)}</div>
                )}
              </div>
              <div className="asset-info">
                <div className="asset-name" title={asset.name}>{asset.name}</div>
                <div className="asset-type">{asset.type}</div>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedAsset && (
        <div className="asset-details">
          <h3>Asset Details</h3>
          <div className="detail-row">
            <span className="label">Name:</span>
            <span className="value">{selectedAsset.name}</span>
          </div>
          <div className="detail-row">
            <span className="label">Type:</span>
            <span className="value">{selectedAsset.type}</span>
          </div>
          <div className="detail-row">
            <span className="label">Path:</span>
            <span className="value">{selectedAsset.path}</span>
          </div>
          <div className="detail-row">
            <span className="label">Size:</span>
            <span className="value">{selectedAsset.size ? `${(selectedAsset.size / 1024).toFixed(2)} KB` : 'N/A'}</span>
          </div>
          {selectedAsset.metadata && Object.entries(selectedAsset.metadata).map(([key, value]) => (
            <div key={key} className="detail-row">
              <span className="label">{key}:</span>
              <span className="value">{String(value)}</span>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .asset-browser {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--vscode-editor-background);
          color: var(--vscode-editor-foreground);
        }

        .browser-toolbar {
          display: flex;
          gap: 16px;
          padding: 12px;
          background: var(--vscode-editorGroupHeader-tabsBackground);
          border-bottom: 1px solid var(--vscode-panel-border);
        }

        .navigation {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .navigation button {
          padding: 4px 12px;
          background: var(--vscode-button-secondaryBackground);
          color: var(--vscode-button-secondaryForeground);
          border: none;
          cursor: pointer;
          font-size: 14px;
        }

        .navigation button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .current-path {
          font-size: 13px;
          font-family: var(--vscode-editor-font-family, 'Consolas, monospace');
        }

        .search-bar {
          flex: 1;
        }

        .search-bar input {
          width: 100%;
          padding: 6px 12px;
          background: var(--vscode-input-background);
          color: var(--vscode-input-foreground);
          border: 1px solid var(--vscode-input-border);
          outline: none;
          font-size: 13px;
        }

        .toolbar-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .toolbar-actions select,
        .toolbar-actions button {
          padding: 6px 12px;
          background: var(--vscode-button-secondaryBackground);
          color: var(--vscode-button-secondaryForeground);
          border: none;
          cursor: pointer;
          font-size: 12px;
        }

        .toolbar-actions button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .view-mode-toggle {
          display: flex;
          border: 1px solid var(--vscode-button-border);
          border-radius: 2px;
          overflow: hidden;
        }

        .view-mode-toggle button {
          border: none;
          border-right: 1px solid var(--vscode-button-border);
        }

        .view-mode-toggle button:last-child {
          border-right: none;
        }

        .view-mode-toggle button.active {
          background: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
        }

        .asset-grid {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }

        .asset-grid.grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 16px;
        }

        .asset-grid.list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .asset-item {
          cursor: pointer;
          border: 2px solid transparent;
          border-radius: 4px;
          padding: 8px;
          transition: all 0.1s;
        }

        .asset-item:hover {
          background: var(--vscode-list-hoverBackground);
        }

        .asset-item.selected {
          border-color: var(--vscode-focusBorder);
          background: var(--vscode-list-activeSelectionBackground);
        }

        .grid .asset-item {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .list .asset-item {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 12px;
        }

        .asset-thumbnail {
          width: 100px;
          height: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--vscode-input-background);
          border-radius: 4px;
          overflow: hidden;
        }

        .list .asset-thumbnail {
          width: 48px;
          height: 48px;
        }

        .asset-thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .asset-icon {
          font-size: 48px;
        }

        .list .asset-icon {
          font-size: 24px;
        }

        .asset-info {
          margin-top: 8px;
          text-align: center;
          width: 100%;
        }

        .list .asset-info {
          margin-top: 0;
          text-align: left;
          flex: 1;
        }

        .asset-name {
          font-size: 12px;
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .asset-type {
          font-size: 10px;
          color: var(--vscode-descriptionForeground);
        }

        .loading,
        .no-assets {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 200px;
          color: var(--vscode-descriptionForeground);
        }

        .asset-details {
          border-top: 1px solid var(--vscode-panel-border);
          padding: 16px;
          background: var(--vscode-sideBar-background);
          max-height: 300px;
          overflow-y: auto;
        }

        .asset-details h3 {
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 600;
        }

        .detail-row {
          display: flex;
          gap: 8px;
          margin-bottom: 8px;
          font-size: 12px;
        }

        .detail-row .label {
          font-weight: 600;
          min-width: 80px;
        }

        .detail-row .value {
          color: var(--vscode-descriptionForeground);
          word-break: break-all;
        }
      `}</style>
    </div>
  );
};
