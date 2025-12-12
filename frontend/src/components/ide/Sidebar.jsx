import React from 'react';
import { useIDEStore } from '@/store/ideStore';
import {
  Files, Search, GitBranch, Puzzle, Settings, ChevronRight, ChevronDown,
  FileCode, Folder, FolderOpen, Plus, RefreshCw, MoreVertical, Trash2, Edit2
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from '@/lib/utils';

// Import new panels
import SearchPanel from './SearchPanel';
import GitPanel from './GitPanel';
import ExtensionsPanel from './ExtensionsPanel';
import SettingsPanel from './SettingsPanel';

const getFileIcon = (name, type, isOpen) => {
  if (type === 'folder') {
    return isOpen ? <FolderOpen className="w-4 h-4 text-yellow-500" /> : <Folder className="w-4 h-4 text-yellow-500" />;
  }
  
  const ext = name.split('.').pop()?.toLowerCase();
  const iconMap = {
    js: { color: 'text-yellow-400', label: 'JS' },
    jsx: { color: 'text-cyan-400', label: 'JSX' },
    ts: { color: 'text-blue-400', label: 'TS' },
    tsx: { color: 'text-blue-400', label: 'TSX' },
    py: { color: 'text-green-400', label: 'PY' },
    html: { color: 'text-orange-400', label: 'HTML' },
    css: { color: 'text-blue-400', label: 'CSS' },
    scss: { color: 'text-pink-400', label: 'SCSS' },
    json: { color: 'text-yellow-300', label: 'JSON' },
    md: { color: 'text-zinc-400', label: 'MD' },
    yaml: { color: 'text-red-400', label: 'YML' },
    yml: { color: 'text-red-400', label: 'YML' },
    svg: { color: 'text-orange-300', label: 'SVG' },
    png: { color: 'text-purple-400', label: 'IMG' },
    jpg: { color: 'text-purple-400', label: 'IMG' },
    gif: { color: 'text-purple-400', label: 'IMG' },
  };
  
  return <FileCode className={cn("w-4 h-4", iconMap[ext]?.color || 'text-zinc-400')} />;
};

const FileTreeItem = ({ node, level = 0, expandedFolders, toggleFolder, onFileClick, selectedFile }) => {
  const isFolder = node.type === 'folder';
  const isExpanded = expandedFolders.has(node.id);
  const isSelected = selectedFile === node.id;
  
  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger>
          <div
            className={cn(
              "flex items-center gap-1 px-2 py-1 cursor-pointer rounded text-sm transition-colors",
              "text-zinc-300 hover:text-white hover:bg-zinc-700/50",
              isSelected && "bg-blue-500/20 text-white"
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
            <span className="truncate flex-1">{node.name}</span>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="bg-zinc-900 border-zinc-700 w-48">
          {isFolder ? (
            <>
              <ContextMenuItem className="text-xs gap-2">
                <Plus className="w-3 h-3" /> New File
              </ContextMenuItem>
              <ContextMenuItem className="text-xs gap-2">
                <Folder className="w-3 h-3" /> New Folder
              </ContextMenuItem>
              <ContextMenuSeparator className="bg-zinc-700" />
            </>
          ) : null}
          <ContextMenuItem className="text-xs gap-2">
            <Edit2 className="w-3 h-3" /> Rename
          </ContextMenuItem>
          <ContextMenuItem className="text-xs gap-2">
            Copy Path
          </ContextMenuItem>
          <ContextMenuItem className="text-xs gap-2">
            Copy Relative Path
          </ContextMenuItem>
          <ContextMenuSeparator className="bg-zinc-700" />
          <ContextMenuItem className="text-xs gap-2 text-red-400 focus:text-red-400">
            <Trash2 className="w-3 h-3" /> Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      {isFolder && isExpanded && node.children?.map(child => (
        <FileTreeItem
          key={child.id}
          node={child}
          level={level + 1}
          expandedFolders={expandedFolders}
          toggleFolder={toggleFolder}
          onFileClick={onFileClick}
          selectedFile={selectedFile}
        />
      ))}
    </div>
  );
};

const FileExplorerPanel = () => {
  const { fileTree, openFile, currentProject, activeFileId } = useIDEStore();
  const [expandedFolders, setExpandedFolders] = React.useState(new Set());
  
  // Auto-expand root folder
  React.useEffect(() => {
    if (fileTree?.id && !expandedFolders.has(fileTree.id)) {
      setExpandedFolders(prev => new Set([...prev, fileTree.id]));
    }
  }, [fileTree?.id]);
  
  const toggleFolder = (id) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  
  return (
    <>
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          {currentProject?.name || 'Explorer'}
        </span>
        <div className="flex gap-1">
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" data-testid="new-file-btn">
                  <Plus className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p>New File</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" data-testid="new-folder-btn">
                  <Folder className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p>New Folder</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" data-testid="refresh-btn">
                  <RefreshCw className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p>Refresh</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
              selectedFile={activeFileId}
            />
          ) : (
            <div className="px-4 py-8 text-center text-zinc-500 text-sm">
              <Folder className="w-10 h-10 mx-auto mb-3 text-zinc-600" />
              <p>No project open</p>
              <p className="text-xs mt-1">Create or open a project to start</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </>
  );
};

const Sidebar = () => {
  const { activePanel, setActivePanel, sidebarCollapsed } = useIDEStore();
  
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
                    "w-10 h-10 flex items-center justify-center rounded-lg transition-colors relative",
                    activePanel === panel.id
                      ? "bg-zinc-800 text-white"
                      : "text-zinc-500 hover:text-white hover:bg-zinc-800/50"
                  )}
                  data-testid={`sidebar-${panel.id}`}
                >
                  <panel.icon className="w-5 h-5" />
                  {activePanel === panel.id && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-white rounded-r" />
                  )}
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
        <div className="w-60 bg-zinc-900/50 border-r border-zinc-800 flex flex-col overflow-hidden">
          {activePanel === 'explorer' && <FileExplorerPanel />}
          {activePanel === 'search' && <SearchPanel />}
          {activePanel === 'git' && <GitPanel />}
          {activePanel === 'extensions' && <ExtensionsPanel />}
          {activePanel === 'settings' && <SettingsPanel />}
        </div>
      )}
    </div>
  );
};

export default Sidebar;
