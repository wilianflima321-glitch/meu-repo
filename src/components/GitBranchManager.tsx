import React, { useState, useEffect } from 'react';
import { GitService, GitBranch } from '../services/GitService';
import { EventBus } from '../services/EventBus';

export const GitBranchManager: React.FC = () => {
  const [branches, setBranches] = useState<GitBranch[]>([]);
  const [currentBranch, setCurrentBranch] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showRemote, setShowRemote] = useState(true);
  const [newBranchName, setNewBranchName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<GitBranch | null>(null);
  const gitService = GitService.getInstance();

  useEffect(() => {
    loadBranches();

    const unsubscribe = EventBus.getInstance().subscribe('git:branchChanged', loadBranches);
    return () => unsubscribe();
  }, [showRemote]);

  const loadBranches = async () => {
    try {
      const allBranches = await gitService.getBranches(showRemote);
      setBranches(allBranches);

      const status = await gitService.getStatus();
      setCurrentBranch(status.branch);
    } catch (error) {
      console.error('Failed to load branches:', error);
    }
  };

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) {
      EventBus.getInstance().emit('notification:show', {
        message: 'Branch name cannot be empty',
        type: 'error'
      });
      return;
    }

    try {
      await gitService.createBranch(newBranchName.trim());
      setNewBranchName('');
      setIsCreating(false);
      await loadBranches();
      EventBus.getInstance().emit('notification:show', {
        message: `Branch '${newBranchName}' created`,
        type: 'success'
      });
    } catch (error) {
      console.error('Failed to create branch:', error);
      EventBus.getInstance().emit('notification:show', {
        message: `Failed to create branch: ${error.message}`,
        type: 'error'
      });
    }
  };

  const handleCheckoutBranch = async (branchName: string) => {
    try {
      await gitService.checkout(branchName);
      await loadBranches();
      EventBus.getInstance().emit('notification:show', {
        message: `Switched to branch '${branchName}'`,
        type: 'success'
      });
      EventBus.getInstance().emit('git:branchChanged', { branch: branchName });
    } catch (error) {
      console.error('Failed to checkout branch:', error);
      EventBus.getInstance().emit('notification:show', {
        message: `Failed to checkout: ${error.message}`,
        type: 'error'
      });
    }
  };

  const handleDeleteBranch = async (branchName: string, isRemote: boolean) => {
    if (branchName === currentBranch) {
      EventBus.getInstance().emit('notification:show', {
        message: 'Cannot delete current branch',
        type: 'error'
      });
      return;
    }

    if (!confirm(`Delete ${isRemote ? 'remote ' : ''}branch '${branchName}'?`)) return;

    try {
      await gitService.deleteBranch(branchName, isRemote);
      await loadBranches();
      EventBus.getInstance().emit('notification:show', {
        message: `Branch '${branchName}' deleted`,
        type: 'success'
      });
    } catch (error) {
      console.error('Failed to delete branch:', error);
      EventBus.getInstance().emit('notification:show', {
        message: `Failed to delete: ${error.message}`,
        type: 'error'
      });
    }
  };

  const handleMergeBranch = async (branchName: string) => {
    if (!confirm(`Merge '${branchName}' into '${currentBranch}'?`)) return;

    try {
      await gitService.merge(branchName);
      await loadBranches();
      EventBus.getInstance().emit('notification:show', {
        message: `Merged '${branchName}' into '${currentBranch}'`,
        type: 'success'
      });
      EventBus.getInstance().emit('git:statusChanged', {});
    } catch (error) {
      console.error('Failed to merge branch:', error);
      EventBus.getInstance().emit('notification:show', {
        message: `Merge failed: ${error.message}`,
        type: 'error'
      });
    }
  };

  const handleRenameBranch = async (oldName: string, newName: string) => {
    if (!newName.trim()) return;

    try {
      await gitService.renameBranch(oldName, newName.trim());
      await loadBranches();
      EventBus.getInstance().emit('notification:show', {
        message: `Branch renamed to '${newName}'`,
        type: 'success'
      });
    } catch (error) {
      console.error('Failed to rename branch:', error);
      EventBus.getInstance().emit('notification:show', {
        message: `Failed to rename: ${error.message}`,
        type: 'error'
      });
    }
  };

  const handlePublishBranch = async (branchName: string) => {
    try {
      await gitService.publishBranch(branchName);
      await loadBranches();
      EventBus.getInstance().emit('notification:show', {
        message: `Branch '${branchName}' published`,
        type: 'success'
      });
    } catch (error) {
      console.error('Failed to publish branch:', error);
      EventBus.getInstance().emit('notification:show', {
        message: `Failed to publish: ${error.message}`,
        type: 'error'
      });
    }
  };

  const handleCompareBranches = (branch: GitBranch) => {
    EventBus.getInstance().emit('git:compareBranches', {
      base: currentBranch,
      compare: branch.name
    });
  };

  const filteredBranches = branches.filter(branch => {
    if (!searchQuery) return true;
    return branch.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const localBranches = filteredBranches.filter(b => !b.isRemote);
  const remoteBranches = filteredBranches.filter(b => b.isRemote);

  return (
    <div className="git-branch-manager">
      <div className="manager-header">
        <h3>Branches</h3>
        <button
          className="create-button"
          onClick={() => setIsCreating(true)}
        >
          New Branch
        </button>
      </div>

      {isCreating && (
        <div className="create-branch-form">
          <input
            type="text"
            className="branch-input"
            placeholder="Branch name..."
            value={newBranchName}
            onChange={(e) => setNewBranchName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateBranch();
              if (e.key === 'Escape') setIsCreating(false);
            }}
            autoFocus
          />
          <div className="form-actions">
            <button className="action-button primary" onClick={handleCreateBranch}>
              Create
            </button>
            <button className="action-button" onClick={() => setIsCreating(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="manager-toolbar">
        <input
          type="text"
          className="search-input"
          placeholder="Search branches..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={showRemote}
            onChange={(e) => setShowRemote(e.target.checked)}
          />
          Show Remote
        </label>
      </div>

      <div className="branches-list">
        <div className="branch-group">
          <div className="group-header">Local Branches ({localBranches.length})</div>
          {localBranches.map(branch => (
            <div
              key={branch.name}
              className={`branch-item ${branch.name === currentBranch ? 'current' : ''}`}
              onClick={() => setSelectedBranch(branch)}
            >
              <div className="branch-main">
                {branch.name === currentBranch && (
                  <span className="current-indicator">✓</span>
                )}
                <span className="branch-name">{branch.name}</span>
                {branch.upstream && (
                  <span className="upstream-info">
                    → {branch.upstream}
                  </span>
                )}
              </div>
              <div className="branch-actions">
                {branch.name !== currentBranch && (
                  <button
                    className="action-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCheckoutBranch(branch.name);
                    }}
                    title="Checkout"
                  >
                    Checkout
                  </button>
                )}
                {branch.name !== currentBranch && (
                  <button
                    className="action-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMergeBranch(branch.name);
                    }}
                    title="Merge"
                  >
                    Merge
                  </button>
                )}
                {!branch.upstream && (
                  <button
                    className="action-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePublishBranch(branch.name);
                    }}
                    title="Publish"
                  >
                    Publish
                  </button>
                )}
                <button
                  className="action-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCompareBranches(branch);
                  }}
                  title="Compare"
                >
                  Compare
                </button>
                {branch.name !== currentBranch && (
                  <button
                    className="action-button danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteBranch(branch.name, false);
                    }}
                    title="Delete"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {showRemote && remoteBranches.length > 0 && (
          <div className="branch-group">
            <div className="group-header">Remote Branches ({remoteBranches.length})</div>
            {remoteBranches.map(branch => (
              <div
                key={branch.name}
                className="branch-item remote"
                onClick={() => setSelectedBranch(branch)}
              >
                <div className="branch-main">
                  <span className="branch-name">{branch.name}</span>
                </div>
                <div className="branch-actions">
                  <button
                    className="action-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCheckoutBranch(branch.name);
                    }}
                    title="Checkout"
                  >
                    Checkout
                  </button>
                  <button
                    className="action-button danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteBranch(branch.name, true);
                    }}
                    title="Delete"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredBranches.length === 0 && (
          <div className="no-branches">No branches found</div>
        )}
      </div>

      <style jsx>{`
        .git-branch-manager {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--vscode-sideBar-background);
          color: var(--vscode-sideBar-foreground);
        }

        .manager-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          border-bottom: 1px solid var(--vscode-panel-border);
        }

        .manager-header h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
        }

        .create-button {
          padding: 4px 12px;
          background: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          cursor: pointer;
          font-size: 12px;
          border-radius: 2px;
        }

        .create-button:hover {
          background: var(--vscode-button-hoverBackground);
        }

        .create-branch-form {
          padding: 12px;
          background: var(--vscode-input-background);
          border-bottom: 1px solid var(--vscode-panel-border);
        }

        .branch-input {
          width: 100%;
          padding: 6px 12px;
          background: var(--vscode-input-background);
          color: var(--vscode-input-foreground);
          border: 1px solid var(--vscode-input-border);
          outline: none;
          font-size: 13px;
          margin-bottom: 8px;
        }

        .branch-input:focus {
          border-color: var(--vscode-focusBorder);
        }

        .form-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }

        .manager-toolbar {
          display: flex;
          gap: 8px;
          padding: 8px 12px;
          border-bottom: 1px solid var(--vscode-panel-border);
        }

        .search-input {
          flex: 1;
          padding: 4px 8px;
          background: var(--vscode-input-background);
          color: var(--vscode-input-foreground);
          border: 1px solid var(--vscode-input-border);
          outline: none;
          font-size: 12px;
        }

        .search-input:focus {
          border-color: var(--vscode-focusBorder);
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          cursor: pointer;
          white-space: nowrap;
        }

        .branches-list {
          flex: 1;
          overflow-y: auto;
        }

        .branch-group {
          margin-bottom: 16px;
        }

        .group-header {
          padding: 8px 12px;
          background: var(--vscode-sideBarSectionHeader-background);
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          color: var(--vscode-descriptionForeground);
        }

        .branch-item {
          padding: 8px 12px;
          cursor: pointer;
          border-bottom: 1px solid var(--vscode-panel-border);
        }

        .branch-item:hover {
          background: var(--vscode-list-hoverBackground);
        }

        .branch-item.current {
          background: var(--vscode-list-activeSelectionBackground);
          color: var(--vscode-list-activeSelectionForeground);
        }

        .branch-item:hover .branch-actions {
          display: flex;
        }

        .branch-main {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }

        .current-indicator {
          color: var(--vscode-gitDecoration-addedResourceForeground);
          font-weight: bold;
        }

        .branch-name {
          font-size: 13px;
          font-weight: 500;
          font-family: var(--vscode-editor-font-family, 'Consolas, monospace');
        }

        .upstream-info {
          font-size: 11px;
          color: var(--vscode-descriptionForeground);
        }

        .branch-actions {
          display: none;
          gap: 6px;
          flex-wrap: wrap;
        }

        .action-button {
          padding: 3px 8px;
          background: var(--vscode-button-secondaryBackground);
          color: var(--vscode-button-secondaryForeground);
          border: none;
          cursor: pointer;
          font-size: 11px;
          border-radius: 2px;
        }

        .action-button:hover {
          background: var(--vscode-button-secondaryHoverBackground);
        }

        .action-button.primary {
          background: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
        }

        .action-button.primary:hover {
          background: var(--vscode-button-hoverBackground);
        }

        .action-button.danger {
          background: transparent;
          color: var(--vscode-errorForeground);
          border: 1px solid var(--vscode-errorForeground);
        }

        .action-button.danger:hover {
          background: var(--vscode-errorForeground);
          color: var(--vscode-errorBackground);
        }

        .no-branches {
          padding: 20px;
          text-align: center;
          color: var(--vscode-descriptionForeground);
        }
      `}</style>
    </div>
  );
};
