import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';
import { useIDEStore } from '@/store/ideStore';
import * as api from '@/services/api';
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

const IDEPage = () => {
  const { projectId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const {
    currentProject, setCurrentProject, setFileTree, setProjects,
    setExtensions, setThemes, setSnippets, setGitStatus, setGitChanges,
    sidebarCollapsed, bottomPanelOpen, rightPanelOpen
  } = useIDEStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeIDE();
  }, [projectId]);

  const initializeIDE = async () => {
    try {
      // Load initial data
      const [projectsRes, extensionsRes, themesRes, snippetsRes] = await Promise.all([
        api.getProjects().catch(() => ({ data: [] })),
        api.getExtensions().catch(() => ({ data: [] })),
        api.getThemes().catch(() => ({ data: [] })),
        api.getSnippets().catch(() => ({ data: [] }))
      ]);

      setProjects(projectsRes.data);
      setExtensions(extensionsRes.data);
      setThemes(themesRes.data);
      setSnippets(snippetsRes.data);

      // Load specific project if ID provided
      const targetProjectId = projectId || location.state?.projectId;
      if (targetProjectId) {
        const projectRes = await api.getProject(targetProjectId);
        setCurrentProject(projectRes.data);

        // Load file tree
        const treeRes = await api.getFileTree(targetProjectId);
        setFileTree(treeRes.data);

        // Load git status
        try {
          const gitRes = await api.getGitStatus(targetProjectId);
          setGitStatus(gitRes.data);
          setGitChanges(gitRes.data.changes || []);
        } catch (e) { /* ignore */ }
      }

      toast.success('IDE initialized');
    } catch (err) {
      console.error('Failed to initialize IDE:', err);
      toast.error('Failed to load IDE');
    } finally {
      setLoading(false);
    }
  };

  const handleProjectOpen = async () => {
    // Called when a project is created/opened from WelcomeScreen
    // The store is already updated, we just need to refresh
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-500">Loading IDE...</p>
        </div>
      </div>
    );
  }

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
          <WelcomeScreen onProjectOpen={handleProjectOpen} />
        )}
      </div>

      {/* Status Bar */}
      <StatusBar />

      {/* Command Palette */}
      <CommandPalette />
    </div>
  );
};

export default IDEPage;
