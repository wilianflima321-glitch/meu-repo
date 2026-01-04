/**
 * Output Panel Component
 * Displays output from various channels
 */

import React, { useState, useEffect, useRef } from 'react';
import { getOutputManager, OutputChannel, ANSIFormatter } from '../../lib/output/output-manager';

export const OutputPanel: React.FC = () => {
  const [channels, setChannels] = useState<OutputChannel[]>([]);
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  const outputManager = getOutputManager();

  // Load channels
  useEffect(() => {
    const updateChannels = () => {
      const allChannels = outputManager.getChannels();
      setChannels(allChannels);

      const active = outputManager.getActiveChannelName();
      if (active) {
        setActiveChannel(active);
        const channel = outputManager.getChannel(active);
        if (channel) {
          setContent(channel.getContent());
        }
      }
    };

    updateChannels();

    const unsubscribe = outputManager.onChange(updateChannels);
    return unsubscribe;
  }, [outputManager]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [content, autoScroll]);

  // Handle channel change
  const handleChannelChange = (channelName: string) => {
    outputManager.showChannel(channelName);
  };

  // Handle clear
  const handleClear = () => {
    if (activeChannel) {
      const channel = outputManager.getChannel(activeChannel);
      if (channel) {
        channel.clear();
      }
    }
  };

  // Handle scroll
  const handleScroll = () => {
    if (contentRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 10;
      setAutoScroll(isAtBottom);
    }
  };

  return (
    <div className="output-panel">
      <div className="output-header">
        <select
          className="channel-selector"
          value={activeChannel || ''}
          onChange={(e) => handleChannelChange(e.target.value)}
        >
          {channels.map((channel) => (
            <option key={channel.name} value={channel.name}>
              {channel.name}
            </option>
          ))}
        </select>

        <div className="output-actions">
          <button
            className="action-button"
            onClick={handleClear}
            title="Clear output"
          >
            Clear
          </button>
          <button
            className={`action-button ${autoScroll ? 'active' : ''}`}
            onClick={() => setAutoScroll(!autoScroll)}
            title="Toggle auto scroll"
          >
            Auto
          </button>
        </div>
      </div>

      <div
        ref={contentRef}
        className="output-content"
        onScroll={handleScroll}
        dangerouslySetInnerHTML={{
          __html: ANSIFormatter.formatToHTML(content),
        }}
      />

      <style jsx>{`
        .output-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--panel-bg);
          color: var(--terminal-fg);
        }

        .output-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          border-bottom: 1px solid var(--panel-border);
        }

        .channel-selector {
          padding: 4px 8px;
          background: var(--editor-bg);
          border: 1px solid var(--panel-border);
          color: var(--editor-fg);
          font-size: 12px;
          border-radius: 3px;
          cursor: pointer;
        }

        .output-actions {
          display: flex;
          gap: 4px;
        }

        .action-button {
          padding: 4px 8px;
          background: var(--editor-bg);
          border: 1px solid var(--panel-border);
          color: var(--editor-fg);
          font-size: 14px;
          cursor: pointer;
          border-radius: 3px;
        }

        .action-button:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .action-button.active {
          background: var(--activitybar-activeBorder);
          color: white;
        }

        .output-content {
          flex: 1;
          overflow-y: auto;
          padding: 8px 12px;
          font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
          font-size: 13px;
          line-height: 1.5;
          white-space: pre-wrap;
          word-wrap: break-word;
        }

        .output-content::-webkit-scrollbar {
          width: 10px;
        }

        .output-content::-webkit-scrollbar-track {
          background: var(--editor-bg);
        }

        .output-content::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 5px;
        }

        .output-content::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
};
