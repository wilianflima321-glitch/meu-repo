import React, { useState, useEffect, useCallback } from 'react';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useIDEStore } from '@/store/ideStore';
import {
  File, Folder, Settings, Search, GitBranch, Terminal, Sparkles,
  Palette, Play, Bug, Layers, Activity, Code, RefreshCw
} from 'lucide-react';

const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const {
    files, openFile, setActivePanel, toggleSidebar, toggleBottomPanel,
    toggleRightPanel, setRightPanelTab, setBottomPanelTab
  } = useIDEStore();
  
  useEffect(() => {
    const down = (e) => {
      if (e.key === 'p' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        setOpen((open) => !open);
      }
      if (e.key === 'p' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);
  
  const commands = [
    { group: 'Files', items: [
      { icon: File, label: 'New File', action: () => {} },
      { icon: Folder, label: 'New Folder', action: () => {} },
      { icon: Search, label: 'Search in Files', action: () => setActivePanel('search') },
    ]},
    { group: 'View', items: [
      { icon: Folder, label: 'Toggle Explorer', action: () => setActivePanel('explorer') },
      { icon: Search, label: 'Toggle Search', action: () => setActivePanel('search') },
      { icon: GitBranch, label: 'Toggle Source Control', action: () => setActivePanel('git') },
      { icon: Terminal, label: 'Toggle Terminal', action: toggleBottomPanel },
      { icon: Sparkles, label: 'Toggle AI Assistant', action: () => { toggleRightPanel(); setRightPanelTab('ai'); } },
    ]},
    { group: 'Tools', items: [
      { icon: Layers, label: 'Open Animation Timeline', action: () => { toggleRightPanel(); setRightPanelTab('animation'); } },
      { icon: Activity, label: 'Open Profiler', action: () => { toggleRightPanel(); setRightPanelTab('profiling'); } },
      { icon: Bug, label: 'Start Debugging', action: () => setBottomPanelTab('debug') },
      { icon: Play, label: 'Run Code', action: () => {} },
    ]},
    { group: 'Settings', items: [
      { icon: Settings, label: 'Open Settings', action: () => setActivePanel('settings') },
      { icon: Palette, label: 'Change Theme', action: () => {} },
      { icon: Code, label: 'Open Extensions', action: () => setActivePanel('extensions') },
    ]},
  ];
  
  const filesList = files.filter(f => f.type === 'file');
  
  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <Command className="bg-zinc-900 border-zinc-700">
        <CommandInput placeholder="Type a command or search..." className="text-white" />
        <CommandList className="max-h-96">
          <CommandEmpty className="text-zinc-500">No results found.</CommandEmpty>
          
          {filesList.length > 0 && (
            <CommandGroup heading="Recent Files" className="text-zinc-400">
              {filesList.slice(0, 5).map(file => (
                <CommandItem
                  key={file.id}
                  className="text-zinc-300 hover:bg-zinc-800 cursor-pointer"
                  onSelect={() => { openFile(file); setOpen(false); }}
                >
                  <File className="mr-2 h-4 w-4" />
                  {file.name}
                  <span className="ml-auto text-xs text-zinc-600">{file.path}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          
          {commands.map((group, i) => (
            <React.Fragment key={group.group}>
              {i > 0 && <CommandSeparator className="bg-zinc-800" />}
              <CommandGroup heading={group.group} className="text-zinc-400">
                {group.items.map(item => (
                  <CommandItem
                    key={item.label}
                    className="text-zinc-300 hover:bg-zinc-800 cursor-pointer"
                    onSelect={() => { item.action(); setOpen(false); }}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </React.Fragment>
          ))}
        </CommandList>
      </Command>
    </CommandDialog>
  );
};

export default CommandPalette;
