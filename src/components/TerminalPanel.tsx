import React, { useState, useEffect, useRef } from 'react';
import { TerminalService, Terminal } from '../services/TerminalService';
import { EventBus } from '../services/EventBus';

export const TerminalPanel: React.FC = () => {
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);
  const terminalRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const terminalService = TerminalService.getInstance();

  useEffect(() => {
    updateTerminals();

    const unsubscribe1 = EventBus.getInstance().subscribe('terminal:created', updateTerminals);
    const unsubscribe2 = EventBus.getInstance().subscribe('terminal:closed', updateTerminals);
    const unsubscribe3 = EventBus.getInstance().subscribe('terminal:output', handleTerminalOutput);
    const unsubscribe4 = EventBus.getInstance().subscribe('terminal:new', handleNewTerminal);
    const unsubscribe5 = EventBus.getInstance().subscribe('terminal:split', handleSplitTerminal);
    const unsubscribe6 = EventBus.getInstance().subscribe('terminal:kill', handleKillTerminal);
    const unsubscribe7 = EventBus.getInstance().subscribe('terminal:clear', handleClearTerminal);

    return () => {
      unsubscribe1();
      unsubscribe2();
      unsubscribe3();
      unsubscribe4();
      unsubscribe5();
      unsubscribe6();
      unsubscribe7();
    };
  }, []);

  const updateTerminals = () => {
    const allTerminals = terminalService.getTerminals();
    setTerminals(allTerminals);
    
    if (allTerminals.length > 0 && !activeTerminalId) {
      setActiveTerminalId(allTerminals[0].id);
    }
  };

  const handleTerminalOutput = (data: { terminalId: string; output: string }) => {
    const terminalElement = terminalRefs.current.get(data.terminalId);
    if (terminalElement) {
      const outputLine = document.createElement('div');
      outputLine.className = 'terminal-line';
      outputLine.textContent = data.output;
      terminalElement.appendChild(outputLine);
      terminalElement.scrollTop = terminalElement.scrollHeight;
    }
  };

  const handleNewTerminal = () => {
    const newTerminal = terminalService.createTerminal({
      name: `Terminal ${terminals.length + 1}`,
      cwd: process.cwd()
    });
    setActiveTerminalId(newTerminal.id);
  };

  const handleSplitTerminal = () => {
    if (activeTerminalId) {
      const activeTerminal = terminals.find(t => t.id === activeTerminalId);
      if (activeTerminal) {
        const newTerminal = terminalService.createTerminal({
          name: `${activeTerminal.name} (Split)`,
          cwd: activeTerminal.cwd
        });
        setActiveTerminalId(newTerminal.id);
      }
    }
  };

  const handleKillTerminal = () => {
    if (activeTerminalId) {
      terminalService.closeTerminal(activeTerminalId);
      const remainingTerminals = terminals.filter(t => t.id !== activeTerminalId);
      setActiveTerminalId(remainingTerminals.length > 0 ? remainingTerminals[0].id : null);
    }
  };

  const handleClearTerminal = () => {
    if (activeTerminalId) {
      const terminalElement = terminalRefs.current.get(activeTerminalId);
      if (terminalElement) {
        terminalElement.innerHTML = '';
      }
    }
  };

  const handleTerminalClick = (terminalId: string) => {
    setActiveTerminalId(terminalId);
  };

  const handleTerminalClose = (e: React.MouseEvent, terminalId: string) => {
    e.stopPropagation();
    terminalService.closeTerminal(terminalId);
    
    if (terminalId === activeTerminalId) {
      const remainingTerminals = terminals.filter(t => t.id !== terminalId);
      setActiveTerminalId(remainingTerminals.length > 0 ? remainingTerminals[0].id : null);
    }
  };

  const handleCommandInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && activeTerminalId) {
      const input = e.currentTarget;
      const command = input.value;
      
      if (command.trim()) {
        terminalService.sendCommand(activeTerminalId, command);
        
        const terminalElement = terminalRefs.current.get(activeTerminalId);
        if (terminalElement) {
          const commandLine = document.createElement('div');
          commandLine.className = 'terminal-line command';
          commandLine.textContent = `$ ${command}`;
          terminalElement.appendChild(commandLine);
          terminalElement.scrollTop = terminalElement.scrollHeight;
        }
        
        input.value = '';
      }
    }
  };

  const handleNewTerminalClick = () => {
    handleNewTerminal();
  };

  const handleSplitTerminalClick = () => {
    handleSplitTerminal();
  };

  const handleKillTerminalClick = () => {
    handleKillTerminal();
  };

  return (
    <div className="terminal-panel">
      <div className="terminal-header">
        <div className="terminal-tabs">
          {terminals.map(terminal => (
            <div
              key={terminal.id}
              className={`terminal-tab ${terminal.id === activeTerminalId ? 'active' : ''}`}
              onClick={() => handleTerminalClick(terminal.id)}
            >
              <span className="terminal-icon">$</span>
              <span className="terminal-name">{terminal.name}</span>
              <button
                className="close-button"
                onClick={(e) => handleTerminalClose(e, terminal.id)}
                aria-label="Close terminal"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="terminal-actions">
          <button
            className="action-button"
            onClick={handleNewTerminalClick}
            title="New Terminal"
          >
            +
          </button>
          <button
            className="action-button"
            onClick={handleSplitTerminalClick}
            title="Split Terminal"
            disabled={!activeTerminalId}
          >
            ⊞
          </button>
          <button
            className="action-button"
            onClick={handleKillTerminalClick}
            title="Kill Terminal"
            disabled={!activeTerminalId}
          >
            🗑
          </button>
        </div>
      </div>

      <div className="terminal-content">
        {terminals.map(terminal => (
          <div
            key={terminal.id}
            className={`terminal-instance ${terminal.id === activeTerminalId ? 'active' : ''}`}
          >
            <div
              className="terminal-output"
              ref={(el) => {
                if (el) terminalRefs.current.set(terminal.id, el);
              }}
            />
            <div className="terminal-input-container">
              <span className="terminal-prompt">$</span>
              <input
                type="text"
                className="terminal-input"
                placeholder="Type a command..."
                onKeyDown={handleCommandInput}
                disabled={terminal.id !== activeTerminalId}
              />
            </div>
          </div>
        ))}
        {terminals.length === 0 && (
          <div className="no-terminals">
            <p>No terminals open</p>
            <button onClick={handleNewTerminalClick}>Create New Terminal</button>
          </div>
        )}
      </div>

      <style jsx>{`
        .terminal-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--vscode-terminal-background);
          color: var(--vscode-terminal-foreground);
        }

        .terminal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--vscode-panel-background);
          border-bottom: 1px solid var(--vscode-panel-border);
          height: 35px;
        }

        .terminal-tabs {
          display: flex;
          flex: 1;
          overflow-x: auto;
        }

        .terminal-tabs::-webkit-scrollbar {
          height: 0;
        }

        .terminal-tab {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 0 12px;
          min-width: 120px;
          background: var(--vscode-tab-inactiveBackground);
          color: var(--vscode-tab-inactiveForeground);
          border-right: 1px solid var(--vscode-tab-border);
          cursor: pointer;
          user-select: none;
          height: 100%;
        }

        .terminal-tab:hover {
          background: var(--vscode-tab-hoverBackground);
        }

        .terminal-tab.active {
          background: var(--vscode-tab-activeBackground);
          color: var(--vscode-tab-activeForeground);
        }

        .terminal-icon {
          font-size: 14px;
        }

        .terminal-name {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
        }

        .close-button {
          display: none;
          background: none;
          border: none;
          color: inherit;
          font-size: 18px;
          line-height: 1;
          padding: 0;
          width: 20px;
          height: 20px;
          cursor: pointer;
          border-radius: 3px;
        }

        .terminal-tab:hover .close-button {
          display: block;
        }

        .close-button:hover {
          background: var(--vscode-toolbar-hoverBackground);
        }

        .terminal-actions {
          display: flex;
          gap: 4px;
          padding: 0 8px;
        }

        .action-button {
          background: none;
          border: none;
          color: var(--vscode-foreground);
          font-size: 16px;
          padding: 4px 8px;
          cursor: pointer;
          border-radius: 3px;
        }

        .action-button:hover:not(:disabled) {
          background: var(--vscode-toolbar-hoverBackground);
        }

        .action-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .terminal-content {
          flex: 1;
          position: relative;
          overflow: hidden;
        }

        .terminal-instance {
          display: none;
          flex-direction: column;
          height: 100%;
        }

        .terminal-instance.active {
          display: flex;
        }

        .terminal-output {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
          font-family: var(--vscode-editor-font-family, 'Consolas, monospace');
          font-size: var(--vscode-editor-font-size, 14px);
          line-height: 1.5;
        }

        .terminal-line {
          margin-bottom: 2px;
          white-space: pre-wrap;
          word-break: break-all;
        }

        .terminal-line.command {
          color: var(--vscode-terminal-ansiGreen);
          font-weight: 500;
        }

        .terminal-input-container {
          display: flex;
          align-items: center;
          padding: 8px;
          border-top: 1px solid var(--vscode-panel-border);
          background: var(--vscode-terminal-background);
        }

        .terminal-prompt {
          margin-right: 8px;
          color: var(--vscode-terminal-ansiGreen);
          font-family: var(--vscode-editor-font-family, 'Consolas, monospace');
          font-weight: 500;
        }

        .terminal-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: var(--vscode-terminal-foreground);
          font-family: var(--vscode-editor-font-family, 'Consolas, monospace');
          font-size: var(--vscode-editor-font-size, 14px);
        }

        .no-terminals {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 16px;
        }

        .no-terminals p {
          color: var(--vscode-descriptionForeground);
          margin: 0;
        }

        .no-terminals button {
          padding: 8px 16px;
          background: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          border-radius: 2px;
          cursor: pointer;
          font-size: 13px;
        }

        .no-terminals button:hover {
          background: var(--vscode-button-hoverBackground);
        }
      `}</style>
    </div>
  );
};
