/**
 * Integration Hub - Central system to connect all IDE components
 * Manages communication between Editor, 3D Viewport, Visual Scripting, Asset Manager, etc.
 */

class IntegrationHub {
  constructor() {
    this.components = new Map();
    this.eventBus = new EventTarget();
    this.state = {
      currentProject: null,
      activeComponent: null,
      assets: new Map(),
      scene: null,
      code: new Map(),
      visualScripts: new Map(),
    };
    
    this.init();
  }

  /**
   * Initialize the integration hub
   */
  init() {
    console.log('🚀 Integration Hub initialized');
    this.loadCurrentProject();
    this.setupGlobalShortcuts();
    this.setupMessageHandlers();
  }

  /**
   * Register a component
   */
  registerComponent(name, component) {
    this.components.set(name, component);
    console.log(`✅ Component registered: ${name}`);
    
    // Notify other components
    this.emit('component:registered', { name, component });
  }

  /**
   * Get a component
   */
  getComponent(name) {
    return this.components.get(name);
  }

  /**
   * Event emitter
   */
  emit(event, data) {
    const customEvent = new CustomEvent(event, { detail: data });
    this.eventBus.dispatchEvent(customEvent);
  }

  /**
   * Event listener
   */
  on(event, callback) {
    this.eventBus.addEventListener(event, (e) => callback(e.detail));
  }

  /**
   * Load current project
   */
  loadCurrentProject() {
    const projectId = localStorage.getItem('currentProject');
    if (!projectId) return;

    const projects = JSON.parse(localStorage.getItem('projects') || '[]');
    const project = projects.find(p => p.id === projectId);
    
    if (project) {
      this.state.currentProject = project;
      this.emit('project:loaded', project);
      console.log('📂 Project loaded:', project.name);
    }
  }

  /**
   * Save current project
   */
  saveCurrentProject() {
    if (!this.state.currentProject) return;

    const projects = JSON.parse(localStorage.getItem('projects') || '[]');
    const index = projects.findIndex(p => p.id === this.state.currentProject.id);
    
    if (index !== -1) {
      projects[index] = this.state.currentProject;
      localStorage.setItem('projects', JSON.stringify(projects));
      this.emit('project:saved', this.state.currentProject);
      console.log('💾 Project saved');
    }
  }

