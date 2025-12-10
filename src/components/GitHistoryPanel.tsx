import React, { useState, useEffect } from 'react';
import { GitService, GitCommit, GitFileChange } from '../services/GitService';
import { EventBus } from '../services/EventBus';

export const GitHistoryPanel: React.FC = () => {
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [selectedCommit, setSelectedCommit] = useState<GitCommit | null>(null);
  const [fileChanges, setFileChanges] = useState<GitFileChange[]>([]);
  const [filterBranch, setFilterBranch] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const gitService = GitService.getInstance();

  useEffect(() => {
    loadCommits();
  }, [filterBranch, page]);

  useEffect(() => {
    if (selectedCommit) {
      loadFileChanges(selectedCommit.hash);
    }
  }, [selectedCommit]);

  const loadCommits = async () => {
    setIsLoading(true);
    try {
      const newCommits = await gitService.getCommitHistory({
        branch: filterBranch || undefined,
        skip: page * 50,
        limit: 50
      });
      
      if (page === 0) {
        setCommits(newCommits);
      } else {
        setCommits(prev => [...prev, ...newCommits]);
      }
      
      setHasMore(newCommits.length === 50);
    } catch (error) {
      console.error('Failed to load commits:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFileChanges = async (commitHash: string) => {
    try {
      const changes = await gitService.getCommitFiles(commitHash);
      setFileChanges(changes);
    } catch (error) {
      console.error('Failed to load file changes:', error);
    }
  };

  const handleCommitClick = (commit: GitCommit) => {
    setSelectedCommit(commit);
  };

  const handleLoadMore = () => {
    setPage(prev => prev + 1);
  };

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    EventBus.getInstance().emit('notification:show', {
      message: 'Commit hash copied',
      type: 'info'
    });
  };

  const handleCheckoutCommit = async (hash: string) => {
    if (!confirm('Checkout this commit? This will detach HEAD.')) return;

    try {
      await gitService.checkout(hash);
      EventBus.getInstance().emit('notification:show', {
        message: 'Checked out commit',
        type: 'success'
      });
    } catch (error) {
      console.error('Failed to checkout commit:', error);
      EventBus.getInstance().emit('notification:show', {
        message: `Checkout failed: ${error.message}`,
        type: 'error'
      });
    }
  };

  const handleRevertCommit = async (hash: string) => {
    if (!confirm('Revert this commit?')) return;

    try {
      await gitService.revert(hash);
      await loadCommits();
      EventBus.getInstance().emit('notification:show', {
        message: 'Commit reverted',
        type: 'success'
      });
    } catch (error) {
      console.error('Failed to revert commit:', error);
      EventBus.getInstance().emit('notification:show', {
        message: `Revert failed: ${error.message}`,
        type: 'error'
      });
    }
  };

  const handleViewDiff = (file: GitFileChange) => {
    EventBus.getInstance().emit('git:viewDiff', {
      filePath: file.path,
      commitHash: selectedCommit?.hash
    });
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  };

  const getChangeIcon = (type: string) => {
    switch (type) {
      case 'modified': return 'M';
      case 'added': return 'A';
      case 'deleted': return 'D';
      case 'renamed': return 'R';
      default: return '?';
    }
  };

  const getChangeClass = (type: string) => {
    return `change-type change-${type}`;
  };

  const filteredCommits = commits.filter(commit => {
    if (!searchQuery) return true;
    return (
      commit.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      commit.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      commit.hash.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="git-history-panel">
      <div className="history-header">
        <input
          type="text"
          className="search-input"
          placeholder="Search commits..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <input
          type="text"
          className="branch-filter"
          placeholder="Filter by branch..."
          value={filterBranch}
          onChange={(e) => setFilterBranch(e.target.value)}
        />
      </div>

      <div className="history-content">
        <div className="commits-list">
          {filteredCommits.map(commit => (
            <div
              key={commit.hash}
              className={`commit-item ${selectedCommit?.hash === commit.hash ? 'selected' : ''}`}
              onClick={() => handleCommitClick(commit)}
            >
              <div className="commit-header">
                <div className="commit-graph">
                  <div className="graph-line" />
                  <div className="graph-dot" />
                </div>
                <div className="commit-info">
                  <div className="commit-message">{commit.message}</div>
                  <div className="commit-meta">
                    <span className="commit-author">{commit.author}</span>
                    <span className="commit-date">{formatDate(commit.date)}</span>
                    <span className="commit-hash" title={commit.hash}>
                      {commit.hash.substring(0, 7)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {hasMore && !isLoading && (
            <button className="load-more" onClick={handleLoadMore}>
              Load More
            </button>
          )}

          {isLoading && (
            <div className="loading">Loading commits...</div>
          )}

          {filteredCommits.length === 0 && !isLoading && (
            <div className="no-commits">No commits found</div>
          )}
        </div>

        {selectedCommit && (
          <div className="commit-details">
            <div className="details-header">
              <h3>Commit Details</h3>
              <div className="header-actions">
                <button
                  className="action-button"
                  onClick={() => handleCopyHash(selectedCommit.hash)}
                  title="Copy hash"
                >
                  Copy Hash
                </button>
                <button
                  className="action-button"
                  onClick={() => handleCheckoutCommit(selectedCommit.hash)}
                  title="Checkout"
                >
                  Checkout
                </button>
                <button
                  className="action-button danger"
                  onClick={() => handleRevertCommit(selectedCommit.hash)}
                  title="Revert"
                >
                  Revert
                </button>
              </div>
            </div>

            <div className="details-content">
              <div className="detail-section">
                <label>Message:</label>
                <div className="detail-value">{selectedCommit.message}</div>
              </div>

              <div className="detail-section">
                <label>Author:</label>
                <div className="detail-value">{selectedCommit.author}</div>
              </div>

              <div className="detail-section">
                <label>Date:</label>
                <div className="detail-value">
                  {selectedCommit.date.toLocaleString()}
                </div>
              </div>

              <div className="detail-section">
                <label>Hash:</label>
                <div className="detail-value hash">{selectedCommit.hash}</div>
              </div>

              {selectedCommit.parents && selectedCommit.parents.length > 0 && (
                <div className="detail-section">
                  <label>Parents:</label>
                  <div className="detail-value">
                    {selectedCommit.parents.map(parent => (
                      <span key={parent} className="parent-hash">
                        {parent.substring(0, 7)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="detail-section">
                <label>Changed Files ({fileChanges.length}):</label>
                <div className="files-list">
                  {fileChanges.map(file => (
                    <div
                      key={file.path}
                      className="file-item"
                      onClick={() => handleViewDiff(file)}
                    >
                      <span className={getChangeClass(file.type)}>
                        {getChangeIcon(file.type)}
                      </span>
                      <span className="file-path">{file.path}</span>
                      <span className="file-stats">
                        <span className="additions">+{file.additions}</span>
                        <span className="deletions">-{file.deletions}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .git-history-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--vscode-editor-background);
          color: var(--vscode-editor-foreground);
        }

        .history-header {
          display: flex;
          gap: 8px;
          padding: 12px;
          background: var(--vscode-editorGroupHeader-tabsBackground);
          border-bottom: 1px solid var(--vscode-editorGroupHeader-tabsBorder);
        }

        .search-input,
        .branch-filter {
          flex: 1;
          padding: 6px 12px;
          background: var(--vscode-input-background);
          color: var(--vscode-input-foreground);
          border: 1px solid var(--vscode-input-border);
          outline: none;
          font-size: 13px;
        }

        .search-input:focus,
        .branch-filter:focus {
          border-color: var(--vscode-focusBorder);
        }

        .history-content {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        .commits-list {
          width: 400px;
          border-right: 1px solid var(--vscode-editorGroupHeader-tabsBorder);
          overflow-y: auto;
        }

        .commit-item {
          padding: 12px;
          border-bottom: 1px solid var(--vscode-panel-border);
          cursor: pointer;
        }

        .commit-item:hover {
          background: var(--vscode-list-hoverBackground);
        }

        .commit-item.selected {
          background: var(--vscode-list-activeSelectionBackground);
          color: var(--vscode-list-activeSelectionForeground);
        }

        .commit-header {
          display: flex;
          gap: 12px;
        }

        .commit-graph {
          position: relative;
          width: 20px;
          flex-shrink: 0;
        }

        .graph-line {
          position: absolute;
          left: 9px;
          top: 0;
          bottom: 0;
          width: 2px;
          background: var(--vscode-gitDecoration-modifiedResourceForeground);
        }

        .graph-dot {
          position: absolute;
          left: 5px;
          top: 8px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--vscode-gitDecoration-modifiedResourceForeground);
          border: 2px solid var(--vscode-editor-background);
        }

        .commit-info {
          flex: 1;
          min-width: 0;
        }

        .commit-message {
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .commit-meta {
          display: flex;
          gap: 12px;
          font-size: 11px;
          color: var(--vscode-descriptionForeground);
        }

        .commit-author {
          font-weight: 500;
        }

        .commit-hash {
          font-family: var(--vscode-editor-font-family, 'Consolas, monospace');
        }

        .load-more {
          width: 100%;
          padding: 12px;
          background: var(--vscode-button-secondaryBackground);
          color: var(--vscode-button-secondaryForeground);
          border: none;
          cursor: pointer;
          font-size: 13px;
        }

        .load-more:hover {
          background: var(--vscode-button-secondaryHoverBackground);
        }

        .loading,
        .no-commits {
          padding: 20px;
          text-align: center;
          color: var(--vscode-descriptionForeground);
        }

        .commit-details {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .details-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: var(--vscode-editorGroupHeader-tabsBackground);
          border-bottom: 1px solid var(--vscode-editorGroupHeader-tabsBorder);
        }

        .details-header h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
        }

        .header-actions {
          display: flex;
          gap: 8px;
        }

        .action-button {
          padding: 4px 12px;
          background: var(--vscode-button-secondaryBackground);
          color: var(--vscode-button-secondaryForeground);
          border: none;
          cursor: pointer;
          font-size: 12px;
          border-radius: 2px;
        }

        .action-button:hover {
          background: var(--vscode-button-secondaryHoverBackground);
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

        .details-content {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }

        .detail-section {
          margin-bottom: 16px;
        }

        .detail-section label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          color: var(--vscode-descriptionForeground);
          margin-bottom: 6px;
        }

        .detail-value {
          font-size: 13px;
          line-height: 1.5;
        }

        .detail-value.hash {
          font-family: var(--vscode-editor-font-family, 'Consolas, monospace');
          font-size: 12px;
        }

        .parent-hash {
          display: inline-block;
          padding: 2px 6px;
          margin-right: 6px;
          background: var(--vscode-badge-background);
          color: var(--vscode-badge-foreground);
          font-family: var(--vscode-editor-font-family, 'Consolas, monospace');
          font-size: 11px;
          border-radius: 2px;
        }

        .files-list {
          margin-top: 8px;
        }

        .file-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 8px;
          cursor: pointer;
          font-size: 12px;
          border-radius: 2px;
        }

        .file-item:hover {
          background: var(--vscode-list-hoverBackground);
        }

        .change-type {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          font-size: 10px;
          font-weight: 600;
          border-radius: 2px;
          flex-shrink: 0;
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

        .file-path {
          flex: 1;
          font-family: var(--vscode-editor-font-family, 'Consolas, monospace');
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .file-stats {
          display: flex;
          gap: 8px;
          font-size: 11px;
          flex-shrink: 0;
        }

        .additions {
          color: var(--vscode-gitDecoration-addedResourceForeground);
        }

        .deletions {
          color: var(--vscode-gitDecoration-deletedResourceForeground);
        }
      `}</style>
    </div>
  );
};
