import React, { useState, useEffect, useRef } from 'react';
import { DebugService } from '../services/DebugService';
import { EventBus } from '../services/EventBus';

interface ConsoleMessage {
  id: string;
  type: 'log' | 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: Date;
  source?: string;
}

export const DebugConsole: React.FC = () => {
  const [messages, setMessages] = useState<ConsoleMessage[]>([]);
  const [filter, setFilter] = useState<'all' | 'log' | 'info' | 'warn' | 'error' | 'debug'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAutoscroll, setIsAutoscroll] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const consoleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe1 = EventBus.getInstance().subscribe('debug:console', handleConsoleMessage);
    const unsubscribe2 = EventBus.getInstance().subscribe('debug:started', handleDebugStarted);
    const unsubscribe3 = EventBus.getInstance().subscribe('debug:stopped', handleDebugStopped);

    return () => {
      unsubscribe1();
      unsubscribe2();
      unsubscribe3();
    };
  }, []);

  useEffect(() => {
    if (isAutoscroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isAutoscroll]);

  const handleConsoleMessage = (data: { type: string; message: string; source?: string }) => {
    const newMessage: ConsoleMessage = {
      id: `${Date.now()}-${Math.random()}`,
      type: data.type as ConsoleMessage['type'],
      message: data.message,
      timestamp: new Date(),
      source: data.source
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleDebugStarted = () => {
    const message: ConsoleMessage = {
      id: `${Date.now()}-start`,
      type: 'info',
      message: 'Debug session started',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, message]);
  };

  const handleDebugStopped = () => {
    const message: ConsoleMessage = {
      id: `${Date.now()}-stop`,
      type: 'info',
      message: 'Debug session stopped',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, message]);
  };

  const handleClear = () => {
    setMessages([]);
  };

  const handleEvaluate = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const input = e.currentTarget;
      const expression = input.value.trim();
      
      if (expression) {
        const debugService = DebugService.getInstance();
        const session = debugService.getActiveSession();
        
        if (session) {
          debugService.evaluate(session.id, expression).then(result => {
            const message: ConsoleMessage = {
              id: `${Date.now()}-eval`,
              type: 'log',
              message: `> ${expression}\n${result}`,
              timestamp: new Date()
            };
            setMessages(prev => [...prev, message]);
          }).catch(error => {
            const message: ConsoleMessage = {
              id: `${Date.now()}-eval-error`,
              type: 'error',
              message: `> ${expression}\nError: ${error.message}`,
              timestamp: new Date()
            };
            setMessages(prev => [...prev, message]);
          });
        } else {
          const message: ConsoleMessage = {
            id: `${Date.now()}-no-session`,
            type: 'warn',
            message: 'No active debug session',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, message]);
        }
        
        input.value = '';
      }
    }
  };

  const filteredMessages = messages.filter(msg => {
    const matchesFilter = filter === 'all' || msg.type === filter;
    const matchesSearch = searchQuery === '' || 
                         msg.message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getMessageIcon = (type: ConsoleMessage['type']) => {
    switch (type) {
      case 'error': return '❌';
      case 'warn': return '⚠️';
      case 'info': return 'ℹ️';
      case 'debug': return '🐛';
      default: return '📝';
    }
  };

  const getMessageClass = (type: ConsoleMessage['type']) => {
    return `message message-${type}`;
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  return (
    <div className="debug-console">
      <div className="console-toolbar">
        <div className="filter-buttons">
          <button
            className={`filter-button ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={`filter-button ${filter === 'log' ? 'active' : ''}`}
            onClick={() => setFilter('log')}
          >
            Log
          </button>
          <button
            className={`filter-button ${filter === 'info' ? 'active' : ''}`}
            onClick={() => setFilter('info')}
          >
            Info
          </button>
          <button
            className={`filter-button ${filter === 'warn' ? 'active' : ''}`}
            onClick={() => setFilter('warn')}
          >
            Warn
          </button>
          <button
            className={`filter-button ${filter === 'error' ? 'active' : ''}`}
            onClick={() => setFilter('error')}
          >
            Error
          </button>
        </div>
        <div className="toolbar-actions">
          <input
            type="text"
            className="search-input"
            placeholder="Filter..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button
            className={`action-button ${isAutoscroll ? 'active' : ''}`}
            onClick={() => setIsAutoscroll(!isAutoscroll)}
            title="Toggle autoscroll"
          >
            ⬇
          </button>
          <button
            className="action-button"
            onClick={handleClear}
            title="Clear console"
          >
            🗑
          </button>
        </div>
      </div>

      <div className="console-messages" ref={consoleRef}>
        {filteredMessages.map(msg => (
          <div key={msg.id} className={getMessageClass(msg.type)}>
            <span className="message-icon">{getMessageIcon(msg.type)}</span>
            <span className="message-timestamp">{formatTimestamp(msg.timestamp)}</span>
            <span className="message-content">{msg.message}</span>
            {msg.source && <span className="message-source">{msg.source}</span>}
          </div>
        ))}
        <div ref={messagesEndRef} />
        {filteredMessages.length === 0 && (
          <div className="no-messages">No messages to display</div>
        )}
      </div>

      <div className="console-input-container">
        <span className="input-prompt">&gt;</span>
        <input
          type="text"
          className="console-input"
          placeholder="Evaluate expression..."
          onKeyDown={handleEvaluate}
        />
      </div>

      <style jsx>{`
        .debug-console {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--vscode-panel-background);
          color: var(--vscode-panel-foreground);
        }

        .console-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 8px;
          border-bottom: 1px solid var(--vscode-panel-border);
          gap: 8px;
        }

        .filter-buttons {
          display: flex;
          gap: 4px;
        }

        .filter-button {
          padding: 4px 8px;
          background: none;
          border: none;
          color: var(--vscode-foreground);
          font-size: 12px;
          cursor: pointer;
          border-radius: 2px;
        }

        .filter-button:hover {
          background: var(--vscode-toolbar-hoverBackground);
        }

        .filter-button.active {
          background: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
        }

        .toolbar-actions {
          display: flex;
          gap: 4px;
          align-items: center;
        }

        .search-input {
          padding: 4px 8px;
          background: var(--vscode-input-background);
          color: var(--vscode-input-foreground);
          border: 1px solid var(--vscode-input-border);
          outline: none;
          font-size: 12px;
          width: 150px;
        }

        .search-input:focus {
          border-color: var(--vscode-focusBorder);
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

        .action-button:hover {
          background: var(--vscode-toolbar-hoverBackground);
        }

        .action-button.active {
          background: var(--vscode-button-background);
        }

        .console-messages {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
          font-family: var(--vscode-editor-font-family, 'Consolas, monospace');
          font-size: 13px;
        }

        .message {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 4px 0;
          border-bottom: 1px solid var(--vscode-panel-border);
        }

        .message-icon {
          flex-shrink: 0;
          font-size: 14px;
        }

        .message-timestamp {
          flex-shrink: 0;
          color: var(--vscode-descriptionForeground);
          font-size: 11px;
          min-width: 80px;
        }

        .message-content {
          flex: 1;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .message-source {
          flex-shrink: 0;
          color: var(--vscode-descriptionForeground);
          font-size: 11px;
        }

        .message-log {
          color: var(--vscode-terminal-foreground);
        }

        .message-info {
          color: var(--vscode-terminal-ansiBlue);
        }

        .message-warn {
          color: var(--vscode-terminal-ansiYellow);
        }

        .message-error {
          color: var(--vscode-terminal-ansiRed);
        }

        .message-debug {
          color: var(--vscode-terminal-ansiMagenta);
        }

        .no-messages {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--vscode-descriptionForeground);
        }

        .console-input-container {
          display: flex;
          align-items: center;
          padding: 8px;
          border-top: 1px solid var(--vscode-panel-border);
          background: var(--vscode-input-background);
        }

        .input-prompt {
          margin-right: 8px;
          color: var(--vscode-terminal-ansiGreen);
          font-family: var(--vscode-editor-font-family, 'Consolas, monospace');
          font-weight: 500;
        }

        .console-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: var(--vscode-input-foreground);
          font-family: var(--vscode-editor-font-family, 'Consolas, monospace');
          font-size: 13px;
        }
      `}</style>
    </div>
  );
};
