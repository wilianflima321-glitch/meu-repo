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
      default: return 'text-slate-300';
    }
  };

  return (
    <div className="h-full bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700">
        <div className="flex">
          {channels.map(channel => (
            <button
              key={channel}
              onClick={() => setActiveChannel(channel)}
              className={`px-4 py-2 text-sm transition-colors border-b-2 ${
                activeChannel === channel
                  ? 'border-purple-500 text-white bg-slate-800'
                  : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {channel}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 px-3">
          <input
            type="text"
            placeholder="Filter..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-1 bg-slate-800 text-white text-sm rounded focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <button
            onClick={clearMessages}
            className="p-1 hover:bg-slate-800 rounded transition-colors"
            title="Clear Output"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Output Content */}
      <div
        ref={outputRef}
        className="flex-1 overflow-y-auto p-3 font-mono text-sm"
      >
        {filteredMessages.length === 0 ? (
          <div className="text-slate-500 text-center py-8">
            No output to display
          </div>
        ) : (
          filteredMessages.map((msg, index) => (
            <div
              key={index}
              className={`mb-1 ${getSeverityColor(msg.severity)}`}
            >
              <span className="text-slate-600 mr-2">
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