  /**
   * Setup global shortcuts
   */
  setupGlobalShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + S - Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.saveCurrentProject();
        this.showToast('Project saved', 'success');
      }

      // Ctrl/Cmd + Shift + S - Save As
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 's') {
        e.preventDefault();
        this.saveProjectAs();
      }

      // Ctrl/Cmd + O - Open Project
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        window.location.href = 'project-manager.html';
      }

      // Ctrl/Cmd + N - New Project
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        window.location.href = 'project-manager.html';
      }

      // Alt + 1 - Code Editor
      if (e.altKey && e.key === '1') {
        e.preventDefault();
        this.switchToComponent('editor');
      }

      // Alt + 2 - Visual Scripting
      if (e.altKey && e.key === '2') {
        e.preventDefault();
        this.switchToComponent('visual-scripting');
      }

      // Alt + 3 - 3D Viewport
      if (e.altKey && e.key === '3') {
        e.preventDefault();
        this.switchToComponent('3d-viewport');
      }

      // Alt + 4 - Asset Manager
      if (e.altKey && e.key === '4') {
        e.preventDefault();
        this.switchToComponent('asset-manager');
      }
    });
  }

  /**
   * Setup message handlers for cross-component communication
   */
  setupMessageHandlers() {
    // Listen for messages from iframes
    window.addEventListener('message', (event) => {
      const { type, data } = event.data;

      switch (type) {
        case 'asset:selected':
          this.handleAssetSelected(data);
          break;
        case 'code:changed':
          this.handleCodeChanged(data);
          break;
        case 'scene:changed':
          this.handleSceneChanged(data);
          break;
        case 'script:changed':
          this.handleScriptChanged(data);
          break;
      }
    });
  }

  /**
   * Handle asset selected
   */
  handleAssetSelected(asset) {
    console.log('📦 Asset selected:', asset);
    this.emit('asset:selected', asset);

    // If 3D asset, add to scene
    if (asset.type === '3d' && this.state.activeComponent === '3d-viewport') {
      this.addAssetToScene(asset);
    }

    // If texture, apply to selected object
    if (asset.type === 'texture' && this.state.activeComponent === '3d-viewport') {
      this.applyTextureToSelected(asset);
    }
  }

  /**
   * Handle code changed
   */
  handleCodeChanged(data) {
    const { file, code } = data;
    this.state.code.set(file, code);
    
    if (this.state.currentProject) {
      if (!this.state.currentProject.code) {
        this.state.currentProject.code = {};
      }
      this.state.currentProject.code[file] = code;
    }

    this.emit('code:changed', data);
  }

  /**
   * Handle scene changed
   */
  handleSceneChanged(scene) {
    this.state.scene = scene;
    
    if (this.state.currentProject) {
      this.state.currentProject.scene = scene;
    }

    this.emit('scene:changed', scene);
  }

  /**
   * Handle script changed
   */
  handleScriptChanged(script) {
    this.state.visualScripts.set(script.id, script);
    
    if (this.state.currentProject) {
      if (!this.state.currentProject.visualScripts) {
        this.state.currentProject.visualScripts = {};
      }
      this.state.currentProject.visualScripts[script.id] = script;
    }

    this.emit('script:changed', script);
  }

  /**
   * Switch to component
   */
  switchToComponent(componentName) {
    this.state.activeComponent = componentName;
    this.emit('component:switched', componentName);

    // Navigate to component
    const urls = {
      'editor': 'monaco-editor.html',
      'visual-scripting': 'visual-scripting.html',
      '3d-viewport': '3d-viewport.html',
      'asset-manager': 'asset-manager.html',
    };

    if (urls[componentName]) {
      window.location.href = urls[componentName];
    }
  }

  /**
   * Add asset to scene
   */
  addAssetToScene(asset) {
    // Send message to 3D viewport iframe
    const iframe = document.querySelector('iframe[src*="3d-viewport"]');
    if (iframe) {
      iframe.contentWindow.postMessage({
        type: 'add:asset',
        data: asset,
      }, '*');
    }
  }

  /**
   * Apply texture to selected object
   */
  applyTextureToSelected(texture) {
    // Send message to 3D viewport iframe
    const iframe = document.querySelector('iframe[src*="3d-viewport"]');
    if (iframe) {
      iframe.contentWindow.postMessage({
        type: 'apply:texture',
        data: texture,
      }, '*');
    }
  }

  /**
   * Show toast notification
   */
  showToast(message, type = 'info') {
    // Check if toast system exists
    if (typeof window.ToastSystem !== 'undefined') {
      window.ToastSystem.show(message, type);
    } else {
      // Fallback to console
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }

  /**
   * Save project as
   */
  saveProjectAs() {
    const name = prompt('Enter project name:');
    if (!name) return;

    const newProject = {
      ...this.state.currentProject,
      id: `project_${Date.now()}`,
      name,
      created: Date.now(),
    };

    const projects = JSON.parse(localStorage.getItem('projects') || '[]');
    projects.unshift(newProject);
    localStorage.setItem('projects', JSON.stringify(projects));

    this.state.currentProject = newProject;
    localStorage.setItem('currentProject', newProject.id);

    this.showToast('Project saved as: ' + name, 'success');
  }

  /**
   * Export project
   */
  exportProject() {
    if (!this.state.currentProject) {
      this.showToast('No project to export', 'error');
      return;
    }

    const data = JSON.stringify(this.state.currentProject, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.state.currentProject.name}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    this.showToast('Project exported', 'success');
  }

  /**
   * Import project
   */
  importProject(file) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const project = JSON.parse(e.target.result);
        
        // Validate project
        if (!project.id || !project.name) {
          throw new Error('Invalid project file');
        }

        // Add to projects
        const projects = JSON.parse(localStorage.getItem('projects') || '[]');
        projects.unshift(project);
        localStorage.setItem('projects', JSON.stringify(projects));

        this.state.currentProject = project;
        localStorage.setItem('currentProject', project.id);

        this.showToast('Project imported: ' + project.name, 'success');
        this.emit('project:imported', project);
      } catch (error) {
        this.showToast('Error importing project: ' + error.message, 'error');
      }
    };

    reader.readAsText(file);
  }

  /**
   * Get project stats
   */
  getProjectStats() {
    if (!this.state.currentProject) return null;

    return {
      name: this.state.currentProject.name,
      created: this.state.currentProject.created,
      codeFiles: Object.keys(this.state.currentProject.code || {}).length,
      assets: this.state.assets.size,
      visualScripts: Object.keys(this.state.currentProject.visualScripts || {}).length,
      sceneObjects: this.state.scene?.objects?.length || 0,
    };
  }

  /**
   * Run project
   */
  runProject() {
    if (!this.state.currentProject) {
      this.showToast('No project to run', 'error');
      return;
    }

    // Open preview window
    const preview = window.open('', 'preview', 'width=800,height=600');
    
    // Generate HTML
    const html = this.generateProjectHTML();
    preview.document.write(html);
    preview.document.close();

    this.showToast('Project running in preview window', 'success');
  }

  /**
   * Generate project HTML
   */
  generateProjectHTML() {
    const project = this.state.currentProject;
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${project.name}</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
        }
        #app {
            width: 100%;
            height: 100vh;
        }
    </style>
