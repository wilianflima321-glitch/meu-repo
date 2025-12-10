import React, { useState, useEffect } from 'react';
import { BreakpointService, Breakpoint } from '../services/BreakpointService';
import { EventBus } from '../services/EventBus';
import { EditorService } from '../services/EditorService';

export const DebugBreakpointsPanel: React.FC = () => {
  const [breakpoints, setBreakpoints] = useState<Breakpoint[]>([]);
  const [groupBy, setGroupBy] = useState<'file' | 'none'>('file');
  const [showDisabled, setShowDisabled] = useState(true);
  const [editingBreakpoint, setEditingBreakpoint] = useState<string | null>(null);
  const [conditionInput, setConditionInput] = useState('');
  const [hitCountInput, setHitCountInput] = useState('');
  const [logMessageInput, setLogMessageInput] = useState('');
  const breakpointService = BreakpointService.getInstance();
  const editorService = EditorService.getInstance();

  useEffect(() => {
    loadBreakpoints();

    const unsubscribe1 = EventBus.getInstance().subscribe('breakpoint:added', loadBreakpoints);
    const unsubscribe2 = EventBus.getInstance().subscribe('breakpoint:removed', loadBreakpoints);
    const unsubscribe3 = EventBus.getInstance().subscribe('breakpoint:changed', loadBreakpoints);

    return () => {
      unsubscribe1();
      unsubscribe2();
      unsubscribe3();
    };
  }, []);

  const loadBreakpoints = () => {
    const allBreakpoints = breakpointService.getBreakpoints();
    setBreakpoints(allBreakpoints);
  };

  const handleToggleBreakpoint = (id: string) => {
    const breakpoint = breakpoints.find(bp => bp.id === id);
    if (breakpoint) {
      breakpointService.updateBreakpoint(id, { enabled: !breakpoint.enabled });
    }
  };

  const handleRemoveBreakpoint = (id: string) => {
    breakpointService.removeBreakpoint(id);
  };

  const handleRemoveAll = () => {
    if (confirm('Remove all breakpoints?')) {
      breakpointService.clearBreakpoints();
    }
  };

  const handleEnableAll = () => {
    breakpoints.forEach(bp => {
      if (!bp.enabled) {
        breakpointService.updateBreakpoint(bp.id, { enabled: true });
      }
    });
  };

  const handleDisableAll = () => {
    breakpoints.forEach(bp => {
      if (bp.enabled) {
        breakpointService.updateBreakpoint(bp.id, { enabled: false });
      }
    });
  };

  const handleGoToBreakpoint = async (breakpoint: Breakpoint) => {
    try {
      const editor = await editorService.openFile(breakpoint.filePath);
      if (editor) {
        editorService.revealLine(editor.id, breakpoint.line);
      }
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  };

  const handleEditBreakpoint = (breakpoint: Breakpoint) => {
    setEditingBreakpoint(breakpoint.id);
    setConditionInput(breakpoint.condition || '');
    setHitCountInput(breakpoint.hitCondition || '');
    setLogMessageInput(breakpoint.logMessage || '');
  };

  const handleSaveBreakpoint = () => {
    if (editingBreakpoint) {
      breakpointService.updateBreakpoint(editingBreakpoint, {
        condition: conditionInput || undefined,
        hitCondition: hitCountInput || undefined,
        logMessage: logMessageInput || undefined
      });
      setEditingBreakpoint(null);
      setConditionInput('');
      setHitCountInput('');
      setLogMessageInput('');
    }
  };

  const handleCancelEdit = () => {
    setEditingBreakpoint(null);
    setConditionInput('');
    setHitCountInput('');
    setLogMessageInput('');
  };

  const getBreakpointIcon = (breakpoint: Breakpoint) => {
    if (!breakpoint.enabled) return '⚪';
    if (breakpoint.logMessage) return '💬';
    if (breakpoint.condition || breakpoint.hitCondition) return '❓';
    return '🔴';
  };

  const getBreakpointLabel = (breakpoint: Breakpoint) => {
    const fileName = breakpoint.filePath.split('/').pop();
    return `${fileName}:${breakpoint.line}`;
  };

  const groupedBreakpoints = () => {
    if (groupBy === 'none') {
      return { 'All Breakpoints': breakpoints };
    }

    const groups: Record<string, Breakpoint[]> = {};
    breakpoints.forEach(bp => {
      const fileName = bp.filePath.split('/').pop() || 'unknown';
      if (!groups[fileName]) {
        groups[fileName] = [];
      }
      groups[fileName].push(bp);
    });
    return groups;
  };

  const filteredBreakpoints = showDisabled 
    ? breakpoints 
    : breakpoints.filter(bp => bp.enabled);

  const groups = groupedBreakpoints();

  return (
    <div className="debug-breakpoints-panel">
      <div className="panel-header">
        <h3>Breakpoints ({filteredBreakpoints.length})</h3>
        <div className="header-actions">
          <button
            className="action-button"
            onClick={handleEnableAll}
            title="Enable all"
            disabled={breakpoints.length === 0}
          >
            ✓
          </button>
          <button
            className="action-button"
            onClick={handleDisableAll}
            title="Disable all"
            disabled={breakpoints.length === 0}
          >
            ⊘
          </button>
          <button
            className="action-button"
            onClick={handleRemoveAll}
            title="Remove all"
            disabled={breakpoints.length === 0}
          >
            🗑
          </button>
        </div>
      </div>

      <div className="panel-toolbar">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={showDisabled}
            onChange={(e) => setShowDisabled(e.target.checked)}
          />
          Show disabled
        </label>
        <select
          className="group-select"
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value as 'file' | 'none')}
        >
          <option value="file">Group by file</option>
          <option value="none">No grouping</option>
        </select>
      </div>

      <div className="breakpoints-list">
        {Object.entries(groups).map(([groupName, groupBreakpoints]) => {
          const visibleBreakpoints = showDisabled 
            ? groupBreakpoints 
            : groupBreakpoints.filter(bp => bp.enabled);

          if (visibleBreakpoints.length === 0) return null;

          return (
            <div key={groupName} className="breakpoint-group">
              {groupBy === 'file' && (
                <div className="group-header">{groupName}</div>
              )}
              {visibleBreakpoints.map(breakpoint => (
                <div key={breakpoint.id} className="breakpoint-item">
                  {editingBreakpoint === breakpoint.id ? (
                    <div className="breakpoint-edit">
                      <div className="edit-field">
                        <label>Condition:</label>
                        <input
                          type="text"
                          value={conditionInput}
                          onChange={(e) => setConditionInput(e.target.value)}
                          placeholder="e.g., x > 10"
                        />
                      </div>
                      <div className="edit-field">
                        <label>Hit Count:</label>
                        <input
                          type="text"
                          value={hitCountInput}
                          onChange={(e) => setHitCountInput(e.target.value)}
                          placeholder="e.g., > 5"
                        />
                      </div>
                      <div className="edit-field">
                        <label>Log Message:</label>
                        <input
                          type="text"
                          value={logMessageInput}
                          onChange={(e) => setLogMessageInput(e.target.value)}
                          placeholder="e.g., Value is {x}"
                        />
                      </div>
                      <div className="edit-actions">
                        <button onClick={handleSaveBreakpoint}>Save</button>
                        <button onClick={handleCancelEdit}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div
                        className="breakpoint-main"
                        onClick={() => handleGoToBreakpoint(breakpoint)}
                      >
                        <input
                          type="checkbox"
                          checked={breakpoint.enabled}
                          onChange={() => handleToggleBreakpoint(breakpoint.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="breakpoint-icon">
                          {getBreakpointIcon(breakpoint)}
                        </span>
                        <div className="breakpoint-info">
                          <div className="breakpoint-label">
                            {getBreakpointLabel(breakpoint)}
                          </div>
                          {(breakpoint.condition || breakpoint.hitCondition || breakpoint.logMessage) && (
                            <div className="breakpoint-details">
                              {breakpoint.condition && (
                                <span className="detail">Condition: {breakpoint.condition}</span>
                              )}
                              {breakpoint.hitCondition && (
                                <span className="detail">Hit count: {breakpoint.hitCondition}</span>
                              )}
                              {breakpoint.logMessage && (
                                <span className="detail">Log: {breakpoint.logMessage}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="breakpoint-actions">
                        <button
                          className="action-button"
                          onClick={() => handleEditBreakpoint(breakpoint)}
                          title="Edit breakpoint"
                        >
                          ✎
                        </button>
                        <button
                          className="action-button"
                          onClick={() => handleRemoveBreakpoint(breakpoint.id)}
                          title="Remove breakpoint"
                        >
                          ✗
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          );
        })}

        {filteredBreakpoints.length === 0 && (
          <div className="no-breakpoints">
            <p>No breakpoints</p>
            <p className="hint">Click in the editor gutter to add breakpoints</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .debug-breakpoints-panel {
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
          cursor: pointer;
          font-size: 14px;
          border-radius: 2px;
        }

        .action-button:hover:not(:disabled) {
          background: var(--vscode-toolbar-hoverBackground);
        }

        .action-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .panel-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          border-bottom: 1px solid var(--vscode-panel-border);
          font-size: 12px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
        }

        .checkbox-label input {
          cursor: pointer;
        }

        .group-select {
          padding: 4px 8px;
          background: var(--vscode-dropdown-background);
          color: var(--vscode-dropdown-foreground);
          border: 1px solid var(--vscode-dropdown-border);
          outline: none;
          font-size: 12px;
        }

        .breakpoints-list {
          flex: 1;
          overflow-y: auto;
        }

        .breakpoint-group {
          border-bottom: 1px solid var(--vscode-panel-border);
        }

        .group-header {
          padding: 8px 12px;
          background: var(--vscode-sideBarSectionHeader-background);
          font-size: 12px;
          font-weight: 600;
        }

        .breakpoint-item {
          display: flex;
          align-items: center;
          padding: 6px 12px;
          cursor: pointer;
          font-size: 13px;
        }

        .breakpoint-item:hover {
          background: var(--vscode-list-hoverBackground);
        }

        .breakpoint-item:hover .breakpoint-actions {
          display: flex;
        }

        .breakpoint-main {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
        }

        .breakpoint-main input[type="checkbox"] {
          cursor: pointer;
        }

        .breakpoint-icon {
          font-size: 14px;
        }

        .breakpoint-info {
          flex: 1;
          min-width: 0;
        }

        .breakpoint-label {
          font-family: var(--vscode-editor-font-family, 'Consolas, monospace');
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .breakpoint-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
          margin-top: 4px;
        }

        .detail {
          font-size: 11px;
          color: var(--vscode-descriptionForeground);
        }

        .breakpoint-actions {
          display: none;
          gap: 4px;
        }

        .breakpoint-edit {
          flex: 1;
          padding: 8px;
          background: var(--vscode-input-background);
          border: 1px solid var(--vscode-input-border);
          border-radius: 2px;
        }

        .edit-field {
          margin-bottom: 8px;
        }

        .edit-field label {
          display: block;
          font-size: 11px;
          margin-bottom: 4px;
          color: var(--vscode-descriptionForeground);
        }

        .edit-field input {
          width: 100%;
          padding: 4px 8px;
          background: var(--vscode-input-background);
          color: var(--vscode-input-foreground);
          border: 1px solid var(--vscode-input-border);
          outline: none;
          font-size: 12px;
        }

        .edit-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }

        .edit-actions button {
          padding: 4px 12px;
          background: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          cursor: pointer;
          font-size: 12px;
          border-radius: 2px;
        }

        .edit-actions button:hover {
          background: var(--vscode-button-hoverBackground);
        }

        .no-breakpoints {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 200px;
          gap: 8px;
          color: var(--vscode-descriptionForeground);
        }

        .no-breakpoints p {
          margin: 0;
        }

        .hint {
          font-size: 12px;
        }
      `}</style>
    </div>
  );
};
