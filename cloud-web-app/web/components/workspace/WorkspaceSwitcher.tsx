/**
 * Workspace Switcher Component
 * Switch between workspaces and manage workspace folders
 */

import React, { useState, useEffect } from 'react';
import { getWorkspaceManager, WorkspaceFolder } from '../../lib/workspace/workspace-manager';

interface WorkspaceSwitcherProps {
  onClose: () => void;
}

export const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({ onClose }) => {
  const [folders, setFolders] = useState<WorkspaceFolder[]>([]);
  const [recentWorkspaces, setRecentWorkspaces] = useState<string[]>([]);
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [newFolderPath, setNewFolderPath] = useState('');

  const workspaceManager = getWorkspaceManager();

  useEffect(() => {
    setFolders(workspaceManager.getWorkspaceFolders());
    setRecentWorkspaces(workspaceManager.getRecentWorkspaces());

    const unsubscribe = workspaceManager.onChange(() => {
      setFolders(workspaceManager.getWorkspaceFolders());
    });

    return unsubscribe;
  }, [workspaceManager]);

  const handleAddFolder = async () => {
    if (!newFolderPath.trim()) return;

    await workspaceManager.addWorkspaceFolder({
      uri: newFolderPath,
      name: newFolderPath.split('/').pop() || newFolderPath,
    });

    setNewFolderPath('');
    setShowAddFolder(false);
  };

  const handleRemoveFolder = async (index: number) => {
    if (confirm('Remove this folder from workspace?')) {
      await workspaceManager.removeWorkspaceFolder(index);
    }
  };

  const handleOpenRecent = (workspaceUri: string) => {
    workspaceManager.addToRecent(workspaceUri);
    window.dispatchEvent(
      new CustomEvent('aethel.workspace.openRecent', {
        detail: { workspaceUri },
      })
    );
    onClose();
  };

  return (
    <div className="workspace-switcher-overlay" onClick={onClose}>
      <div className="workspace-switcher" onClick={(e) => e.stopPropagation()}>
        <div className="switcher-header">
          <h3>Workspace</h3>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="switcher-content">
          <div className="section">
            <div className="section-header">
              <h4>Current Workspace Folders</h4>
              <button
                className="add-button"
                onClick={() => setShowAddFolder(!showAddFolder)}
              >
                + Add Folder
              </button>
            </div>

            {showAddFolder && (
              <div className="add-folder-form">
                <input
                  type="text"
                  placeholder="Folder path..."
                  value={newFolderPath}
                  onChange={(e) => setNewFolderPath(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddFolder()}
                />
                <button onClick={handleAddFolder}>Add</button>
              </div>
            )}

            <div className="folder-list">
              {folders.length === 0 ? (
                <div className="empty-state">No folders in workspace</div>
              ) : (
                folders.map((folder) => (
                  <div key={folder.uri} className="folder-item">
                    <div className="folder-info">
                      <div className="folder-name">{folder.name}</div>
                      <div className="folder-path">{folder.uri}</div>
                    </div>
                    <button
                      className="remove-button"
                      onClick={() => handleRemoveFolder(folder.index)}
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="section">
            <div className="section-header">
              <h4>Recent Workspaces</h4>
            </div>

            <div className="recent-list">
              {recentWorkspaces.length === 0 ? (
                <div className="empty-state">No recent workspaces</div>
              ) : (
                recentWorkspaces.map((workspace) => (
                  <div
                    key={workspace}
                    className="recent-item"
                    onClick={() => handleOpenRecent(workspace)}
                  >
                    <div className="recent-name">
                      {workspace.split('/').pop() || workspace}
                    </div>
                    <div className="recent-path">{workspace}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <style jsx>{`
          .workspace-switcher-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
          }

          .workspace-switcher {
            background: var(--panel-bg);
            border: 1px solid var(--panel-border);
            border-radius: 6px;
            width: 600px;
            max-height: 80vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          }

          .switcher-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px;
            border-bottom: 1px solid var(--panel-border);
          }

          .switcher-header h3 {
            margin: 0;
            font-size: 16px;
          }

          .close-button {
            background: none;
            border: none;
            color: var(--editor-fg);
            font-size: 24px;
            cursor: pointer;
            padding: 0;
            width: 24px;
            height: 24px;
          }

          .switcher-content {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
          }

          .section {
            margin-bottom: 24px;
          }

          .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
          }

          .section-header h4 {
            margin: 0;
            font-size: 14px;
            font-weight: 600;
          }

          .add-button {
            padding: 4px 12px;
            background: var(--activitybar-activeBorder);
            border: none;
            color: white;
            font-size: 12px;
            cursor: pointer;
            border-radius: 3px;
          }

          .add-folder-form {
            display: flex;
            gap: 8px;
            margin-bottom: 12px;
          }

          .add-folder-form input {
            flex: 1;
            padding: 6px 8px;
            background: var(--editor-bg);
            border: 1px solid var(--panel-border);
            color: var(--editor-fg);
            font-size: 13px;
            border-radius: 3px;
          }

          .add-folder-form button {
            padding: 6px 16px;
            background: var(--activitybar-activeBorder);
            border: none;
            color: white;
            font-size: 13px;
            cursor: pointer;
            border-radius: 3px;
          }

          .folder-list,
          .recent-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .folder-item,
          .recent-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 4px;
          }

          .recent-item {
            cursor: pointer;
          }

          .recent-item:hover {
            background: rgba(255, 255, 255, 0.1);
          }

          .folder-info {
            flex: 1;
            min-width: 0;
          }

          .folder-name,
          .recent-name {
            font-size: 13px;
            margin-bottom: 4px;
          }

          .folder-path,
          .recent-path {
            font-size: 11px;
            opacity: 0.6;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .remove-button {
            background: none;
            border: none;
            color: var(--editor-fg);
            font-size: 20px;
            cursor: pointer;
            padding: 0;
            width: 24px;
            height: 24px;
            opacity: 0.6;
          }

          .remove-button:hover {
            opacity: 1;
            color: #f14c4c;
          }

          .empty-state {
            padding: 24px;
            text-align: center;
            opacity: 0.6;
            font-size: 13px;
          }
        `}</style>
      </div>
    </div>
  );
};
