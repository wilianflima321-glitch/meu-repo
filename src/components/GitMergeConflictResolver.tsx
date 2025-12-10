import React, { useState, useEffect } from 'react';
import { GitService, MergeConflict, ConflictRegion } from '../services/GitService';
import { EventBus } from '../services/EventBus';
import { EditorService } from '../services/EditorService';

export const GitMergeConflictResolver: React.FC = () => {
  const [conflicts, setConflicts] = useState<MergeConflict[]>([]);
  const [selectedConflict, setSelectedConflict] = useState<MergeConflict | null>(null);
  const [resolution, setResolution] = useState<Map<number, 'current' | 'incoming' | 'both' | 'manual'>>(new Map());
  const [manualContent, setManualContent] = useState<Map<number, string>>(new Map());
  const gitService = GitService.getInstance();
  const editorService = EditorService.getInstance();

  useEffect(() => {
    loadConflicts();

    const unsubscribe = EventBus.getInstance().subscribe('git:conflictsDetected', loadConflicts);
    return () => unsubscribe();
  }, []);

  const loadConflicts = async () => {
    try {
      const detectedConflicts = await gitService.getConflicts();
      setConflicts(detectedConflicts);
      
      if (detectedConflicts.length > 0 && !selectedConflict) {
        setSelectedConflict(detectedConflicts[0]);
      }
    } catch (error) {
      console.error('Failed to load conflicts:', error);
    }
  };

  const handleAcceptCurrent = (conflictIndex: number) => {
    const newResolution = new Map(resolution);
    newResolution.set(conflictIndex, 'current');
    setResolution(newResolution);
  };

  const handleAcceptIncoming = (conflictIndex: number) => {
    const newResolution = new Map(resolution);
    newResolution.set(conflictIndex, 'incoming');
    setResolution(newResolution);
  };

  const handleAcceptBoth = (conflictIndex: number) => {
    const newResolution = new Map(resolution);
    newResolution.set(conflictIndex, 'both');
    setResolution(newResolution);
  };

  const handleManualEdit = (conflictIndex: number, content: string) => {
    const newResolution = new Map(resolution);
    newResolution.set(conflictIndex, 'manual');
    setResolution(newResolution);

    const newManualContent = new Map(manualContent);
    newManualContent.set(conflictIndex, content);
    setManualContent(newManualContent);
  };

  const handleResolveConflict = async () => {
    if (!selectedConflict) return;

    try {
      const resolvedContent = buildResolvedContent(selectedConflict);
      await gitService.resolveConflict(selectedConflict.filePath, resolvedContent);
      
      await loadConflicts();
      
      EventBus.getInstance().emit('notification:show', {
        message: `Conflict resolved in ${selectedConflict.filePath}`,
        type: 'success'
      });
      
      EventBus.getInstance().emit('git:statusChanged', {});
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
      EventBus.getInstance().emit('notification:show', {
        message: `Failed to resolve conflict: ${error.message}`,
        type: 'error'
      });
    }
  };

  const handleResolveAll = async () => {
    if (!confirm('Resolve all conflicts with current selections?')) return;

    try {
      for (const conflict of conflicts) {
        const resolvedContent = buildResolvedContent(conflict);
        await gitService.resolveConflict(conflict.filePath, resolvedContent);
      }
      
      await loadConflicts();
      
      EventBus.getInstance().emit('notification:show', {
        message: 'All conflicts resolved',
        type: 'success'
      });
      
      EventBus.getInstance().emit('git:statusChanged', {});
    } catch (error) {
      console.error('Failed to resolve all conflicts:', error);
      EventBus.getInstance().emit('notification:show', {
        message: `Failed to resolve conflicts: ${error.message}`,
        type: 'error'
      });
    }
  };

  const buildResolvedContent = (conflict: MergeConflict): string => {
    const lines: string[] = [];
    
    conflict.regions.forEach((region, index) => {
      const resolutionType = resolution.get(index) || 'current';
      
      switch (resolutionType) {
        case 'current':
          lines.push(...region.current);
          break;
        case 'incoming':
          lines.push(...region.incoming);
          break;
        case 'both':
          lines.push(...region.current);
          lines.push(...region.incoming);
          break;
        case 'manual':
          const manual = manualContent.get(index);
          if (manual) {
            lines.push(...manual.split('\n'));
          }
          break;
      }
    });
    
    return lines.join('\n');
  };

  const handleOpenInEditor = async (filePath: string) => {
    try {
      await editorService.openFile(filePath);
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  };

  const getConflictStats = () => {
    const total = conflicts.length;
    const resolved = conflicts.filter(c => 
      c.regions.every((_, i) => resolution.has(i))
    ).length;
    return { total, resolved };
  };

  const stats = getConflictStats();

  return (
    <div className="git-merge-conflict-resolver">
      <div className="resolver-header">
        <h3>Merge Conflicts</h3>
        <div className="header-stats">
          <span className="stat">
            {stats.resolved} / {stats.total} resolved
          </span>
        </div>
        <div className="header-actions">
          <button
            className="action-button"
            onClick={handleResolveAll}
            disabled={stats.resolved !== stats.total}
          >
            Resolve All
          </button>
        </div>
      </div>

      <div className="resolver-content">
        <div className="conflicts-list">
          {conflicts.map((conflict, index) => {
            const isResolved = conflict.regions.every((_, i) => resolution.has(i));
            
            return (
              <div
                key={conflict.filePath}
                className={`conflict-item ${selectedConflict?.filePath === conflict.filePath ? 'selected' : ''} ${isResolved ? 'resolved' : ''}`}
                onClick={() => setSelectedConflict(conflict)}
              >
                <div className="conflict-status">
                  {isResolved ? '✓' : '⚠'}
                </div>
                <div className="conflict-info">
                  <div className="conflict-path">{conflict.filePath}</div>
                  <div className="conflict-meta">
                    {conflict.regions.length} conflict{conflict.regions.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            );
          })}
          
          {conflicts.length === 0 && (
            <div className="no-conflicts">
              <p>No merge conflicts</p>
            </div>
          )}
        </div>

        {selectedConflict && (
          <div className="conflict-details">
            <div className="details-header">
              <span className="file-path">{selectedConflict.filePath}</span>
              <button
                className="action-button"
                onClick={() => handleOpenInEditor(selectedConflict.filePath)}
              >
                Open in Editor
              </button>
            </div>

            <div className="regions-list">
              {selectedConflict.regions.map((region, regionIndex) => {
                const currentResolution = resolution.get(regionIndex);
                
                return (
                  <div key={regionIndex} className="conflict-region">
                    <div className="region-header">
                      <span className="region-title">Conflict {regionIndex + 1}</span>
                      <div className="region-actions">
                        <button
                          className={`resolution-button ${currentResolution === 'current' ? 'active' : ''}`}
                          onClick={() => handleAcceptCurrent(regionIndex)}
                        >
                          Accept Current
                        </button>
                        <button
                          className={`resolution-button ${currentResolution === 'incoming' ? 'active' : ''}`}
                          onClick={() => handleAcceptIncoming(regionIndex)}
                        >
                          Accept Incoming
                        </button>
                        <button
                          className={`resolution-button ${currentResolution === 'both' ? 'active' : ''}`}
                          onClick={() => handleAcceptBoth(regionIndex)}
                        >
                          Accept Both
                        </button>
                      </div>
                    </div>

                    <div className="region-content">
                      <div className="content-section current">
                        <div className="section-label">Current Changes (HEAD)</div>
                        <pre className="code-block">
                          {region.current.join('\n')}
                        </pre>
                      </div>

                      <div className="content-divider" />

                      <div className="content-section incoming">
                        <div className="section-label">Incoming Changes</div>
                        <pre className="code-block">
                          {region.incoming.join('\n')}
                        </pre>
                      </div>

                      {currentResolution === 'manual' && (
                        <div className="content-section manual">
                          <div className="section-label">Manual Resolution</div>
                          <textarea
                            className="manual-editor"
                            value={manualContent.get(regionIndex) || ''}
                            onChange={(e) => handleManualEdit(regionIndex, e.target.value)}
                            placeholder="Enter manual resolution..."
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="details-footer">
              <button
                className="action-button primary"
                onClick={handleResolveConflict}
                disabled={!selectedConflict.regions.every((_, i) => resolution.has(i))}
              >
                Mark as Resolved
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .git-merge-conflict-resolver {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--vscode-editor-background);
          color: var(--vscode-editor-foreground);
        }

        .resolver-header {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px;
          background: var(--vscode-editorGroupHeader-tabsBackground);
          border-bottom: 1px solid var(--vscode-editorGroupHeader-tabsBorder);
        }

        .resolver-header h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
        }

        .header-stats {
          flex: 1;
        }

        .stat {
          font-size: 12px;
          color: var(--vscode-descriptionForeground);
        }

        .header-actions {
          display: flex;
          gap: 8px;
        }

        .resolver-content {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        .conflicts-list {
          width: 300px;
          border-right: 1px solid var(--vscode-editorGroupHeader-tabsBorder);
          overflow-y: auto;
        }

        .conflict-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          cursor: pointer;
          border-bottom: 1px solid var(--vscode-panel-border);
        }

        .conflict-item:hover {
          background: var(--vscode-list-hoverBackground);
        }

        .conflict-item.selected {
          background: var(--vscode-list-activeSelectionBackground);
          color: var(--vscode-list-activeSelectionForeground);
        }

        .conflict-item.resolved .conflict-status {
          color: var(--vscode-gitDecoration-addedResourceForeground);
        }

        .conflict-status {
          font-size: 18px;
          color: var(--vscode-errorForeground);
        }

        .conflict-info {
          flex: 1;
          min-width: 0;
        }

        .conflict-path {
          font-size: 13px;
          font-family: var(--vscode-editor-font-family, 'Consolas, monospace');
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .conflict-meta {
          font-size: 11px;
          color: var(--vscode-descriptionForeground);
          margin-top: 2px;
        }

        .no-conflicts {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 200px;
          color: var(--vscode-descriptionForeground);
        }

        .no-conflicts p {
          margin: 0;
        }

        .conflict-details {
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

        .file-path {
          font-size: 13px;
          font-family: var(--vscode-editor-font-family, 'Consolas, monospace');
        }

        .regions-list {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }

        .conflict-region {
          margin-bottom: 24px;
          border: 1px solid var(--vscode-panel-border);
          border-radius: 4px;
          overflow: hidden;
        }

        .region-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: var(--vscode-editorGroupHeader-tabsBackground);
          border-bottom: 1px solid var(--vscode-panel-border);
        }

        .region-title {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .region-actions {
          display: flex;
          gap: 8px;
        }

        .resolution-button {
          padding: 4px 12px;
          background: var(--vscode-button-secondaryBackground);
          color: var(--vscode-button-secondaryForeground);
          border: none;
          cursor: pointer;
          font-size: 11px;
          border-radius: 2px;
        }

        .resolution-button:hover {
          background: var(--vscode-button-secondaryHoverBackground);
        }

        .resolution-button.active {
          background: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
        }

        .region-content {
          display: flex;
          flex-direction: column;
        }

        .content-section {
          padding: 12px;
        }

        .content-section.current {
          background: var(--vscode-diffEditor-removedTextBackground);
        }

        .content-section.incoming {
          background: var(--vscode-diffEditor-insertedTextBackground);
        }

        .content-section.manual {
          background: var(--vscode-editor-background);
        }

        .section-label {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          margin-bottom: 8px;
          color: var(--vscode-descriptionForeground);
        }

        .code-block {
          margin: 0;
          padding: 8px;
          background: var(--vscode-editor-background);
          border: 1px solid var(--vscode-panel-border);
          border-radius: 2px;
          font-family: var(--vscode-editor-font-family, 'Consolas, monospace');
          font-size: var(--vscode-editor-font-size, 13px);
          line-height: 1.6;
          overflow-x: auto;
        }

        .manual-editor {
          width: 100%;
          min-height: 100px;
          padding: 8px;
          background: var(--vscode-input-background);
          color: var(--vscode-input-foreground);
          border: 1px solid var(--vscode-input-border);
          outline: none;
          font-family: var(--vscode-editor-font-family, 'Consolas, monospace');
          font-size: var(--vscode-editor-font-size, 13px);
          line-height: 1.6;
          resize: vertical;
        }

        .manual-editor:focus {
          border-color: var(--vscode-focusBorder);
        }

        .content-divider {
          height: 1px;
          background: var(--vscode-panel-border);
        }

        .details-footer {
          padding: 12px;
          background: var(--vscode-editorGroupHeader-tabsBackground);
          border-top: 1px solid var(--vscode-editorGroupHeader-tabsBorder);
          display: flex;
          justify-content: flex-end;
        }

        .action-button {
          padding: 6px 16px;
          background: var(--vscode-button-secondaryBackground);
          color: var(--vscode-button-secondaryForeground);
          border: none;
          cursor: pointer;
          font-size: 12px;
          border-radius: 2px;
        }

        .action-button:hover:not(:disabled) {
          background: var(--vscode-button-secondaryHoverBackground);
        }

        .action-button.primary {
          background: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
        }

        .action-button.primary:hover:not(:disabled) {
          background: var(--vscode-button-hoverBackground);
        }

        .action-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};
