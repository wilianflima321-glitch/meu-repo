import React from 'react';
import { useIDEStore } from '@/store/ideStore';
import {
  Files, Search, GitBranch, Puzzle, Settings, ChevronRight, ChevronDown,
  FileCode, Folder, FolderOpen, Plus, RefreshCw, MoreVertical
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const iconMap = {
  js: '📄', jsx: '⚛️', ts: '📘', tsx: '⚛️', py: '🐍', html: '🌐',
  css: '🎨', json: '📋', md: '📝', git: '🔒', env: '🔐',
  folder: '📁', folderOpen: '📂'
};

const getFileIcon = (name, type, isOpen) => {
  if (type === 'folder') return isOpen ? <FolderOpen className="w-4 h-4 text-yellow-500" /> : <Folder className="w-4 h-4 text-yellow-500" />;
  const ext = name.split('.').pop();
  return <FileCode className="w-4 h-4 text-blue-400" />;
};

const FileTreeItem = ({ node, level = 0, expandedFolders, toggleFolder, onFileClick }) => {
  const isFolder = node.type === 'folder';
  const isExpanded = expandedFolders.has(node.id);
  
  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-zinc-700/50 rounded text-sm",
          "text-zinc-300 hover:text-white transition-colors"
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => isFolder ? toggleFolder(node.id) : onFileClick(node)}
        data-testid={`file-tree-item-${node.name}`}
      >
        {isFolder && (
          <span className="w-4 h-4 flex items-center justify-center">
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </span>
        )}
        {!isFolder && <span className="w-4" />}
        {getFileIcon(node.name, node.type, isExpanded)}
        <span className="truncate">{node.name}</span>
      </div>
      {isFolder && isExpanded && node.children?.map(child => (
        <FileTreeItem
          key={child.id}
          node={child}
          level={level + 1}
          expandedFolders={expandedFolders}
          toggleFolder={toggleFolder}
          onFileClick={onFileClick}
        />
      ))}
    </div>
  );
};

