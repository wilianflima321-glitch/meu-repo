import React, { useEffect } from 'react';
import "@/App.css";
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';
import { useIDEStore } from '@/store/ideStore';
import { getProjects, getExtensions, getThemes, getSnippets, healthCheck } from '@/services/api';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

// IDE Components
import MenuBar from '@/components/ide/MenuBar';
import Sidebar from '@/components/ide/Sidebar';
import Editor from '@/components/ide/Editor';
import BottomPanel from '@/components/ide/BottomPanel';
import RightPanel from '@/components/ide/RightPanel';
import StatusBar from '@/components/ide/StatusBar';
import WelcomeScreen from '@/components/ide/WelcomeScreen';
import CommandPalette from '@/components/ide/CommandPalette';

function App() {
  const {
    currentProject, setProjects, setExtensions, setThemes, setSnippets,
    sidebarCollapsed, bottomPanelOpen, rightPanelOpen
  } = useIDEStore();
  
  // Initialize app
  useEffect(() => {
    const init = async () => {
      try {
        // Health check
        await healthCheck();
        
        // Load initial data
        const [projectsRes, extensionsRes, themesRes, snippetsRes] = await Promise.all([
          getProjects().catch(() => ({ data: [] })),
          getExtensions().catch(() => ({ data: [] })),
          getThemes().catch(() => ({ data: [] })),
          getSnippets().catch(() => ({ data: [] }))
        ]);
        
        setProjects(projectsRes.data);
        setExtensions(extensionsRes.data);
        setThemes(themesRes.data);
        setSnippets(snippetsRes.data);
        
        toast.success('IDE initialized successfully');
      } catch (err) {
        console.error('Failed to initialize:', err);
        toast.error('Failed to connect to backend');
      }
    };
    
    init();
  }, []);
  
  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-white overflow-hidden" data-testid="ide-container">
      {/* Menu Bar */}
      <MenuBar />
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {currentProject ? (
          <Allotment>
            {/* Sidebar */}
            {!sidebarCollapsed && (
              <Allotment.Pane preferredSize={272} minSize={200} maxSize={400}>
                <Sidebar />
              </Allotment.Pane>
            )}
            
            {/* Main Editor Area */}
            <Allotment.Pane>
              <Allotment vertical>
                {/* Editor + Right Panel */}
                <Allotment.Pane>
                  <div className="flex h-full">
                    <div className="flex-1">
                      <Editor />
                    </div>
                    {rightPanelOpen && <RightPanel />}
                  </div>
                </Allotment.Pane>
                
                {/* Bottom Panel */}
                {bottomPanelOpen && (
                  <Allotment.Pane preferredSize={256} minSize={100} maxSize={500}>
                    <BottomPanel />
                  </Allotment.Pane>
                )}
              </Allotment>
            </Allotment.Pane>
          </Allotment>
        ) : (
          <WelcomeScreen />
        )}
      </div>
      
      {/* Status Bar */}
      <StatusBar />
      
      {/* Command Palette */}
      <CommandPalette />
      
      {/* Toast Notifications */}
      <Toaster position="bottom-right" theme="dark" />
    </div>
  );
}

export default App;
