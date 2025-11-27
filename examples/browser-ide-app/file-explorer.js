/**
 * File Explorer Component
 * Project file tree navigation
 */

class FileExplorer {
  constructor(containerId = 'file-explorer') {
    this.containerId = containerId;
    this.files = this.loadFiles();
    this.expanded = new Set(['root']);
    this.selectedFile = null;
    this.init();
  }

  /**
   * Load files from current project
   */
  loadFiles() {
    const project = window.IntegrationHub?.state?.currentProject;
    
    if (!project) {
      return this.getDefaultStructure();
    }

    // Build file tree from project
    return this.buildFileTree(project);
  }

  /**
   * Get default file structure
   */
  getDefaultStructure() {
    return {
      id: 'root',
      name: 'Project',
      type: 'folder',
      children: [
        {
          id: 'src',
          name: 'src',
          type: 'folder',
          children: [
            { id: 'main.js', name: 'main.js', type: 'file', language: 'javascript' },
            { id: 'game.js', name: 'game.js', type: 'file', language: 'javascript' },
            { id: 'player.js', name: 'player.js', type: 'file', language: 'javascript' },
          ]
        },
        {
          id: 'assets',
          name: 'assets',
          type: 'folder',
          children: [
            { id: 'player.png', name: 'player.png', type: 'file', language: 'image' },
            { id: 'background.png', name: 'background.png', type: 'file', language: 'image' },
          ]
        },
        {
          id: 'scenes',
          name: 'scenes',
          type: 'folder',
          children: [
            { id: 'level1.json', name: 'level1.json', type: 'file', language: 'json' },
          ]
        },
        { id: 'index.html', name: 'index.html', type: 'file', language: 'html' },
        { id: 'style.css', name: 'style.css', type: 'file', language: 'css' },
        { id: 'README.md', name: 'README.md', type: 'file', language: 'markdown' },
      ]
    };
  }

  /**
   * Build file tree from project
   */
  buildFileTree(project) {
    const tree = {
      id: 'root',
      name: project.name || 'Project',
      type: 'folder',
      children: []
    };

    // Add code files
    if (project.code) {
      const srcFolder = {
        id: 'src',
        name: 'src',
        type: 'folder',
        children: []
      };

      Object.keys(project.code).forEach(filename => {
        srcFolder.children.push({
          id: filename,
          name: filename,
          type: 'file',
          language: this.detectLanguage(filename),
          content: project.code[filename]
        });
      });

      tree.children.push(srcFolder);
    }

    // Add assets
    if (project.assets && project.assets.length > 0) {
      const assetsFolder = {
        id: 'assets',
        name: 'assets',
        type: 'folder',
        children: project.assets.map(asset => ({
          id: asset.id || asset.name,
          name: asset.name,
          type: 'file',
          language: 'image',
          asset: asset
        }))
      };

      tree.children.push(assetsFolder);
    }

    // Add scene
    if (project.scene) {
      tree.children.push({
        id: 'scene.json',
        name: 'scene.json',
        type: 'file',
        language: 'json',
        content: JSON.stringify(project.scene, null, 2)
      });
    }

    return tree;
  }

  /**
   * Detect language from filename
   */
  detectLanguage(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const map = {
      'js': 'javascript',
      'ts': 'typescript',
      'jsx': 'javascript',
      'tsx': 'typescript',
      'py': 'python',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'md': 'markdown',
      'png': 'image',
      'jpg': 'image',
      'jpeg': 'image',
      'gif': 'image',
      'svg': 'image',
    };
    return map[ext] || 'text';
  }

  /**
   * Initialize file explorer
   */
  init() {
    this.render();
    this.attachEventListeners();
    this.listenToProjectChanges();
  }

