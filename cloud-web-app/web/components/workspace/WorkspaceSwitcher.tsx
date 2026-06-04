/**
 * Workspace Switcher Component
 * Switch between Workspaces and manage Workspace folders
 */

import React, { useState, useEffect } from 'react';
import { getWorkspaceManager, WorkspaceFolder } from '../../lib/workspace/workspace-manager';
import { openConfirmDialog } from '../../lib/ui/non-blocking-dialogs';

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
    const shouldRemove = await openConfirmDialog({
      title: 'Remove folder',
      message: 'Remove this folder from the workspace?',
      confirmText: 'Remove',
      cancelText: 'Cancel',
    });
    if (!shouldRemove) return;
    await workspaceManager.removeWorkspaceFolder(index);
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
      <div
        className="workspace-switcher"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-switcher-title"
      >
        <div className="switcher-header">
          <h3 id="workspace-switcher-title">Manage workspace</h3>
          <button type="button" className="close-button" onClick={onClose} aria-label="Close workspace manager">
            ×
          </button>
        </div>

        <div className="switcher-content">
          <div className="section">
            <div className="section-header">
              <h4>Workspace folders</h4>
              <button
                type="button"
                className="add-button"
                onClick={() => setShowAddFolder(!showAddFolder)}
              >
                + Add folder
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
                <button type="button" onClick={handleAddFolder}>Add</button>
              </div>
            )}

            <div className="folder-list">
              {folders.length === 0 ? (
                <div className="empty-state">No folders in this workspace</div>
              ) : (
                folders.map((folder) => (
                  <div key={folder.uri} className="folder-item">
                    <div className="folder-info">
                      <div className="folder-name">{folder.name}</div>
                      <div className="folder-path">{folder.uri}</div>
                    </div>
                    <button
                      type="button"
                      className="remove-button"
                      onClick={() => handleRemoveFolder(folder.index)}
                      aria-label={`Remove folder ${folder.name}`}
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
              <h4>Recent workspaces</h4>
            </div>

            <div className="recent-list">
              {recentWorkspaces.length === 0 ? (
                <div className="empty-state">No recent workspaces</div>
              ) : (
                recentWorkspaces.map((Workspace) => (
                  <div
                    key={Workspace}
                    className="recent-item"
                    onClick={() => handleOpenRecent(Workspace)}
                  >
                    <div className="recent-name">
                      {Workspace.split('/').pop() || Workspace}
                    </div>
                    <div className="recent-path">{Workspace}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <style jsx>{`
          .workspace-switcher-overlay {
            position: fixed;
            inset: 0;
            background: color-mix(in srgb, var(--aethel-surface-primary) 72%, transparent);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: var(--aethel-z-modal-backdrop, 10000);
            padding: 24px;
          }

          .workspace-switcher {
            background: var(--aethel-surface-secondary);
            border: 1px solid var(--aethel-border-primary);
            border-radius: var(--aethel-radius-xl, 16px);
            width: min(600px, 100%);
            max-height: min(80vh, 720px);
            display: flex;
            flex-direction: column;
            box-shadow: var(--aethel-shadow-xl, 0 24px 60px rgba(2, 6, 23, 0.45));
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
            background: var(--aethel-surface-primary);
            border: 1px solid var(--aethel-border-primary);
            color: var(--aethel-text-primary);
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
            background: var(--aethel-surface-tertiary);
            border-radius: var(--aethel-radius-md, 10px);
          }

          .recent-item {
            cursor: pointer;
          }

          .recent-item:hover {
            background: var(--aethel-surface-quaternary);
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
            color: var(--aethel-text-secondary);
            font-size: 20px;
            cursor: pointer;
            padding: 0;
            width: 24px;
            height: 24px;
            opacity: 0.72;
          }

          .remove-button:hover {
            opacity: 1;
            color: var(--aethel-error);
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
