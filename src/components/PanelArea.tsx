import React, { useState, useEffect } from 'react';
import { EventBus } from '../services/EventBus';
import { TerminalPanel } from './TerminalPanel';
import { OutputPanel } from './OutputPanel';
import { ProblemsPanel } from './ProblemsPanel';
import { DebugConsole } from './DebugConsole';

type PanelView = 'terminal' | 'output' | 'problems' | 'debug';

export const PanelArea: React.FC = () => {
  const [activePanel, setActivePanel] = useState<PanelView>('terminal');
  const [panelHeight, setPanelHeight] = useState(300);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    const unsubscribe1 = EventBus.getInstance().subscribe('panel:showTerminal', () => {
      setActivePanel('terminal');
    });

    const unsubscribe2 = EventBus.getInstance().subscribe('panel:showOutput', () => {
      setActivePanel('output');
    });

    const unsubscribe3 = EventBus.getInstance().subscribe('panel:showProblems', () => {
      setActivePanel('problems');
    });

    const unsubscribe4 = EventBus.getInstance().subscribe('panel:showDebug', () => {
      setActivePanel('debug');
    });

    return () => {
      unsubscribe1();
      unsubscribe2();
      unsubscribe3();
      unsubscribe4();
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        const newHeight = window.innerHeight - e.clientY - 22; // 22px for status bar
        setPanelHeight(Math.max(100, Math.min(newHeight, window.innerHeight - 200)));
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const renderPanel = () => {
    switch (activePanel) {
      case 'terminal':
        return <TerminalPanel />;
      case 'output':
        return <OutputPanel />;
      case 'problems':
        return <ProblemsPanel />;
      case 'debug':
        return <DebugConsole />;
      default:
        return <TerminalPanel />;
    }
  };

  return (
    <div className="panel-area" style={{ height: panelHeight }}>
      <div className="panel-resize-handle" onMouseDown={handleMouseDown} />
      
      <div className="panel-header">
        <div className="panel-tabs">
          <button
            className={`panel-tab ${activePanel === 'terminal' ? 'active' : ''}`}
            onClick={() => setActivePanel('terminal')}
          >
            Terminal
          </button>
          <button
            className={`panel-tab ${activePanel === 'output' ? 'active' : ''}`}
            onClick={() => setActivePanel('output')}
          >
            Output
          </button>
          <button
            className={`panel-tab ${activePanel === 'problems' ? 'active' : ''}`}
            onClick={() => setActivePanel('problems')}
          >
            Problems
          </button>
          <button
            className={`panel-tab ${activePanel === 'debug' ? 'active' : ''}`}
            onClick={() => setActivePanel('debug')}
          >
            Debug Console
          </button>
        </div>
        <div className="panel-actions">
          <button
            className="panel-action"
            onClick={() => EventBus.getInstance().emit('view:togglePanel', {})}
            title="Close Panel"
          >
            ×
          </button>
        </div>
      </div>

      <div className="panel-content">
        {renderPanel()}
      </div>

      <style jsx>{`
        .panel-area {
          border-top: 1px solid var(--vscode-panel-border);
          background: var(--vscode-panel-background);
          display: flex;
          flex-direction: column;
          position: relative;
        }

        .panel-resize-handle {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          cursor: ns-resize;
          z-index: 10;
        }

        .panel-resize-handle:hover {
          background: var(--vscode-focusBorder);
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          height: 35px;
          background: var(--vscode-panel-background);
          border-bottom: 1px solid var(--vscode-panel-border);
        }

        .panel-tabs {
          display: flex;
          height: 100%;
        }

        .panel-tab {
          padding: 0 16px;
          background: none;
          border: none;
          color: var(--vscode-tab-inactiveForeground);
          cursor: pointer;
          font-size: 13px;
          border-bottom: 2px solid transparent;
          transition: color 0.1s, border-color 0.1s;
        }

        .panel-tab:hover {
          color: var(--vscode-tab-activeForeground);
        }

        .panel-tab.active {
          color: var(--vscode-tab-activeForeground);
          border-bottom-color: var(--vscode-tab-activeBorder);
        }

        .panel-actions {
          display: flex;
          padding: 0 8px;
        }

        .panel-action {
          width: 28px;
          height: 28px;
          background: none;
          border: none;
          color: var(--vscode-foreground);
          cursor: pointer;
          font-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 2px;
        }

        .panel-action:hover {
          background: var(--vscode-toolbar-hoverBackground);
        }

        .panel-content {
          flex: 1;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};
