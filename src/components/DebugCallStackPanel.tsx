import React, { useState, useEffect } from 'react';
import { DebugService, StackFrame, Thread } from '../services/DebugService';
import { EventBus } from '../services/EventBus';
import { EditorService } from '../services/EditorService';

export const DebugCallStackPanel: React.FC = () => {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [stackFrames, setStackFrames] = useState<Map<number, StackFrame[]>>(new Map());
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);
  const [selectedFrameId, setSelectedFrameId] = useState<number | null>(null);
  const [expandedThreads, setExpandedThreads] = useState<Set<number>>(new Set());
  const debugService = DebugService.getInstance();
  const editorService = EditorService.getInstance();

  useEffect(() => {
    const unsubscribe1 = EventBus.getInstance().subscribe('debug:paused', loadCallStack);
    const unsubscribe2 = EventBus.getInstance().subscribe('debug:continued', clearCallStack);
    const unsubscribe3 = EventBus.getInstance().subscribe('debug:stopped', clearCallStack);
    const unsubscribe4 = EventBus.getInstance().subscribe('debug:threadChanged', handleThreadChanged);

    return () => {
      unsubscribe1();
      unsubscribe2();
      unsubscribe3();
      unsubscribe4();
    };
  }, []);

  const loadCallStack = async () => {
    const session = debugService.getActiveSession();
    if (!session) return;

    try {
      const allThreads = await debugService.getThreads(session.id);
      setThreads(allThreads);

      if (allThreads.length > 0) {
        const firstThread = allThreads[0];
        setSelectedThreadId(firstThread.id);
        await loadStackFrames(firstThread.id);
        
        const newExpanded = new Set(expandedThreads);
        newExpanded.add(firstThread.id);
        setExpandedThreads(newExpanded);
      }
    } catch (error) {
      console.error('Failed to load call stack:', error);
    }
  };

  const loadStackFrames = async (threadId: number) => {
    const session = debugService.getActiveSession();
    if (!session) return;

    try {
      const frames = await debugService.getStackTrace(session.id, threadId);
      setStackFrames(prev => new Map(prev).set(threadId, frames));
      
      if (frames.length > 0 && !selectedFrameId) {
        setSelectedFrameId(frames[0].id);
      }
    } catch (error) {
      console.error('Failed to load stack frames:', error);
    }
  };

  const clearCallStack = () => {
    setThreads([]);
    setStackFrames(new Map());
    setSelectedThreadId(null);
    setSelectedFrameId(null);
    setExpandedThreads(new Set());
  };

  const handleThreadChanged = (data: { threadId: number }) => {
    setSelectedThreadId(data.threadId);
    loadStackFrames(data.threadId);
  };

  const handleThreadClick = async (threadId: number) => {
    const newExpanded = new Set(expandedThreads);
    
    if (newExpanded.has(threadId)) {
      newExpanded.delete(threadId);
    } else {
      newExpanded.add(threadId);
      if (!stackFrames.has(threadId)) {
        await loadStackFrames(threadId);
      }
    }
    
    setExpandedThreads(newExpanded);
    setSelectedThreadId(threadId);
  };

  const handleFrameClick = async (frame: StackFrame) => {
    setSelectedFrameId(frame.id);
    
    const session = debugService.getActiveSession();
    if (session) {
      try {
        await debugService.selectStackFrame(session.id, frame.id);
        
        if (frame.source && frame.line) {
          const editor = await editorService.openFile(frame.source.path);
          if (editor) {
            editorService.revealLine(editor.id, frame.line);
          }
        }
        
        EventBus.getInstance().emit('debug:stackFrameChanged', { frameId: frame.id });
      } catch (error) {
        console.error('Failed to select stack frame:', error);
      }
    }
  };

  const handleCopyStackTrace = () => {
    const allFrames: string[] = [];
    
    threads.forEach(thread => {
      const frames = stackFrames.get(thread.id);
      if (frames) {
        allFrames.push(`Thread ${thread.id}: ${thread.name}`);
        frames.forEach(frame => {
          const location = frame.source
            ? `${frame.source.name}:${frame.line}:${frame.column}`
            : 'desconhecido';
          allFrames.push(`  at ${frame.name} (${location})`);
        });
        allFrames.push('');
      }
    });
    
    navigator.clipboard.writeText(allFrames.join('\n'));
    EventBus.getInstance().emit('notification:show', {
      message: 'Pilha copiada para a area de transferencia',
      type: 'info'
    });
  };

  const getFrameIcon = (frame: StackFrame) => {
    if (frame.presentationHint === 'label') return 'LBL';
    if (frame.presentationHint === 'subtle') return 'SUB';
    return 'FRM';
  };

  const getThreadIcon = (thread: Thread) => {
    if (thread.id === selectedThreadId) return 'ATIVO';
    return 'PAUSA';
  };

  return (
    <div className="debug-callstack-panel">
      <div className="panel-header">
        <h3>Pilha de chamadas</h3>
        <button
          type="button"
          className="action-button"
          onClick={handleCopyStackTrace}
          title="Copiar pilha"
          aria-label="Copiar pilha de chamadas"
          disabled={threads.length === 0}
        >
          Copiar
        </button>
      </div>

      <div className="callstack-list">
        {threads.map(thread => {
          const isExpanded = expandedThreads.has(thread.id);
          const frames = stackFrames.get(thread.id) || [];
          const isSelected = thread.id === selectedThreadId;

          return (
            <div key={thread.id} className="thread-item">
              <div
                className={`thread-header ${isSelected ? 'selected' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => handleThreadClick(thread.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleThreadClick(thread.id);
                  }
                }}
              >
                <button
                  type="button"
                  className="expand-button"
                  aria-label={isExpanded ? 'Recolher thread' : 'Expandir thread'}
                  aria-expanded={isExpanded}
                >
                  {isExpanded ? '-' : '+'}
                </button>
                <span className="thread-icon">{getThreadIcon(thread)}</span>
                <span className="thread-name">{thread.name}</span>
                <span className="thread-id">#{thread.id}</span>
              </div>

              {isExpanded && (
                <div className="frames-list">
                  {frames.map((frame, index) => {
                    const isFrameSelected = frame.id === selectedFrameId;
                    const location = frame.source
                      ? `${frame.source.name}:${frame.line}`
                      : 'desconhecido';

                    return (
                      <div
                        key={frame.id}
                        className={`frame-item ${isFrameSelected ? 'selected' : ''}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleFrameClick(frame)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            handleFrameClick(frame);
                          }
                        }}
                      >
                        <span className="frame-icon">{getFrameIcon(frame)}</span>
                        <div className="frame-info">
                          <div className="frame-name">{frame.name}</div>
                          <div className="frame-location">{location}</div>
                        </div>
                        <span className="frame-index">{index}</span>
                      </div>
                    );
                  })}
                  {frames.length === 0 && (
                    <div className="no-frames">Nenhum frame encontrado</div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {threads.length === 0 && (
          <div className="no-threads">
            <p>Nenhuma pilha disponivel</p>
            <p className="hint">Pause a execucao para ver a pilha</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .debug-callstack-panel {
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
          padding: 16px;
          border-bottom: 1px solid var(--vscode-panel-border);
        }

        .panel-header h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
        }

        .action-button {
          padding: 6px 10px;
          background: none;
          border: none;
          color: var(--vscode-foreground);
          cursor: pointer;
          font-size: 14px;
          border-radius: 2px;
          transition: background 0.15s ease-out, color 0.15s ease-out;
        }

        .action-button:hover:not(:disabled) {
          background: var(--vscode-toolbar-hoverBackground);
        }

        .action-button:focus-visible {
          outline: 2px solid var(--vscode-focusBorder);
          outline-offset: 2px;
        }

        .action-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .callstack-list {
          flex: 1;
          overflow-y: auto;
        }

        .thread-item {
          border-bottom: 1px solid var(--vscode-panel-border);
        }

        .thread-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          cursor: pointer;
          font-size: 13px;
          transition: background 0.15s ease-out, color 0.15s ease-out;
        }

        .thread-header:hover {
          background: var(--vscode-list-hoverBackground);
        }

        .thread-header.selected {
          background: var(--vscode-list-activeSelectionBackground);
          color: var(--vscode-list-activeSelectionForeground);
        }

        .thread-header:focus-visible {
          outline: 2px solid var(--vscode-focusBorder);
          outline-offset: -2px;
        }

        .expand-button {
          background: none;
          border: none;
          color: inherit;
          cursor: pointer;
          padding: 0;
          width: 16px;
          font-size: 10px;
          transition: transform 0.15s ease-out, color 0.15s ease-out;
        }

        .expand-button:focus-visible {
          outline: 2px solid var(--vscode-focusBorder);
          outline-offset: 2px;
        }

        .thread-icon {
          font-size: 14px;
        }

        .thread-name {
          flex: 1;
          font-weight: 500;
        }

        .thread-id {
          font-size: 11px;
          color: var(--vscode-descriptionForeground);
        }

        .frames-list {
          background: var(--vscode-sideBar-background);
          border-left: 2px solid var(--vscode-panel-border);
          margin-left: 16px;
        }

        .frame-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          cursor: pointer;
          font-size: 13px;
          transition: background 0.15s ease-out, color 0.15s ease-out;
        }

        .frame-item:hover {
          background: var(--vscode-list-hoverBackground);
        }

        .frame-item.selected {
          background: var(--vscode-list-activeSelectionBackground);
          color: var(--vscode-list-activeSelectionForeground);
        }

        .frame-item:focus-visible {
          outline: 2px solid var(--vscode-focusBorder);
          outline-offset: -2px;
        }

        .frame-icon {
          font-size: 12px;
          flex-shrink: 0;
        }

        .frame-info {
          flex: 1;
          min-width: 0;
        }

        .frame-name {
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-family: var(--vscode-editor-font-family, 'Consolas, monospace');
        }

        .frame-location {
          font-size: 11px;
          color: var(--vscode-descriptionForeground);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .frame-index {
          font-size: 11px;
          color: var(--vscode-descriptionForeground);
          flex-shrink: 0;
        }

        .no-frames {
          padding: 16px;
          text-align: center;
          color: var(--vscode-descriptionForeground);
          font-size: 12px;
        }

        .no-threads {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 200px;
          gap: 8px;
          color: var(--vscode-descriptionForeground);
        }

        .no-threads p {
          margin: 0;
        }

        .hint {
          font-size: 12px;
        }
      `}</style>
    </div>
  );
};