  /**
   * Render file explorer
   */
  render() {
    let container = document.getElementById(this.containerId);
    
    if (!container) {
      container = document.createElement('div');
      container.id = this.containerId;
      document.body.appendChild(container);
    }

    container.className = 'file-explorer';
    container.innerHTML = `
      <div class="file-explorer-header">
        <span class="file-explorer-title">EXPLORER</span>
        <div class="file-explorer-actions">
          <button class="file-explorer-btn" onclick="window.FileExplorer?.createFile()" title="New File">
            ${this.getIcon('file')}
          </button>
          <button class="file-explorer-btn" onclick="window.FileExplorer?.createFolder()" title="New Folder">
            ${this.getIcon('folder')}
          </button>
          <button class="file-explorer-btn" onclick="window.FileExplorer?.refresh()" title="Refresh">
            ${this.getIcon('refresh')}
          </button>
        </div>
      </div>
      <div class="file-explorer-tree">
        ${this.renderTree(this.files)}
      </div>
    `;

    this.injectStyles();
  }

  /**
   * Render file tree
   */
  renderTree(node, level = 0) {
    if (!node) return '';

    const isExpanded = this.expanded.has(node.id);
    const isSelected = this.selectedFile === node.id;
    const hasChildren = node.children && node.children.length > 0;

    let html = `
      <div class="file-item ${isSelected ? 'selected' : ''}" 
           data-id="${node.id}" 
           data-type="${node.type}"
           style="padding-left: ${level * 16 + 8}px">
        ${hasChildren ? `
          <span class="file-toggle ${isExpanded ? 'expanded' : ''}">
            ${this.getIcon('chevronRight')}
          </span>
        ` : '<span class="file-spacer"></span>'}
        <span class="file-icon">
          ${this.getFileIcon(node)}
        </span>
        <span class="file-name">${node.name}</span>
      </div>
    `;

    if (hasChildren && isExpanded) {
      node.children.forEach(child => {
        html += this.renderTree(child, level + 1);
      });
    }

    return html;
  }

  /**
   * Get file icon
   */
  getFileIcon(node) {
    if (node.type === 'folder') {
      return this.getIcon(this.expanded.has(node.id) ? 'folderOpen' : 'folder');
    }

    const iconMap = {
      'javascript': 'fileCode',
      'typescript': 'fileCode',
      'html': 'fileCode',
      'css': 'fileCode',
      'json': 'fileCode',
      'markdown': 'fileText',
      'image': 'image',
    };

    return this.getIcon(iconMap[node.language] || 'file');
  }

  /**
   * Get icon
   */
  getIcon(name) {
    if (typeof Icons !== 'undefined' && Icons.get) {
      return Icons.get(name, 16);
    }
    return '';
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    container.addEventListener('click', (e) => {
      const item = e.target.closest('.file-item');
      if (!item) return;

      const id = item.dataset.id;
      const type = item.dataset.type;

      // Toggle folder
      if (type === 'folder') {
        const toggle = e.target.closest('.file-toggle');
        if (toggle || e.target.classList.contains('file-icon')) {
          this.toggleFolder(id);
          return;
        }
      }

      // Select file
      this.selectFile(id);
    });
  }

  /**
   * Toggle folder
   */
  toggleFolder(id) {
    if (this.expanded.has(id)) {
      this.expanded.delete(id);
    } else {
      this.expanded.add(id);
    }
    this.render();
  }

  /**
   * Select file
   */
  selectFile(id) {
    this.selectedFile = id;
    this.render();

    // Find file in tree
    const file = this.findFile(this.files, id);
    if (file && file.type === 'file') {
      // Emit event
      if (window.IntegrationHub) {
        window.IntegrationHub.emit('file:selected', file);
      }

      // Open in editor if available
      this.openFile(file);
    }
  }

  /**
   * Find file in tree
   */
  findFile(node, id) {
    if (node.id === id) return node;
    
    if (node.children) {
      for (const child of node.children) {
        const found = this.findFile(child, id);
        if (found) return found;
      }
    }
    
    return null;
  }

  /**
   * Open file in editor
   */
  openFile(file) {
    console.log('Opening file:', file.name);
    
    // If on editor page, load content
    if (window.location.pathname.includes('monaco-editor')) {
      // Send message to editor
      window.postMessage({
        type: 'file:open',
        data: file
      }, '*');
    }
  }

