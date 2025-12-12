import React, { useState } from 'react';
import { useIDEStore } from '@/store/ideStore';
import { createProject, getFileTree, getGitStatus, getExtensions, getThemes } from '@/services/api';
import {
  FolderPlus, FileCode, Layout, Rocket, Star, Clock, ArrowRight,
  Code2, Palette, Globe, Database, Smartphone, Server
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const templates = [
  { id: 'react', name: 'React', icon: Code2, color: 'text-cyan-400', description: 'React 18 with hooks' },
  { id: 'node', name: 'Node.js', icon: Server, color: 'text-green-400', description: 'Express.js server' },
  { id: 'python', name: 'Python', icon: FileCode, color: 'text-yellow-400', description: 'Python project' },
  { id: 'nextjs', name: 'Next.js', icon: Globe, color: 'text-white', description: 'Full-stack React' },
  { id: 'vue', name: 'Vue 3', icon: Palette, color: 'text-emerald-400', description: 'Vue composition API' },
  { id: 'mobile', name: 'React Native', icon: Smartphone, color: 'text-purple-400', description: 'Mobile app' },
];

const WelcomeScreen = ({ onProjectOpen }) => {
  const { setCurrentProject, setFileTree, setGitStatus, setGitChanges, setExtensions, setThemes } = useIDEStore();
  const [showNewProject, setShowNewProject] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('react');
  const [loading, setLoading] = useState(false);
  
  const recentProjects = [
    { name: 'my-app', path: '/projects/my-app', date: '2 hours ago' },
    { name: 'api-server', path: '/projects/api-server', date: 'Yesterday' },
    { name: 'dashboard', path: '/projects/dashboard', date: '3 days ago' },
  ];
  
  const handleCreateProject = async () => {
    if (!projectName.trim()) return;
    setLoading(true);
    
    try {
      const response = await createProject({
        name: projectName,
        template: selectedTemplate
      });
      
      setCurrentProject(response.data.project);
      
      // Load file tree
      const treeResponse = await getFileTree(response.data.project.id);
      setFileTree(treeResponse.data);
      
      // Load git status
      try {
        const gitResponse = await getGitStatus(response.data.project.id);
        setGitStatus(gitResponse.data);
        setGitChanges(gitResponse.data.changes || []);
      } catch (e) { /* ignore */ }
      
      // Load extensions
      const extResponse = await getExtensions();
      setExtensions(extResponse.data);
      
      // Load themes
      const themesResponse = await getThemes();
      setThemes(themesResponse.data);
      
      setShowNewProject(false);
      setProjectName('');
      onProjectOpen?.();
    } catch (err) {
      console.error('Failed to create project:', err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800">
      <div className="max-w-4xl w-full px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <Rocket className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">AI IDE Platform</h1>
          <p className="text-zinc-400">The most powerful IDE for modern development</p>
        </div>
        
        {/* Actions */}
        <div className="grid grid-cols-2 gap-6 mb-12">
          <button
            onClick={() => setShowNewProject(true)}
            className="flex items-center gap-4 p-6 bg-zinc-800/50 rounded-xl border border-zinc-700 hover:border-blue-500 hover:bg-zinc-800 transition-all group"
            data-testid="new-project-btn"
          >
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
              <FolderPlus className="w-6 h-6 text-blue-400" />
            </div>
            <div className="text-left">
              <div className="text-white font-semibold">New Project</div>
              <div className="text-zinc-500 text-sm">Create from template</div>
            </div>
            <ArrowRight className="w-5 h-5 text-zinc-600 ml-auto group-hover:text-blue-400 transition-colors" />
          </button>
          
          <button
            className="flex items-center gap-4 p-6 bg-zinc-800/50 rounded-xl border border-zinc-700 hover:border-purple-500 hover:bg-zinc-800 transition-all group"
            data-testid="open-folder-btn"
          >
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
              <Layout className="w-6 h-6 text-purple-400" />
            </div>
            <div className="text-left">
              <div className="text-white font-semibold">Open Folder</div>
              <div className="text-zinc-500 text-sm">Open existing project</div>
            </div>
            <ArrowRight className="w-5 h-5 text-zinc-600 ml-auto group-hover:text-purple-400 transition-colors" />
          </button>
        </div>
        
        {/* Recent Projects */}
        <div>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Recent Projects
          </h2>
          <div className="space-y-2">
            {recentProjects.map((project, i) => (
              <button
                key={i}
                className="w-full flex items-center gap-4 p-4 bg-zinc-800/30 rounded-lg hover:bg-zinc-800/60 transition-colors group"
                data-testid={`recent-project-${i}`}
              >
                <FileCode className="w-5 h-5 text-zinc-500" />
                <div className="text-left flex-1">
                  <div className="text-white font-medium">{project.name}</div>
                  <div className="text-zinc-600 text-xs">{project.path}</div>
                </div>
                <div className="text-zinc-600 text-xs">{project.date}</div>
                <Star className="w-4 h-4 text-zinc-700 opacity-0 group-hover:opacity-100 hover:text-yellow-400 transition-all" />
              </button>
            ))}
          </div>
        </div>
        
        {/* Footer */}
        <div className="mt-12 text-center text-zinc-600 text-sm">
          <p>Version 2.0.0 • <span className="text-blue-400 cursor-pointer hover:underline">Release Notes</span></p>
        </div>
      </div>
      
      {/* New Project Dialog */}
      <Dialog open={showNewProject} onOpenChange={setShowNewProject}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Create New Project</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Choose a template and name for your project
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Project Name</label>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="my-awesome-project"
                className="bg-zinc-800 border-zinc-700 text-white"
                data-testid="project-name-input"
              />
            </div>
            
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Template</label>
              <div className="grid grid-cols-3 gap-3">
                {templates.map(template => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-lg border transition-all",
                      selectedTemplate === template.id
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
                    )}
                    data-testid={`template-${template.id}`}
                  >
                    <template.icon className={cn("w-8 h-8", template.color)} />
                    <span className="text-white text-sm font-medium">{template.name}</span>
                    <span className="text-zinc-500 text-xs">{template.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewProject(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateProject} disabled={!projectName.trim() || loading} data-testid="create-project-submit">
              {loading ? 'Creating...' : 'Create Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WelcomeScreen;
