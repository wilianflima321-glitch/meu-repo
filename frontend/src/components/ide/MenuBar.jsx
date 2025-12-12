import React from 'react';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
} from '@/components/ui/menubar';
import { useIDEStore } from '@/store/ideStore';

const MenuBar = () => {
  const {
    toggleSidebar, toggleBottomPanel, toggleRightPanel,
    setActivePanel, setRightPanelTab, clearTerminal
  } = useIDEStore();
  
  return (
    <div className="bg-zinc-900 border-b border-zinc-800" data-testid="menubar">
      <Menubar className="border-0 bg-transparent rounded-none h-8 px-2">
        <MenubarMenu>
          <MenubarTrigger className="text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 px-2 py-1">
            File
          </MenubarTrigger>
          <MenubarContent className="bg-zinc-900 border-zinc-700">
            <MenubarItem className="text-xs text-zinc-300 hover:bg-zinc-800 focus:bg-zinc-800">
              New File <MenubarShortcut>⌘N</MenubarShortcut>
            </MenubarItem>
            <MenubarItem className="text-xs text-zinc-300 hover:bg-zinc-800 focus:bg-zinc-800">
              New Folder
            </MenubarItem>
            <MenubarSeparator className="bg-zinc-700" />
            <MenubarItem className="text-xs text-zinc-300 hover:bg-zinc-800 focus:bg-zinc-800">
              Open File <MenubarShortcut>⌘O</MenubarShortcut>
            </MenubarItem>
            <MenubarItem className="text-xs text-zinc-300 hover:bg-zinc-800 focus:bg-zinc-800">
              Open Folder
            </MenubarItem>
            <MenubarSeparator className="bg-zinc-700" />
            <MenubarItem className="text-xs text-zinc-300 hover:bg-zinc-800 focus:bg-zinc-800">
              Save <MenubarShortcut>⌘S</MenubarShortcut>
            </MenubarItem>
            <MenubarItem className="text-xs text-zinc-300 hover:bg-zinc-800 focus:bg-zinc-800">
              Save All <MenubarShortcut>⌘⇧S</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator className="bg-zinc-700" />
            <MenubarItem className="text-xs text-zinc-300 hover:bg-zinc-800 focus:bg-zinc-800">
              Exit
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        
        <MenubarMenu>
          <MenubarTrigger className="text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 px-2 py-1">
            Edit
          </MenubarTrigger>
          <MenubarContent className="bg-zinc-900 border-zinc-700">
            <MenubarItem className="text-xs text-zinc-300 hover:bg-zinc-800 focus:bg-zinc-800">
              Undo <MenubarShortcut>⌘Z</MenubarShortcut>
            </MenubarItem>
            <MenubarItem className="text-xs text-zinc-300 hover:bg-zinc-800 focus:bg-zinc-800">
              Redo <MenubarShortcut>⌘⇧Z</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator className="bg-zinc-700" />
            <MenubarItem className="text-xs text-zinc-300 hover:bg-zinc-800 focus:bg-zinc-800">
              Cut <MenubarShortcut>⌘X</MenubarShortcut>
            </MenubarItem>
            <MenubarItem className="text-xs text-zinc-300 hover:bg-zinc-800 focus:bg-zinc-800">
              Copy <MenubarShortcut>⌘C</MenubarShortcut>
            </MenubarItem>
            <MenubarItem className="text-xs text-zinc-300 hover:bg-zinc-800 focus:bg-zinc-800">
              Paste <MenubarShortcut>⌘V</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator className="bg-zinc-700" />
            <MenubarItem className="text-xs text-zinc-300 hover:bg-zinc-800 focus:bg-zinc-800">
              Find <MenubarShortcut>⌘F</MenubarShortcut>
            </MenubarItem>
            <MenubarItem className="text-xs text-zinc-300 hover:bg-zinc-800 focus:bg-zinc-800">
              Replace <MenubarShortcut>⌘H</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        
        <MenubarMenu>
          <MenubarTrigger className="text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 px-2 py-1">
            View
          </MenubarTrigger>
          <MenubarContent className="bg-zinc-900 border-zinc-700">
            <MenubarItem className="text-xs text-zinc-300 hover:bg-zinc-800 focus:bg-zinc-800" onClick={() => setActivePanel('explorer')}>
              Explorer <MenubarShortcut>⌘⇧E</MenubarShortcut>
            </MenubarItem>
            <MenubarItem className="text-xs text-zinc-300 hover:bg-zinc-800 focus:bg-zinc-800" onClick={() => setActivePanel('search')}>
              Search <MenubarShortcut>⌘⇧F</MenubarShortcut>
            </MenubarItem>
            <MenubarItem className="text-xs text-zinc-300 hover:bg-zinc-800 focus:bg-zinc-800" onClick={() => setActivePanel('git')}>
              Source Control <MenubarShortcut>⌘⇧G</MenubarShortcut>
            </MenubarItem>
            <MenubarItem className="text-xs text-zinc-300 hover:bg-zinc-800 focus:bg-zinc-800" onClick={() => setActivePanel('extensions')}>
              Extensions <MenubarShortcut>⌘⇧X</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator className="bg-zinc-700" />
            <MenubarItem className="text-xs text-zinc-300 hover:bg-zinc-800 focus:bg-zinc-800" onClick={toggleSidebar}>
              Toggle Sidebar <MenubarShortcut>⌘B</MenubarShortcut>
            </MenubarItem>
            <MenubarItem className="text-xs text-zinc-300 hover:bg-zinc-800 focus:bg-zinc-800" onClick={toggleBottomPanel}>
              Toggle Panel <MenubarShortcut>⌘J</MenubarShortcut>
            </MenubarItem>
            <MenubarItem className="text-xs text-zinc-300 hover:bg-zinc-800 focus:bg-zinc-800" onClick={toggleRightPanel}>
              Toggle AI Panel <MenubarShortcut>⌘⇧A</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        
        <MenubarMenu>
          <MenubarTrigger className="text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 px-2 py-1">
            Run
          </MenubarTrigger>
          <MenubarContent className="bg-zinc-900 border-zinc-700">
            <MenubarItem className="text-xs text-zinc-300 hover:bg-zinc-800 focus:bg-zinc-800">
              Start Debugging <MenubarShortcut>F5</MenubarShortcut>
            </MenubarItem>
            <MenubarItem className="text-xs text-zinc-300 hover:bg-zinc-800 focus:bg-zinc-800">
              Run Without Debugging <MenubarShortcut>⌃F5</MenubarShortcut>
            </MenubarItem>
            <MenubarItem className="text-xs text-zinc-300 hover:bg-zinc-800 focus:bg-zinc-800">
              Stop <MenubarShortcut>⇧F5</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator className="bg-zinc-700" />
            <MenubarItem className="text-xs text-zinc-300 hover:bg-zinc-800 focus:bg-zinc-800">
              Toggle Breakpoint <MenubarShortcut>F9</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        
        <MenubarMenu>
          <MenubarTrigger className="text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 px-2 py-1">
            Terminal
          </MenubarTrigger>
          <MenubarContent className="bg-zinc-900 border-zinc-700">
            <MenubarItem className="text-xs text-zinc-300 hover:bg-zinc-800 focus:bg-zinc-800" onClick={toggleBottomPanel}>
              New Terminal <MenubarShortcut>⌘`</MenubarShortcut>
            </MenubarItem>
            <MenubarItem className="text-xs text-zinc-300 hover:bg-zinc-800 focus:bg-zinc-800" onClick={clearTerminal}>
              Clear Terminal
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        
        <MenubarMenu>
          <MenubarTrigger className="text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 px-2 py-1">
            AI
          </MenubarTrigger>
          <MenubarContent className="bg-zinc-900 border-zinc-700">
            <MenubarItem className="text-xs text-zinc-300 hover:bg-zinc-800 focus:bg-zinc-800" onClick={() => { toggleRightPanel(); setRightPanelTab('ai'); }}>
              Open AI Assistant <MenubarShortcut>⌘I</MenubarShortcut>
            </MenubarItem>
            <MenubarItem className="text-xs text-zinc-300 hover:bg-zinc-800 focus:bg-zinc-800">
              Explain Selection
            </MenubarItem>
            <MenubarItem className="text-xs text-zinc-300 hover:bg-zinc-800 focus:bg-zinc-800">
              Refactor Code
            </MenubarItem>
            <MenubarItem className="text-xs text-zinc-300 hover:bg-zinc-800 focus:bg-zinc-800">
              Generate Tests
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        
        <MenubarMenu>
          <MenubarTrigger className="text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 px-2 py-1">
            Tools
          </MenubarTrigger>
          <MenubarContent className="bg-zinc-900 border-zinc-700">
            <MenubarItem className="text-xs text-zinc-300 hover:bg-zinc-800 focus:bg-zinc-800" onClick={() => { toggleRightPanel(); setRightPanelTab('animation'); }}>
              Animation Timeline
            </MenubarItem>
            <MenubarItem className="text-xs text-zinc-300 hover:bg-zinc-800 focus:bg-zinc-800" onClick={() => { toggleRightPanel(); setRightPanelTab('profiling'); }}>
              Performance Profiler
            </MenubarItem>
            <MenubarSeparator className="bg-zinc-700" />
            <MenubarItem className="text-xs text-zinc-300 hover:bg-zinc-800 focus:bg-zinc-800">
              Settings <MenubarShortcut>⌘,</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        
        <MenubarMenu>
          <MenubarTrigger className="text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 px-2 py-1">
            Help
          </MenubarTrigger>
          <MenubarContent className="bg-zinc-900 border-zinc-700">
            <MenubarItem className="text-xs text-zinc-300 hover:bg-zinc-800 focus:bg-zinc-800">
              Documentation
            </MenubarItem>
            <MenubarItem className="text-xs text-zinc-300 hover:bg-zinc-800 focus:bg-zinc-800">
              Keyboard Shortcuts <MenubarShortcut>⌘K ⌘S</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator className="bg-zinc-700" />
            <MenubarItem className="text-xs text-zinc-300 hover:bg-zinc-800 focus:bg-zinc-800">
              About
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </div>
  );
};

export default MenuBar;