</head>
<body>
    <div id="app"></div>
    
    <script>
        // Project code
        ${Object.values(project.code || {}).join('\n\n')}
        
        // Initialize
        window.addEventListener('DOMContentLoaded', () => {
            console.log('Project loaded: ${project.name}');
            if (typeof init === 'function') {
                init();
            }
        });
    </script>
</body>
</html>
    `;
  }

  /**
   * AI Assistant integration
   */
  async askAI(prompt, context = {}) {
    // Prepare context
    const fullContext = {
      project: this.state.currentProject,
      code: Object.fromEntries(this.state.code),
      scene: this.state.scene,
      ...context,
    };

    const agentType = String(context.agentType || 'coder');
    const supported = new Set(['architect', 'coder', 'research']);
    if (!supported.has(agentType)) {
      const err = new Error(
        `UNKNOWN_AGENT: '${agentType}'. Use: architect, coder, research (ai-dream e character-memory não estão implementados).`
      );
      err.code = 'UNKNOWN_AGENT';
      throw err;
    }

    const payload = {
      input: `${prompt}\n\nContext:\n${JSON.stringify(fullContext, null, 2)}`,
      workspaceId: String(context.workspaceId || 'local'),
      userId: String(context.userId || 'local'),
    };

    const res = await fetch(`/api/agent/${agentType}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message =
        (data && (data.message || data.error)) ? (data.message || data.error) : `HTTP ${res.status}`;
      const err = new Error(message);
      err.code = (data && data.error) ? data.error : 'AI_REQUEST_FAILED';
      err.httpStatus = res.status;
      throw err;
    }

    return {
      response: String(data && data.content ? data.content : ''),
      suggestions: [],
      metadata: data && data.metadata ? data.metadata : undefined,
    };
  }

  /**
   * Collaboration features
   */
  shareProject() {
    if (!this.state.currentProject) {
      this.showToast('No project to share', 'error');
      return;
    }

    // real-or-fail: não gerar links “fake” sem backend/endpoint real.
    this.showToast('Share não implementado (NOT_IMPLEMENTED).', 'error');
    throw Object.assign(new Error('NOT_IMPLEMENTED: shareProject requer um endpoint backend real.'), {
      code: 'NOT_IMPLEMENTED',
    });
  }

  /**
   * Analytics
   */
  trackEvent(event, data = {}) {
    console.log('📊 Analytics:', event, data);
    
    // In production, send to analytics service
    if (window.gtag) {
      window.gtag('event', event, data);
    }
  }
}

// Create global instance
window.IntegrationHub = new IntegrationHub();

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { IntegrationHub };
}