  /**
   * Create file
   */
  createFile() {
    const name = prompt('Enter file name:');
    if (!name) return;

    // Add to current folder or root
    const newFile = {
      id: name,
      name: name,
      type: 'file',
      language: this.detectLanguage(name),
      content: ''
    };

    this.files.children.push(newFile);
    this.render();

    if (window.IntegrationHub) {
      window.IntegrationHub.emit('file:created', newFile);
    }
  }

  /**
   * Create folder
   */
  createFolder() {
    const name = prompt('Enter folder name:');
    if (!name) return;

    const newFolder = {
      id: name,
      name: name,
      type: 'folder',
      children: []
    };

    this.files.children.push(newFolder);
    this.render();

    if (window.IntegrationHub) {
      window.IntegrationHub.emit('folder:created', newFolder);
    }
  }

  /**
   * Refresh
   */
  refresh() {
    this.files = this.loadFiles();
    this.render();
  }

  /**
   * Listen to project changes
   */
  listenToProjectChanges() {
    if (window.IntegrationHub) {
      window.IntegrationHub.on('project:loaded', () => {
        this.refresh();
      });

      window.IntegrationHub.on('file:saved', () => {
        this.refresh();
      });
    }
  }

  /**
   * Inject styles
   */
  injectStyles() {
    if (document.getElementById('file-explorer-styles')) return;

    const style = document.createElement('style');
    style.id = 'file-explorer-styles';
    style.textContent = `
      .file-explorer {
        width: 250px;
        height: 100%;
        background: var(--bg-secondary, #252526);
        border-right: 1px solid var(--border-color, #3e3e42);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .file-explorer-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        border-bottom: 1px solid var(--border-color, #3e3e42);
        background: var(--bg-tertiary, #2d2d30);
      }

      .file-explorer-title {
        font-size: 11px;
        font-weight: 600;
        color: var(--text-secondary, #cccccc);
        letter-spacing: 0.5px;
      }

      .file-explorer-actions {
        display: flex;
        gap: 4px;
      }

      .file-explorer-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        padding: 0;
        background: transparent;
        border: none;
        border-radius: 3px;
        color: var(--text-secondary, #cccccc);
        cursor: pointer;
        transition: all 0.2s;
      }

      .file-explorer-btn:hover {
        background: var(--bg-hover, #2a2d2e);
        color: var(--text-primary, #ffffff);
      }

      .file-explorer-tree {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
      }

      .file-item {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        cursor: pointer;
        user-select: none;
        transition: background 0.1s;
      }

      .file-item:hover {
        background: var(--bg-hover, #2a2d2e);
      }

      .file-item.selected {
        background: var(--primary-color, #007acc);
        color: #ffffff;
      }

      .file-toggle {
        display: flex;
        align-items: center;
        width: 16px;
        height: 16px;
        transition: transform 0.2s;
      }

      .file-toggle.expanded {
        transform: rotate(90deg);
      }

      .file-spacer {
        width: 16px;
      }

      .file-icon {
        display: flex;
        align-items: center;
        color: var(--text-secondary, #cccccc);
      }

      .file-name {
        font-size: 13px;
        color: var(--text-primary, #cccccc);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .file-item.selected .file-name {
        color: #ffffff;
      }

      /* Scrollbar */
      .file-explorer-tree::-webkit-scrollbar {
        width: 10px;
      }

      .file-explorer-tree::-webkit-scrollbar-track {
        background: var(--bg-secondary, #252526);
      }

      .file-explorer-tree::-webkit-scrollbar-thumb {
        background: var(--scrollbar-thumb, #424242);
        border-radius: 5px;
      }

      .file-explorer-tree::-webkit-scrollbar-thumb:hover {
        background: var(--scrollbar-thumb-hover, #4e4e4e);
      }
    `;
    document.head.appendChild(style);
  }
}

// Auto-initialize when DOM is ready (only on editor pages)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const editorPages = ['monaco-editor', 'visual-scripting', '3d-viewport'];
    const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
    
    if (editorPages.includes(currentPage)) {
      window.FileExplorer = new FileExplorer();
    }
  });
} else {
  const editorPages = ['monaco-editor', 'visual-scripting', '3d-viewport'];
  const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
  
  if (editorPages.includes(currentPage)) {
    window.FileExplorer = new FileExplorer();
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FileExplorer };
}