const Sidebar = () => {
  const {
    activePanel, setActivePanel, sidebarCollapsed, toggleSidebar,
    fileTree, openFile, currentProject
  } = useIDEStore();
  
  const [expandedFolders, setExpandedFolders] = React.useState(new Set());
  
  const toggleFolder = (id) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  
  const panels = [
    { id: 'explorer', icon: Files, label: 'Explorer' },
    { id: 'search', icon: Search, label: 'Search' },
    { id: 'git', icon: GitBranch, label: 'Source Control' },
    { id: 'extensions', icon: Puzzle, label: 'Extensions' },
    { id: 'settings', icon: Settings, label: 'Settings' }
  ];
  
  return (
    <div className="flex h-full">
      {/* Activity Bar */}
      <div className="w-12 bg-zinc-900 border-r border-zinc-800 flex flex-col items-center py-2 gap-1">
        <TooltipProvider delayDuration={0}>
          {panels.map(panel => (
            <Tooltip key={panel.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setActivePanel(panel.id)}
                  className={cn(
                    "w-10 h-10 flex items-center justify-center rounded-lg transition-colors",
                    activePanel === panel.id
                      ? "bg-zinc-800 text-white border-l-2 border-blue-500"
                      : "text-zinc-500 hover:text-white hover:bg-zinc-800/50"
                  )}
                  data-testid={`sidebar-${panel.id}`}
                >
                  <panel.icon className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{panel.label}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </div>
      
      {/* Panel Content */}
      {!sidebarCollapsed && (
        <div className="w-60 bg-zinc-900/50 border-r border-zinc-800 flex flex-col">
          {activePanel === 'explorer' && (
            <>
              <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Explorer</span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-6 w-6" data-testid="new-file-btn">
                    <Plus className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" data-testid="refresh-btn">
                    <RefreshCw className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="py-2">
                  {fileTree ? (
                    <FileTreeItem
                      node={fileTree}
                      expandedFolders={expandedFolders}
                      toggleFolder={toggleFolder}
                      onFileClick={openFile}
                    />
                  ) : (
                    <div className="px-4 py-8 text-center text-zinc-500 text-sm">
                      No project open
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
          
          {activePanel === 'search' && <SearchPanel />}
          {activePanel === 'git' && <GitPanel />}
          {activePanel === 'extensions' && <ExtensionsPanel />}
          {activePanel === 'settings' && <SettingsPanel />}
        </div>
      )}
    </div>
  );
};

const SearchPanel = () => {
  const { searchQuery, setSearchQuery, searchResults, setSearchResults, currentProject } = useIDEStore();
  const [loading, setLoading] = React.useState(false);
  
  return (
    <>
      <div className="px-3 py-2 border-b border-zinc-800">
        <input
          type="text"
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-500"
          data-testid="search-input"
        />
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2">
          {searchResults.length > 0 ? (
            searchResults.map((result, i) => (
              <div key={i} className="p-2 hover:bg-zinc-800 rounded cursor-pointer text-sm">
                <div className="text-white font-medium">{result.file?.name}</div>
                {result.matches?.map((match, j) => (
                  <div key={j} className="text-zinc-400 text-xs mt-1">
                    {match.line && `Line ${match.line}: `}{match.text}
                  </div>
                ))}
              </div>
            ))
          ) : searchQuery ? (
            <div className="text-zinc-500 text-sm text-center py-4">No results</div>
          ) : (
            <div className="text-zinc-500 text-sm text-center py-4">Enter search query</div>
          )}
        </div>
      </ScrollArea>
    </>
  );
};

const GitPanel = () => {
  const { gitStatus, gitBranch, gitChanges } = useIDEStore();
  
  return (
    <>
      <div className="px-4 py-2 border-b border-zinc-800">
        <span className="text-xs font-semibold text-zinc-400 uppercase">Source Control</span>
      </div>
      <div className="p-3">
        <div className="flex items-center gap-2 text-sm text-white mb-3">
          <GitBranch className="w-4 h-4" />
          <span>{gitBranch}</span>
        </div>
        <div className="space-y-1">
          <div className="text-xs text-zinc-400 uppercase mb-2">Changes</div>
          {gitChanges?.length > 0 ? (
            gitChanges.map((change, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-zinc-300 py-1">
                <span className={cn(
                  "text-xs px-1 rounded",
                  change.status === 'modified' && "text-yellow-500",
                  change.status === 'added' && "text-green-500",
                  change.status === 'deleted' && "text-red-500"
                )}>
                  {change.status[0].toUpperCase()}
                </span>
                <span className="truncate">{change.file}</span>
              </div>
            ))
          ) : (
            <div className="text-zinc-500 text-sm">No changes</div>
          )}
        </div>
      </div>
    </>
  );
};

const ExtensionsPanel = () => {
  const { extensions, toggleExtension } = useIDEStore();
  
  return (
    <>
      <div className="px-4 py-2 border-b border-zinc-800">
        <span className="text-xs font-semibold text-zinc-400 uppercase">Extensions</span>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {extensions.map(ext => (
            <div key={ext.id} className="p-2 bg-zinc-800/50 rounded hover:bg-zinc-800 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white font-medium">{ext.name}</span>
                <button
                  onClick={() => toggleExtension(ext.id)}
                  className={cn(
                    "text-xs px-2 py-0.5 rounded",
                    ext.enabled ? "bg-green-500/20 text-green-400" : "bg-zinc-700 text-zinc-400"
                  )}
                  data-testid={`ext-toggle-${ext.id}`}
                >
                  {ext.enabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>
              <div className="text-xs text-zinc-500 mt-1">{ext.description}</div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </>
  );
};

const SettingsPanel = () => {
  const { settings, updateSettings, theme, setTheme, themes } = useIDEStore();
  
  return (
    <>
      <div className="px-4 py-2 border-b border-zinc-800">
        <span className="text-xs font-semibold text-zinc-400 uppercase">Settings</span>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Font Size</label>
            <input
              type="number"
              value={settings.fontSize}
              onChange={(e) => updateSettings({ fontSize: parseInt(e.target.value) })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
              data-testid="font-size-input"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Tab Size</label>
            <input
              type="number"
              value={settings.tabSize}
              onChange={(e) => updateSettings({ tabSize: parseInt(e.target.value) })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-white"
              data-testid="tab-size-input"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-xs text-zinc-400">Minimap</label>
            <button
              onClick={() => updateSettings({ minimap: !settings.minimap })}
              className={cn(
                "w-8 h-4 rounded-full transition-colors",
                settings.minimap ? "bg-blue-500" : "bg-zinc-700"
              )}
              data-testid="minimap-toggle"
            >
              <div className={cn(
                "w-3 h-3 bg-white rounded-full transition-transform",
                settings.minimap ? "translate-x-4" : "translate-x-0.5"
              )} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-xs text-zinc-400">Word Wrap</label>
            <button
              onClick={() => updateSettings({ wordWrap: !settings.wordWrap })}
              className={cn(
                "w-8 h-4 rounded-full transition-colors",
                settings.wordWrap ? "bg-blue-500" : "bg-zinc-700"
              )}
              data-testid="wordwrap-toggle"
            >
              <div className={cn(
                "w-3 h-3 bg-white rounded-full transition-transform",
                settings.wordWrap ? "translate-x-4" : "translate-x-0.5"
              )} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-xs text-zinc-400">Auto Save</label>
            <button
              onClick={() => updateSettings({ autoSave: !settings.autoSave })}
              className={cn(
                "w-8 h-4 rounded-full transition-colors",
                settings.autoSave ? "bg-blue-500" : "bg-zinc-700"
              )}
              data-testid="autosave-toggle"
            >
              <div className={cn(
                "w-3 h-3 bg-white rounded-full transition-transform",
                settings.autoSave ? "translate-x-4" : "translate-x-0.5"
              )} />
            </button>
          </div>
        </div>
      </ScrollArea>
    </>
  );
};

export default Sidebar;
