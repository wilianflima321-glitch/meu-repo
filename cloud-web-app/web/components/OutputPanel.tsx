'use client';

import { useState, useRef, useEffect } from 'react';

export type OutputChannel = 'Tasks' | 'Debug Console' | 'Terminal' | 'Problems' | 'Output';

interface OutputMessage {
  timestamp: Date;
  channel: OutputChannel;
  message: string;
  severity?: 'info' | 'warning' | 'error';
}

export default function OutputPanel() {
  const [messages, setMessages] = useState<OutputMessage[]>([]);
  const [activeChannel, setActiveChannel] = useState<OutputChannel>('Output');
  const [filter, setFilter] = useState<string>('');
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Listen for output messages
    const handleOutput = (event: CustomEvent<OutputMessage>) => {
      addMessage(event.detail);
    };

    window.addEventListener('output-message' as any, handleOutput);
    return () => window.removeEventListener('output-message' as any, handleOutput);
  }, []);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [messages]);

  const addMessage = (message: OutputMessage) => {
    setMessages(prev => [...prev, message]);
  };

  const clearMessages = () => {
    setMessages([]);
  };

  const channels: OutputChannel[] = ['Tasks', 'Debug Console', 'Terminal', 'Problems', 'Output'];

  const filteredMessages = messages.filter(m => {
    if (m.channel !== activeChannel) return false;
    if (filter && !m.message.toLowerCase().includes(filter.toLowerCase())) return false;
    return true;
  });

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      case 'info': return 'text-blue-400';
      default: return 'text-[var(--aethel-text-secondary)]';
    }
  };

  return (
    <div className="h-full bg-[var(--aethel-surface-secondary)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--aethel-border-primary)]">
        <div className="flex">
          {channels.map(channel => (
            <button
              key={channel}
              onClick={() => setActiveChannel(channel)}
              className={`px-4 py-2 text-sm transition-colors border-b-2 ${
                activeChannel === channel
                  ? 'border-[var(--aethel-primary)] text-[var(--aethel-text-primary)] bg-[var(--aethel-surface-tertiary)]'
                  : 'border-transparent text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-surface-tertiary)]'
              }`}
            >
              {channel}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 px-3">
          <input
            type="text"
            placeholder="Filtrar..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-1 bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-primary)] text-sm rounded focus:outline-none focus:ring-2 focus:ring-[var(--aethel-info)]"
          />
          <button
            onClick={clearMessages}
            className="rounded px-2 py-1 text-xs text-[var(--aethel-text-secondary)] transition-colors hover:bg-[var(--aethel-surface-tertiary)] hover:text-[var(--aethel-text-primary)]"
            title="Limpar saida"
          >
            Limpar
          </button>
        </div>
      </div>

      {/* Output Content */}
      <div
        ref={outputRef}
        className="flex-1 overflow-y-auto p-3 font-mono text-sm"
      >
        {filteredMessages.length === 0 ? (
          <div className="text-[var(--aethel-text-tertiary)] text-center py-8">
            Nenhuma saida para exibir
          </div>
        ) : (
          filteredMessages.map((msg, index) => (
            <div
              key={index}
              className={`mb-1 ${getSeverityColor(msg.severity)}`}
            >
              <span className="text-[var(--aethel-text-quaternary)] mr-2">
                [{msg.timestamp.toLocaleTimeString()}]
              </span>
              <span className="whitespace-pre-wrap">{msg.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Helper function to send output messages
export function sendOutput(channel: OutputChannel, message: string, severity?: 'info' | 'warning' | 'error') {
  const event = new CustomEvent('output-message', {
    detail: {
      timestamp: new Date(),
      channel,
      message,
      severity
    }
  });
  window.dispatchEvent(event);
}
