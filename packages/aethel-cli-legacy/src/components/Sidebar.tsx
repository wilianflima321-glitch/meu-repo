import React from 'react';
import { FileTree } from './FileTree';
import { SearchPanel } from './SearchPanel';
import { SourceControlPanel } from './SourceControlPanel';
import { DebugVariablesPanel } from './DebugVariablesPanel';
import { ExtensionMarketplace } from './ExtensionMarketplace';

interface SidebarProps {
  activeView: 'explorer' | 'search' | 'git' | 'debug' | 'extensions';
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView }) => {
  const renderView = () => {
    switch (activeView) {
      case 'explorer':
        return <FileTree />;
      case 'search':
        return <SearchPanel />;
      case 'git':
        return <SourceControlPanel />;
      case 'debug':
        return <DebugVariablesPanel />;
      case 'extensions':
        return <ExtensionMarketplace />;
      default:
        return <FileTree />;
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">
          {activeView.charAt(0).toUpperCase() + activeView.slice(1)}
        </span>
      </div>
      {renderView()}

      <style jsx>{`
        .sidebar {
          width: 300px;
          background: var(--vscode-sideBar-background);
          color: var(--vscode-sideBar-foreground);
          border-right: 1px solid var(--vscode-panel-border);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .sidebar-header {
          padding: 8px 12px;
          background: var(--vscode-sideBarSectionHeader-background);
          border-bottom: 1px solid var(--vscode-panel-border);
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .sidebar-title {
          color: var(--vscode-sideBar-foreground);
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
};
