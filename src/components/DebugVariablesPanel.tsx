import React, { useState, useEffect } from 'react';
import { DebugService, Variable, Scope } from '../services/DebugService';
import { EventBus } from '../services/EventBus';

interface VariableNode extends Variable {
  expanded?: boolean;
  children?: VariableNode[];
}

export const DebugVariablesPanel: React.FC = () => {
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [watchExpressions, setWatchExpressions] = useState<string[]>([]);
  const [newWatchExpression, setNewWatchExpression] = useState('');
  const [editingVariable, setEditingVariable] = useState<{ path: string; value: string } | null>(null);
  const debugService = DebugService.getInstance();

  useEffect(() => {
    const unsubscribe1 = EventBus.getInstance().subscribe('debug:paused', loadVariables);
    const unsubscribe2 = EventBus.getInstance().subscribe('debug:continued', clearVariables);
    const unsubscribe3 = EventBus.getInstance().subscribe('debug:stopped', clearVariables);
    const unsubscribe4 = EventBus.getInstance().subscribe('debug:stackFrameChanged', loadVariables);

    return () => {
      unsubscribe1();
      unsubscribe2();
      unsubscribe3();
      unsubscribe4();
    };
  }, []);

  const loadVariables = async () => {
    const session = debugService.getActiveSession();
    if (!session) return;

    try {
      const newScopes = await debugService.getScopes(session.id);
      setScopes(newScopes);
    } catch (error) {
      console.error('Failed to load variables:', error);
    }
  };

  const clearVariables = () => {
    setScopes([]);
    setExpandedNodes(new Set());
  };

  const toggleExpand = async (path: string, variable: Variable) => {
    const newExpanded = new Set(expandedNodes);
    
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
      
      if (variable.variablesReference && variable.variablesReference > 0) {
        const session = debugService.getActiveSession();
        if (session) {
          try {
            const children = await debugService.getVariables(session.id, variable.variablesReference);
            updateVariableChildren(path, children);
          } catch (error) {
            console.error('Failed to load child variables:', error);
          }
        }
      }
    }
    
    setExpandedNodes(newExpanded);
  };

  const updateVariableChildren = (path: string, children: Variable[]) => {
    setScopes(prevScopes => {
      return prevScopes.map(scope => ({
        ...scope,
        variables: updateVariablesRecursive(scope.variables, path, children)
      }));
    });
  };

  const updateVariablesRecursive = (variables: VariableNode[], targetPath: string, children: Variable[]): VariableNode[] => {
    return variables.map(variable => {
      const currentPath = `${variable.name}`;
      
      if (currentPath === targetPath) {
        return {
          ...variable,
          children: children as VariableNode[]
        };
      }
      
      if (variable.children) {
        return {
          ...variable,
          children: updateVariablesRecursive(variable.children, targetPath, children)
        };
      }
      
      return variable;
    });
  };

  const handleAddWatch = () => {
    if (newWatchExpression.trim()) {
      setWatchExpressions([...watchExpressions, newWatchExpression.trim()]);
      setNewWatchExpression('');
    }
  };

  const handleRemoveWatch = (index: number) => {
    setWatchExpressions(watchExpressions.filter((_, i) => i !== index));
  };

  const handleEditVariable = (path: string, currentValue: string) => {
    setEditingVariable({ path, value: currentValue });
  };

  const handleSaveVariable = async () => {
    if (!editingVariable) return;

    const session = debugService.getActiveSession();
    if (session) {
      try {
        await debugService.setVariable(session.id, editingVariable.path, editingVariable.value);
        await loadVariables();
        setEditingVariable(null);
      } catch (error) {
        console.error('Failed to set variable:', error);
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingVariable(null);
  };

  const renderVariable = (variable: VariableNode, path: string, depth: number = 0) => {
    const fullPath = path ? `${path}.${variable.name}` : variable.name;
    const isExpanded = expandedNodes.has(fullPath);
    const hasChildren = variable.variablesReference && variable.variablesReference > 0;
    const isEditing = editingVariable?.path === fullPath;

    return (
      <div key={fullPath} className="variable-item" style={{ paddingLeft: `${depth * 16}px` }}>
        <div className="variable-row">
          {hasChildren && (
            <button
              className="expand-button"
              onClick={() => toggleExpand(fullPath, variable)}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
          {!hasChildren && <span className="expand-spacer" />}
          
          <span className="variable-name">{variable.name}:</span>
          
          {isEditing ? (
            <div className="variable-edit">
              <input
                type="text"
                value={editingVariable.value}
                onChange={(e) => setEditingVariable({ ...editingVariable, value: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveVariable();
                  if (e.key === 'Escape') handleCancelEdit();
                }}
                autoFocus
              />
              <button onClick={handleSaveVariable}>✓</button>
              <button onClick={handleCancelEdit}>✗</button>
            </div>
          ) : (
            <>
              <span className={`variable-value ${variable.type}`} title={variable.value}>
                {variable.value}
              </span>
              <span className="variable-type">{variable.type}</span>
              <button
                className="edit-button"
                onClick={() => handleEditVariable(fullPath, variable.value)}
                title="Edit value"
              >
                ✎
              </button>
            </>
          )}
        </div>
        
        {isExpanded && variable.children && (
          <div className="variable-children">
            {variable.children.map(child => renderVariable(child, fullPath, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="debug-variables-panel">
      <div className="panel-section">
        <div className="section-header">
          <h4>Watch</h4>
        </div>
        <div className="watch-list">
          {watchExpressions.map((expr, index) => (
            <div key={index} className="watch-item">
              <span className="watch-expression">{expr}</span>
              <button
                className="remove-button"
                onClick={() => handleRemoveWatch(index)}
                title="Remove watch"
              >
                ✗
              </button>
            </div>
          ))}
          <div className="watch-input">
            <input
              type="text"
              placeholder="Add watch expression..."
              value={newWatchExpression}
              onChange={(e) => setNewWatchExpression(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddWatch();
              }}
            />
            <button onClick={handleAddWatch}>+</button>
          </div>
        </div>
      </div>

      {scopes.map(scope => (
        <div key={scope.name} className="panel-section">
          <div className="section-header">
            <h4>{scope.name}</h4>
          </div>
          <div className="variables-list">
            {scope.variables.map(variable => renderVariable(variable as VariableNode, '', 0))}
          </div>
        </div>
      ))}

      {scopes.length === 0 && (
        <div className="no-variables">
          <p>No variables available</p>
          <p className="hint">Start debugging to inspect variables</p>
        </div>
      )}

      <style jsx>{`
        .debug-variables-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--vscode-sideBar-background);
          color: var(--vscode-sideBar-foreground);
          overflow-y: auto;
        }

        .panel-section {
          border-bottom: 1px solid var(--vscode-panel-border);
        }

        .section-header {
          padding: 8px 12px;
          background: var(--vscode-sideBarSectionHeader-background);
          border-bottom: 1px solid var(--vscode-panel-border);
        }

        .section-header h4 {
          margin: 0;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .watch-list {
          padding: 4px 0;
        }

        .watch-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 12px;
        }

        .watch-item:hover {
          background: var(--vscode-list-hoverBackground);
        }

        .watch-expression {
          flex: 1;
          font-size: 13px;
          font-family: var(--vscode-editor-font-family, 'Consolas, monospace');
        }

        .remove-button {
          display: none;
          background: none;
          border: none;
          color: var(--vscode-foreground);
          cursor: pointer;
          padding: 2px 6px;
          font-size: 12px;
        }

        .watch-item:hover .remove-button {
          display: block;
        }

        .watch-input {
          display: flex;
          gap: 4px;
          padding: 4px 12px;
        }

        .watch-input input {
          flex: 1;
          padding: 4px 8px;
          background: var(--vscode-input-background);
          color: var(--vscode-input-foreground);
          border: 1px solid var(--vscode-input-border);
          outline: none;
          font-size: 12px;
        }

        .watch-input button {
          padding: 4px 8px;
          background: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          cursor: pointer;
          font-size: 12px;
        }

        .variables-list {
          padding: 4px 0;
        }

        .variable-item {
          font-size: 13px;
          font-family: var(--vscode-editor-font-family, 'Consolas, monospace');
        }

        .variable-row {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 2px 12px;
          min-height: 22px;
        }

        .variable-row:hover {
          background: var(--vscode-list-hoverBackground);
        }

        .variable-row:hover .edit-button {
          display: block;
        }

        .expand-button {
          background: none;
          border: none;
          color: var(--vscode-foreground);
          cursor: pointer;
          padding: 0;
          width: 16px;
          font-size: 10px;
        }

        .expand-spacer {
          width: 16px;
        }

        .variable-name {
          color: var(--vscode-debugTokenExpression-name);
          font-weight: 500;
        }

        .variable-value {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .variable-value.string {
          color: var(--vscode-debugTokenExpression-string);
        }

        .variable-value.number {
          color: var(--vscode-debugTokenExpression-number);
        }

        .variable-value.boolean {
          color: var(--vscode-debugTokenExpression-boolean);
        }

        .variable-value.object {
          color: var(--vscode-debugTokenExpression-value);
        }

        .variable-type {
          font-size: 11px;
          color: var(--vscode-descriptionForeground);
        }

        .edit-button {
          display: none;
          background: none;
          border: none;
          color: var(--vscode-foreground);
          cursor: pointer;
          padding: 2px 6px;
          font-size: 12px;
        }

        .variable-edit {
          display: flex;
          gap: 4px;
          flex: 1;
        }

        .variable-edit input {
          flex: 1;
          padding: 2px 6px;
          background: var(--vscode-input-background);
          color: var(--vscode-input-foreground);
          border: 1px solid var(--vscode-input-border);
          outline: none;
          font-size: 12px;
          font-family: inherit;
        }

        .variable-edit button {
          padding: 2px 6px;
          background: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          cursor: pointer;
          font-size: 12px;
        }

        .variable-children {
          border-left: 1px solid var(--vscode-panel-border);
          margin-left: 8px;
        }

        .no-variables {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 200px;
          gap: 8px;
          color: var(--vscode-descriptionForeground);
        }

        .no-variables p {
          margin: 0;
        }

        .hint {
          font-size: 12px;
        }
      `}</style>
    </div>
  );
};
