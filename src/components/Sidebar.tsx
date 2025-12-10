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
      `}</style>
    </div>
  );
};
