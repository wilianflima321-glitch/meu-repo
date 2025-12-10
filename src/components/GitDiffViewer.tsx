import React, { useState, useEffect, useRef } from 'react';
import { GitService, DiffHunk, DiffLine } from '../services/GitService';
import { EventBus } from '../services/EventBus';

interface GitDiffViewerProps {
  filePath: string;
  oldContent?: string;
  newContent?: string;
  staged?: boolean;
}

export const GitDiffViewer: React.FC<GitDiffViewerProps> = ({
  filePath,
  oldContent,
  newContent,
  staged = false
}) => {
  const [viewMode, setViewMode] = useState<'split' | 'inline'>('split');
  const [hunks, setHunks] = useState<DiffHunk[]>([]);
  const [selectedHunk, setSelectedHunk] = useState<number | null>(null);
  const [showWhitespace, setShowWhitespace] = useState(false);
  const gitService = GitService.getInstance();
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadDiff();
  }, [filePath, oldContent, newContent]);

  const loadDiff = async () => {
    try {
      const diff = await gitService.getDiff(filePath, staged);
      setHunks(diff.hunks);
    } catch (error) {
      console.error('Failed to load diff:', error);
    }
  };

  const handleSyncScroll = (source: 'left' | 'right') => {
    if (viewMode !== 'split') return;

    const sourcePanel = source === 'left' ? leftPanelRef.current : rightPanelRef.current;
    const targetPanel = source === 'left' ? rightPanelRef.current : leftPanelRef.current;

    if (sourcePanel && targetPanel) {
      targetPanel.scrollTop = sourcePanel.scrollTop;
    }
  };

  const handleStageHunk = async (hunkIndex: number) => {
    try {
      await gitService.stageHunk(filePath, hunkIndex);
      await loadDiff();
      EventBus.getInstance().emit('git:statusChanged', {});
    } catch (error) {
      console.error('Failed to stage hunk:', error);
    }
  };

  const handleUnstageHunk = async (hunkIndex: number) => {
    try {
      await gitService.unstageHunk(filePath, hunkIndex);
      await loadDiff();
      EventBus.getInstance().emit('git:statusChanged', {});
    } catch (error) {
      console.error('Failed to unstage hunk:', error);
    }
  };

  const handleDiscardHunk = async (hunkIndex: number) => {
    if (!confirm('Discard changes in this hunk?')) return;

    try {
      await gitService.discardHunk(filePath, hunkIndex);
      await loadDiff();
      EventBus.getInstance().emit('git:statusChanged', {});
    } catch (error) {
      console.error('Failed to discard hunk:', error);
    }
  };

  const getLineClass = (line: DiffLine) => {
    if (line.type === 'add') return 'line-added';
    if (line.type === 'delete') return 'line-deleted';
    return 'line-context';
  };

  const renderLineNumber = (num: number | null) => {
    return num !== null ? num : '';
  };

  const renderInlineView = () => {
    return (
      <div className="diff-inline">
        {hunks.map((hunk, hunkIndex) => (
          <div key={hunkIndex} className="diff-hunk">
            <div className="hunk-header">
              <span className="hunk-range">{hunk.header}</span>
              <div className="hunk-actions">
                {!staged && (
                  <button
                    className="hunk-action"
                    onClick={() => handleStageHunk(hunkIndex)}
                    title="Stage hunk"
                  >
                    Stage
                  </button>
                )}
                {staged && (
                  <button
                    className="hunk-action"
                    onClick={() => handleUnstageHunk(hunkIndex)}
                    title="Unstage hunk"
                  >
                    Unstage
                  </button>
                )}
                {!staged && (
                  <button
                    className="hunk-action danger"
                    onClick={() => handleDiscardHunk(hunkIndex)}
                    title="Discard hunk"
                  >
                    Discard
                  </button>
                )}
              </div>
            </div>
            <div className="hunk-lines">
              {hunk.lines.map((line, lineIndex) => (
                <div key={lineIndex} className={`diff-line ${getLineClass(line)}`}>
                  <span className="line-number old">{renderLineNumber(line.oldLineNumber)}</span>
                  <span className="line-number new">{renderLineNumber(line.newLineNumber)}</span>
                  <span className="line-indicator">{line.type === 'add' ? '+' : line.type === 'delete' ? '-' : ' '}</span>
                  <span className="line-content">{line.content}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderSplitView = () => {
    return (
      <div className="diff-split">
        <div
          className="diff-panel left"
          ref={leftPanelRef}
          onScroll={() => handleSyncScroll('left')}
        >
          <div className="panel-header">Original</div>
          {hunks.map((hunk, hunkIndex) => (
            <div key={hunkIndex} className="diff-hunk">
              <div className="hunk-header">
                <span className="hunk-range">{hunk.oldStart},{hunk.oldLines}</span>
              </div>
              <div className="hunk-lines">
                {hunk.lines
                  .filter(line => line.type !== 'add')
                  .map((line, lineIndex) => (
                    <div key={lineIndex} className={`diff-line ${getLineClass(line)}`}>
                      <span className="line-number">{renderLineNumber(line.oldLineNumber)}</span>
                      <span className="line-indicator">{line.type === 'delete' ? '-' : ' '}</span>
                      <span className="line-content">{line.content}</span>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        <div
          className="diff-panel right"
          ref={rightPanelRef}
          onScroll={() => handleSyncScroll('right')}
        >
          <div className="panel-header">Modified</div>
          {hunks.map((hunk, hunkIndex) => (
            <div key={hunkIndex} className="diff-hunk">
              <div className="hunk-header">
                <span className="hunk-range">{hunk.newStart},{hunk.newLines}</span>
                <div className="hunk-actions">
                  {!staged && (
                    <button
                      className="hunk-action"
                      onClick={() => handleStageHunk(hunkIndex)}
                    >
                      Stage
                    </button>
                  )}
                  {staged && (
                    <button
                      className="hunk-action"
                      onClick={() => handleUnstageHunk(hunkIndex)}
                    >
                      Unstage
                    </button>
                  )}
                  {!staged && (
                    <button
                      className="hunk-action danger"
                      onClick={() => handleDiscardHunk(hunkIndex)}
                    >
                      Discard
                    </button>
                  )}
                </div>
              </div>
              <div className="hunk-lines">
                {hunk.lines
                  .filter(line => line.type !== 'delete')
                  .map((line, lineIndex) => (
                    <div key={lineIndex} className={`diff-line ${getLineClass(line)}`}>
                      <span className="line-number">{renderLineNumber(line.newLineNumber)}</span>
                      <span className="line-indicator">{line.type === 'add' ? '+' : ' '}</span>
                      <span className="line-content">{line.content}</span>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="git-diff-viewer">
      <div className="diff-toolbar">
        <div className="file-path">{filePath}</div>
        <div className="toolbar-actions">
          <div className="view-mode-toggle">
            <button
              className={`mode-button ${viewMode === 'split' ? 'active' : ''}`}
              onClick={() => setViewMode('split')}
            >
              Split
            </button>
            <button
              className={`mode-button ${viewMode === 'inline' ? 'active' : ''}`}
              onClick={() => setViewMode('inline')}
            >
              Inline
            </button>
          </div>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={showWhitespace}
              onChange={(e) => setShowWhitespace(e.target.checked)}
            />
            Show Whitespace
          </label>
        </div>
      </div>

      <div className="diff-content">
        {viewMode === 'inline' ? renderInlineView() : renderSplitView()}
      </div>

      <style jsx>{`
        .git-diff-viewer {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--vscode-editor-background);
          color: var(--vscode-editor-foreground);
        }

        .diff-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: var(--vscode-editorGroupHeader-tabsBackground);
          border-bottom: 1px solid var(--vscode-editorGroupHeader-tabsBorder);
        }

        .file-path {
          font-size: 13px;
          font-family: var(--vscode-editor-font-family, 'Consolas, monospace');
          color: var(--vscode-foreground);
        }

        .toolbar-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .view-mode-toggle {
          display: flex;
          border: 1px solid var(--vscode-button-border);
          border-radius: 2px;
          overflow: hidden;
        }

        .mode-button {
          padding: 4px 12px;
          background: var(--vscode-button-secondaryBackground);
          color: var(--vscode-button-secondaryForeground);
          border: none;
          cursor: pointer;
          font-size: 12px;
          border-right: 1px solid var(--vscode-button-border);
        }

        .mode-button:last-child {
          border-right: none;
        }

        .mode-button:hover {
          background: var(--vscode-button-secondaryHoverBackground);
        }

        .mode-button.active {
          background: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          cursor: pointer;
        }

        .diff-content {
          flex: 1;
          overflow: auto;
        }

        .diff-inline {
          font-family: var(--vscode-editor-font-family, 'Consolas, monospace');
          font-size: var(--vscode-editor-font-size, 13px);
        }

        .diff-split {
          display: flex;
          height: 100%;
        }

        .diff-panel {
          flex: 1;
          overflow-y: auto;
          font-family: var(--vscode-editor-font-family, 'Consolas, monospace');
          font-size: var(--vscode-editor-font-size, 13px);
        }

        .diff-panel.left {
          border-right: 1px solid var(--vscode-editorGroupHeader-tabsBorder);
        }

        .panel-header {
          padding: 8px 12px;
          background: var(--vscode-editorGroupHeader-tabsBackground);
          border-bottom: 1px solid var(--vscode-editorGroupHeader-tabsBorder);
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .diff-hunk {
          margin-bottom: 16px;
        }

        .hunk-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 8px;
          background: var(--vscode-diffEditor-unchangedRegionBackground);
          border-top: 1px solid var(--vscode-diffEditor-border);
          border-bottom: 1px solid var(--vscode-diffEditor-border);
          font-size: 11px;
          color: var(--vscode-descriptionForeground);
        }

        .hunk-range {
          font-family: var(--vscode-editor-font-family, 'Consolas, monospace');
        }

        .hunk-actions {
          display: flex;
          gap: 8px;
        }

        .hunk-action {
          padding: 2px 8px;
          background: var(--vscode-button-secondaryBackground);
          color: var(--vscode-button-secondaryForeground);
          border: none;
          cursor: pointer;
          font-size: 11px;
          border-radius: 2px;
        }

        .hunk-action:hover {
          background: var(--vscode-button-secondaryHoverBackground);
        }

        .hunk-action.danger {
          background: transparent;
          color: var(--vscode-errorForeground);
          border: 1px solid var(--vscode-errorForeground);
        }

        .hunk-action.danger:hover {
          background: var(--vscode-errorForeground);
          color: var(--vscode-errorBackground);
        }

        .hunk-lines {
          background: var(--vscode-editor-background);
        }

        .diff-line {
          display: flex;
          align-items: center;
          line-height: 1.6;
          min-height: 20px;
        }

        .diff-line:hover {
          background: var(--vscode-editor-hoverHighlightBackground);
        }

        .line-added {
          background: var(--vscode-diffEditor-insertedTextBackground);
        }

        .line-deleted {
          background: var(--vscode-diffEditor-removedTextBackground);
        }

        .line-context {
          background: var(--vscode-editor-background);
        }

        .line-number {
          display: inline-block;
          width: 50px;
          padding: 0 8px;
          text-align: right;
          color: var(--vscode-editorLineNumber-foreground);
          user-select: none;
          flex-shrink: 0;
        }

        .line-number.old {
          border-right: 1px solid var(--vscode-editorGroupHeader-tabsBorder);
        }

        .line-number.new {
          border-right: 1px solid var(--vscode-editorGroupHeader-tabsBorder);
        }

        .line-indicator {
          display: inline-block;
          width: 20px;
          text-align: center;
          color: var(--vscode-descriptionForeground);
          user-select: none;
          flex-shrink: 0;
        }

        .line-content {
          flex: 1;
          padding: 0 8px;
          white-space: pre;
          overflow-x: auto;
        }
      `}</style>
    </div>
  );
};
