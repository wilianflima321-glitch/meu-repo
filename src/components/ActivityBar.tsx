import React from 'react';
import { EventBus } from '../services/EventBus';

interface ActivityBarProps {
  activeView: 'explorer' | 'search' | 'git' | 'debug' | 'extensions';
  onViewChange: (view: 'explorer' | 'search' | 'git' | 'debug' | 'extensions') => void;
}

export const ActivityBar: React.FC<ActivityBarProps> = ({ activeView, onViewChange }) => {
  const handleViewClick = (view: typeof activeView) => {
    onViewChange(view);
    EventBus.getInstance().emit(`view:show${view.charAt(0).toUpperCase() + view.slice(1)}`, {});
  };

  return (
    <div className="activity-bar">
      <div className="activity-items">
        <button
          className={`activity-item ${activeView === 'explorer' ? 'active' : ''}`}
          onClick={() => handleViewClick('explorer')}
          title="Explorer (Ctrl+Shift+E)"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 3h8l2 2h8v14H3V3zm2 2v12h14V7h-7.17l-2-2H5z"/>
          </svg>
        </button>

        <button
          className={`activity-item ${activeView === 'search' ? 'active' : ''}`}
          onClick={() => handleViewClick('search')}
          title="Search (Ctrl+Shift+F)"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
        </button>

        <button
          className={`activity-item ${activeView === 'git' ? 'active' : ''}`}
          onClick={() => handleViewClick('git')}
          title="Source Control (Ctrl+Shift+G)"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21.007 8.222A3.738 3.738 0 0015.045 5.2a3.737 3.737 0 00-1.156 6.583 2.988 2.988 0 01-2.668 0l-.8-.8a3.738 3.738 0 00-5.156 5.156l.8.8a2.988 2.988 0 010 2.668 3.738 3.738 0 106.583 1.156 3.737 3.737 0 000-5.156l-.8-.8a2.988 2.988 0 012.668 0l.8.8a3.738 3.738 0 005.156-5.156l-.8-.8a2.988 2.988 0 010-2.668z"/>
          </svg>
        </button>

        <button
          className={`activity-item ${activeView === 'debug' ? 'active' : ''}`}
          onClick={() => handleViewClick('debug')}
          title="Run and Debug (Ctrl+Shift+D)"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </button>

        <button
          className={`activity-item ${activeView === 'extensions' ? 'active' : ''}`}
          onClick={() => handleViewClick('extensions')}
          title="Extensions (Ctrl+Shift+X)"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10.5 4.5c.28 0 .5.22.5.5v2h6v6h2c.28 0 .5.22.5.5s-.22.5-.5.5h-2v6h-2.12c-.68-1.75-2.39-3-4.38-3s-3.7 1.25-4.38 3H4v-2.12c1.75-.68 3-2.39 3-4.38 0-1.99-1.25-3.7-3-4.38V4h6V2c0-.28.22-.5.5-.5z"/>
          </svg>
        </button>
      </div>

      <div className="activity-bottom">
        <button
          className="activity-item"
          onClick={() => EventBus.getInstance().emit('settings:open', {})}
          title="Settings (Ctrl+,)"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
          </svg>
        </button>
      </div>

      <style jsx>{`
        .activity-bar {
          width: 48px;
          background: var(--vscode-activityBar-background);
          color: var(--vscode-activityBar-foreground);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          border-right: 1px solid var(--vscode-panel-border);
        }

        .activity-items,
        .activity-bottom {
          display: flex;
          flex-direction: column;
        }

        .activity-item {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          color: inherit;
          cursor: pointer;
          position: relative;
          transition: background 0.1s;
        }

        .activity-item:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .activity-item.active {
          color: #ffffff;
        }

        .activity-item.active::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 2px;
          background: #ffffff;
        }

        .activity-item svg {
          width: 24px;
          height: 24px;
        }
      `}</style>
    </div>
  );
};
