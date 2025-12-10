import React, { useState, useEffect } from 'react';
import { GitService, GitStatus, GitChange } from '../services/GitService';
import { EventBus } from '../services/EventBus';

export const SourceControlPanel: React.FC = () => {
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [commitMessage, setCommitMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const gitService = GitService.getInstance();

  useEffect(() => {
    loadStatus();

    const unsubscribe1 = EventBus.getInstance().subscribe('git:statusChanged', loadStatus);
    const unsubscribe2 = EventBus.getInstance().subscribe('git:commit', handleCommit);
    const unsubscribe3 = EventBus.getInstance().subscribe('git:push', handlePush);
    const unsubscribe4 = EventBus.getInstance().subscribe('git:pull', handlePull);
    const unsubscribe5 = EventBus.getInstance().subscribe('git:sync', handleSync);

    return () => {
      unsubscribe1();
      unsubscribe2();
      unsubscribe3();
      unsubscribe4();
      unsubscribe5();
    };
  }, []);

  const loadStatus = async () => {
    setIsLoading(true);
    try {
      const newStatus = await gitService.getStatus();
      setStatus(newStatus);
    } catch (error) {
      console.error('Failed to load git status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStage = async (file: string) => {
    try {
      await gitService.stage([file]);
      await loadStatus();
    } catch (error) {
      console.error('Failed to stage file:', error);
    }
  };

  const handleUnstage = async (file: string) => {
    try {
      await gitService.unstage([file]);
      await loadStatus();
    } catch (error) {
      console.error('Failed to unstage file:', error);
    }
  };

  const handleStageAll = async () => {
    if (!status) return;
    try {
      const files = status.changes.filter(c => !c.staged).map(c => c.path);
      await gitService.stage(files);
      await loadStatus();
    } catch (error) {
      console.error('Failed to stage all files:', error);
    }
  };

  const handleUnstageAll = async () => {
    if (!status) return;
    try {
      const files = status.changes.filter(c => c.staged).map(c => c.path);
      await gitService.unstage(files);
      await loadStatus();
    } catch (error) {
      console.error('Failed to unstage all files:', error);
    }
  };

  const handleCommit = async () => {
    if (!commitMessage.trim()) {
      alert('Please enter a commit message');
      return;
    }

    setIsLoading(true);
    try {
      await gitService.commit(commitMessage);
      setCommitMessage('');
      await loadStatus();
      EventBus.getInstance().emit('notification:show', {
        message: 'Changes committed successfully',
        type: 'success'
      });
    } catch (error) {
      console.error('Failed to commit:', error);
      EventBus.getInstance().emit('notification:show', {
        message: `Commit failed: ${error.message}`,
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePush = async () => {
    setIsLoading(true);
    try {
      await gitService.push();
      EventBus.getInstance().emit('notification:show', {
        message: 'Changes pushed successfully',
        type: 'success'
      });
    } catch (error) {
      console.error('Failed to push:', error);
      EventBus.getInstance().emit('notification:show', {
        message: `Push failed: ${error.message}`,
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePull = async () => {
    setIsLoading(true);
    try {
      await gitService.pull();
      await loadStatus();
      EventBus.getInstance().emit('notification:show', {
        message: 'Changes pulled successfully',
        type: 'success'
      });
    } catch (error) {
      console.error('Failed to pull:', error);
      EventBus.getInstance().emit('notification:show', {
        message: `Pull failed: ${error.message}`,
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    setIsLoading(true);
    try {
      await gitService.pull();
      await gitService.push();
      await loadStatus();
      EventBus.getInstance().emit('notification:show', {
        message: 'Repository synchronized',
        type: 'success'
      });
    } catch (error) {
      console.error('Failed to sync:', error);
      EventBus.getInstance().emit('notification:show', {
        message: `Sync failed: ${error.message}`,
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiscard = async (file: string) => {
    if (!confirm(`Discard changes in ${file}?`)) return;
    
    try {
      await gitService.discard([file]);
      await loadStatus();
    } catch (error) {
      console.error('Failed to discard changes:', error);
    }
  };

  const getChangeIcon = (type: string) => {
    switch (type) {
      case 'modified': return 'M';
      case 'added': return 'A';
      case 'deleted': return 'D';
      case 'renamed': return 'R';
      case 'untracked': return 'U';
      default: return '?';
    }
  };

  const getChangeClass = (type: string) => {
    return `change-type change-${type}`;
  };

  const stagedChanges = status?.changes.filter(c => c.staged) || [];
  const unstagedChanges = status?.changes.filter(c => !c.staged) || [];

  return (
    <div className="source-control-panel">
      <div className="panel-header">
        <h3>Source Control</h3>
        <div className="header-actions">
          <button
            className="action-button"
            onClick={handlePull}
            disabled={isLoading}
            title="Pull"
          >
            ⬇
          </button>
          <button
            className="action-button"
            onClick={handlePush}
            disabled={isLoading || stagedChanges.length === 0}
            title="Push"
          >
            ⬆
          </button>
          <button
            className="action-button"
            onClick={handleSync}
            disabled={isLoading}
            title="Sync"
          >
            🔄
          </button>
          <button
            className="action-button"
            onClick={loadStatus}
            disabled={isLoading}
            title="Refresh"
          >
            ↻
          </button>
        </div>
      </div>

      {status && (
        <div className="branch-info">
          <span className="branch-icon">🌿</span>
          <span className="branch-name">{status.branch}</span>
          {status.ahead > 0 && <span className="sync-info">↑{status.ahead}</span>}
          {status.behind > 0 && <span className="sync-info">↓{status.behind}</span>}
        </div>
      )}

      <div className="commit-section">
        <textarea
          className="commit-message"
          placeholder="Commit message (Ctrl+Enter to commit)"
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
              handleCommit();
            }
          }}
          disabled={isLoading}
        />
        <button
          className="commit-button"
          onClick={handleCommit}
          disabled={isLoading || !commitMessage.trim() || stagedChanges.length === 0}
        >
          Commit
        </button>
      </div>

      <div className="changes-section">
        {stagedChanges.length > 0 && (
          <div className="changes-group">
            <div className="group-header">
              <span className="group-title">Staged Changes ({stagedChanges.length})</span>
              <button
                className="group-action"
                onClick={handleUnstageAll}
                title="Unstage all"
              >
                −
              </button>
            </div>
            <div className="changes-list">
              {stagedChanges.map(change => (
                <div key={change.path} className="change-item">
                  <span className={getChangeClass(change.type)}>
                    {getChangeIcon(change.type)}
                  </span>
                  <span className="change-path" title={change.path}>
                    {change.path}
                  </span>
                  <div className="change-actions">
                    <button
                      className="change-action"
                      onClick={() => handleUnstage(change.path)}
                      title="Unstage"
                    >
                      −
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {unstagedChanges.length > 0 && (
          <div className="changes-group">
            <div className="group-header">
              <span className="group-title">Changes ({unstagedChanges.length})</span>
              <button
                className="group-action"
                onClick={handleStageAll}
                title="Stage all"
              >
                +
              </button>
            </div>
            <div className="changes-list">
              {unstagedChanges.map(change => (
                <div key={change.path} className="change-item">
                  <span className={getChangeClass(change.type)}>
                    {getChangeIcon(change.type)}
                  </span>
                  <span className="change-path" title={change.path}>
                    {change.path}
                  </span>
                  <div className="change-actions">
                    <button
                      className="change-action"
                      onClick={() => handleStage(change.path)}
                      title="Stage"
                    >
                      +
                    </button>
                    <button
                      className="change-action"
                      onClick={() => handleDiscard(change.path)}
                      title="Discard"
                    >
                      ↶
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {status && status.changes.length === 0 && (
          <div className="no-changes">
            <p>No changes</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .source-control-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--vscode-sideBar-background);
          color: var(--vscode-sideBar-foreground);
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          border-bottom: 1px solid var(--vscode-panel-border);
        }

        .panel-header h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
        }

        .header-actions {
          display: flex;
          gap: 4px;
        }

        .action-button {
          padding: 4px 8px;
          background: none;
          border: none;
          color: var(--vscode-foreground);
          font-size: 14px;
          cursor: pointer;
          border-radius: 2px;
        }

        .action-button:hover:not(:disabled) {
          background: var(--vscode-toolbar-hoverBackground);
        }

        .action-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .branch-info {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: var(--vscode-sideBarSectionHeader-background);
          border-bottom: 1px solid var(--vscode-panel-border);
          font-size: 13px;
        }

        .branch-icon {
          font-size: 14px;
        }

        .branch-name {
          font-weight: 500;
        }

        .sync-info {
          font-size: 11px;
          color: var(--vscode-descriptionForeground);
        }

        .commit-section {
          padding: 12px;
          border-bottom: 1px solid var(--vscode-panel-border);
        }

        .commit-message {
          width: 100%;
          min-height: 60px;
          padding: 8px;
          background: var(--vscode-input-background);
          color: var(--vscode-input-foreground);
          border: 1px solid var(--vscode-input-border);
          outline: none;
          font-size: 13px;
          font-family: inherit;
          resize: vertical;
          margin-bottom: 8px;
        }

        .commit-message:focus {
          border-color: var(--vscode-focusBorder);
        }

        .commit-button {
          width: 100%;
          padding: 6px 12px;
          background: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          cursor: pointer;
          font-size: 13px;
          border-radius: 2px;
        }

        .commit-button:hover:not(:disabled) {
          background: var(--vscode-button-hoverBackground);
        }

        .commit-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .changes-section {
          flex: 1;
          overflow-y: auto;
        }

        .changes-group {
          margin-bottom: 8px;
        }

        .group-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: var(--vscode-sideBarSectionHeader-background);
          font-size: 12px;
          font-weight: 600;
        }

        .group-title {
          text-transform: uppercase;
        }

        .group-action {
          padding: 2px 6px;
          background: none;
          border: none;
          color: var(--vscode-foreground);
          cursor: pointer;
          font-size: 16px;
          border-radius: 2px;
        }

        .group-action:hover {
          background: var(--vscode-toolbar-hoverBackground);
        }

        .changes-list {
          padding: 4px 0;
        }

        .change-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 12px;
          cursor: pointer;
        }

        .change-item:hover {
          background: var(--vscode-list-hoverBackground);
        }

        .change-item:hover .change-actions {
          display: flex;
        }

        .change-type {
          flex-shrink: 0;
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 600;
          border-radius: 2px;
        }

        .change-modified {
          background: var(--vscode-gitDecoration-modifiedResourceForeground);
          color: white;
        }

        .change-added {
          background: var(--vscode-gitDecoration-addedResourceForeground);
          color: white;
        }

        .change-deleted {
          background: var(--vscode-gitDecoration-deletedResourceForeground);
          color: white;
        }

        .change-renamed {
          background: var(--vscode-gitDecoration-renamedResourceForeground);
          color: white;
        }

        .change-untracked {
          background: var(--vscode-gitDecoration-untrackedResourceForeground);
          color: white;
        }

        .change-path {
          flex: 1;
          font-size: 13px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .change-actions {
          display: none;
          gap: 4px;
        }

        .change-action {
          padding: 2px 6px;
          background: none;
          border: none;
          color: var(--vscode-foreground);
          cursor: pointer;
          font-size: 14px;
          border-radius: 2px;
        }

        .change-action:hover {
          background: var(--vscode-toolbar-hoverBackground);
        }

        .no-changes {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 200px;
          color: var(--vscode-descriptionForeground);
        }

        .no-changes p {
          margin: 0;
        }
      `}</style>
    </div>
  );
};
