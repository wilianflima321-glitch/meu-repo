import React, { useState, useEffect, useRef } from 'react';
import { GitService, BlameLine } from '../services/GitService';
import { EventBus } from '../services/EventBus';

interface GitBlameViewProps {
  filePath: string;
  content: string;
}

export const GitBlameView: React.FC<GitBlameViewProps> = ({ filePath, content }) => {
  const [blameData, setBlameData] = useState<BlameLine[]>([]);
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);
  const [selectedCommit, setSelectedCommit] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(true);
  const [colorByAge, setColorByAge] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const gitService = GitService.getInstance();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadBlame();
  }, [filePath]);

  const loadBlame = async () => {
    setIsLoading(true);
    try {
      const blame = await gitService.getBlame(filePath);
      setBlameData(blame);
    } catch (error) {
      console.error('Failed to load blame:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLineClick = (line: BlameLine) => {
    setSelectedCommit(line.commit.hash);
    EventBus.getInstance().emit('git:showCommit', {
      hash: line.commit.hash
    });
  };

  const handleCopyCommitHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    EventBus.getInstance().emit('notification:show', {
      message: 'Commit hash copied',
      type: 'info'
    });
  };

  const getAgeColor = (date: Date): string => {
    if (!colorByAge) return 'transparent';
    
    const now = new Date();
    const ageInDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
    
    if (ageInDays < 7) return 'rgba(0, 255, 0, 0.1)';
    if (ageInDays < 30) return 'rgba(100, 200, 0, 0.08)';
    if (ageInDays < 90) return 'rgba(200, 200, 0, 0.06)';
    if (ageInDays < 180) return 'rgba(255, 150, 0, 0.04)';
    return 'rgba(255, 0, 0, 0.02)';
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
  };

  const getAuthorInitials = (author: string): string => {
    const parts = author.split(' ');
    if (parts.length >= 2) {
      return parts[0][0] + parts[1][0];
    }
    return author.substring(0, 2);
  };

  const getAuthorColor = (author: string): string => {
    let hash = 0;
    for (let i = 0; i < author.length; i++) {
      hash = author.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue}, 60%, 50%)`;
  };

  const lines = content.split('\n');

  return (
    <div className="git-blame-view" ref={containerRef}>
      <div className="blame-toolbar">
        <div className="toolbar-title">Git Blame: {filePath}</div>
        <div className="toolbar-actions">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={showDetails}
              onChange={(e) => setShowDetails(e.target.checked)}
            />
            Show Details
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={colorByAge}
              onChange={(e) => setColorByAge(e.target.checked)}
            />
            Color by Age
          </label>
        </div>
      </div>

      {isLoading ? (
        <div className="loading">Loading blame data...</div>
      ) : (
        <div className="blame-content">
          {blameData.map((blameLine, index) => {
            const isHovered = hoveredLine === index;
            const isSelected = selectedCommit === blameLine.commit.hash;
            const ageColor = getAgeColor(blameLine.commit.date);
            
            return (
              <div
                key={index}
                className={`blame-line ${isHovered ? 'hovered' : ''} ${isSelected ? 'selected' : ''}`}
                style={{ background: ageColor }}
                onMouseEnter={() => setHoveredLine(index)}
                onMouseLeave={() => setHoveredLine(null)}
                onClick={() => handleLineClick(blameLine)}
              >
                <div className="blame-info">
                  {showDetails ? (
                    <>
                      <div
                        className="author-avatar"
                        style={{ background: getAuthorColor(blameLine.commit.author) }}
                        title={blameLine.commit.author}
                      >
                        {getAuthorInitials(blameLine.commit.author)}
                      </div>
                      <div className="commit-details">
                        <div className="commit-hash" title={blameLine.commit.hash}>
                          {blameLine.commit.hash.substring(0, 7)}
                        </div>
                        <div className="commit-author">
                          {blameLine.commit.author}
                        </div>
                        <div className="commit-date">
                          {formatDate(blameLine.commit.date)}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="compact-info">
                      <div
                        className="author-avatar small"
                        style={{ background: getAuthorColor(blameLine.commit.author) }}
                        title={`${blameLine.commit.author} - ${formatDate(blameLine.commit.date)}`}
                      >
                        {getAuthorInitials(blameLine.commit.author)}
                      </div>
                      <div className="commit-hash" title={blameLine.commit.hash}>
                        {blameLine.commit.hash.substring(0, 7)}
                      </div>
                    </div>
                  )}
                </div>

                <div className="line-number">{index + 1}</div>
                <div className="line-content">{lines[index] || ''}</div>

                {isHovered && (
                  <div className="hover-tooltip">
                    <div className="tooltip-header">
                      <strong>{blameLine.commit.author}</strong>
                      <button
                        className="copy-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyCommitHash(blameLine.commit.hash);
                        }}
                      >
                        Copy Hash
                      </button>
                    </div>
                    <div className="tooltip-message">{blameLine.commit.message}</div>
                    <div className="tooltip-meta">
                      <span>{blameLine.commit.hash.substring(0, 7)}</span>
                      <span>{blameLine.commit.date.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <style jsx>{`
        .git-blame-view {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--vscode-editor-background);
          color: var(--vscode-editor-foreground);
        }

        .blame-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: var(--vscode-editorGroupHeader-tabsBackground);
          border-bottom: 1px solid var(--vscode-editorGroupHeader-tabsBorder);
        }

        .toolbar-title {
          font-size: 13px;
          font-family: var(--vscode-editor-font-family, 'Consolas, monospace');
        }

        .toolbar-actions {
          display: flex;
          gap: 16px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          cursor: pointer;
        }

        .loading {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 200px;
          color: var(--vscode-descriptionForeground);
        }

        .blame-content {
          flex: 1;
          overflow: auto;
          font-family: var(--vscode-editor-font-family, 'Consolas, monospace');
          font-size: var(--vscode-editor-font-size, 13px);
        }

        .blame-line {
          display: flex;
          align-items: center;
          min-height: 22px;
          cursor: pointer;
          position: relative;
          border-bottom: 1px solid var(--vscode-panel-border);
        }

        .blame-line:hover {
          background: var(--vscode-editor-hoverHighlightBackground) !important;
        }

        .blame-line.selected {
          background: var(--vscode-editor-selectionBackground) !important;
        }

        .blame-info {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 8px;
          min-width: 280px;
          border-right: 1px solid var(--vscode-editorGroupHeader-tabsBorder);
          background: var(--vscode-sideBar-background);
        }

        .author-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 600;
          color: white;
          flex-shrink: 0;
        }

        .author-avatar.small {
          width: 20px;
          height: 20px;
          font-size: 9px;
        }

        .commit-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
          min-width: 0;
        }

        .commit-hash {
          font-size: 11px;
          color: var(--vscode-descriptionForeground);
          font-family: var(--vscode-editor-font-family, 'Consolas, monospace');
        }

        .commit-author {
          font-size: 11px;
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .commit-date {
          font-size: 10px;
          color: var(--vscode-descriptionForeground);
        }

        .compact-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .line-number {
          padding: 0 12px;
          text-align: right;
          color: var(--vscode-editorLineNumber-foreground);
          user-select: none;
          min-width: 50px;
        }

        .line-content {
          flex: 1;
          padding: 0 12px;
          white-space: pre;
          overflow-x: auto;
        }

        .hover-tooltip {
          position: absolute;
          left: 0;
          top: 100%;
          z-index: 1000;
          background: var(--vscode-editorHoverWidget-background);
          border: 1px solid var(--vscode-editorHoverWidget-border);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          padding: 12px;
          min-width: 300px;
          max-width: 500px;
        }

        .tooltip-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .copy-button {
          padding: 2px 8px;
          background: var(--vscode-button-secondaryBackground);
          color: var(--vscode-button-secondaryForeground);
          border: none;
          cursor: pointer;
          font-size: 11px;
          border-radius: 2px;
        }

        .copy-button:hover {
          background: var(--vscode-button-secondaryHoverBackground);
        }

        .tooltip-message {
          font-size: 12px;
          margin-bottom: 8px;
          line-height: 1.4;
        }

        .tooltip-meta {
          display: flex;
          gap: 12px;
          font-size: 11px;
          color: var(--vscode-descriptionForeground);
        }
      `}</style>
    </div>
  );
};
