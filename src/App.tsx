import React, { useState, useEffect } from 'react';
import { EventBus } from './services/EventBus';
import { ThemeService } from './services/ThemeService';
import { WorkspaceService } from './services/WorkspaceService';
import { SettingsService } from './services/SettingsService';

// Layout Components
import { ActivityBar } from './components/ActivityBar';
import { Sidebar } from './components/Sidebar';
import { EditorArea } from './components/EditorArea';
import { PanelArea } from './components/PanelArea';
import { StatusBar } from './components/StatusBar';
import { CommandPalette } from './components/CommandPalette';
import { NotificationToast } from './components/NotificationToast';

export const App: React.FC = () => {
  const [theme, setTheme] = useState('dark');
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [panelVisible, setPanelVisible] = useState(true);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [activeView, setActiveView] = useState<'explorer' | 'search' | 'git' | 'debug' | 'extensions'>('explorer');

  useEffect(() => {
    initializeApp();
    setupEventListeners();
    setupKeyboardShortcuts();

    return () => {
      cleanupEventListeners();
    };
  }, []);

  const initializeApp = async () => {
    const themeService = ThemeService.getInstance();
    const settingsService = SettingsService.getInstance();
    const workspaceService = WorkspaceService.getInstance();

    // Load theme
    const savedTheme = settingsService.getSetting('workbench.colorTheme') || 'dark';
    themeService.setTheme(savedTheme);
    setTheme(savedTheme);

    // Load workspace if exists
    const lastWorkspace = settingsService.getSetting('workspace.lastOpened');
    if (lastWorkspace) {
      try {
        await workspaceService.openWorkspace(lastWorkspace);
      } catch (error) {
        console.error('Failed to open last workspace:', error);
      }
    }

    // Apply initial settings
    applySettings();
  };

  const setupEventListeners = () => {
    const eventBus = EventBus.getInstance();

    eventBus.subscribe('view:toggleSidebar', () => {
      setSidebarVisible(prev => !prev);
    });

    eventBus.subscribe('view:togglePanel', () => {
      setPanelVisible(prev => !prev);
    });

    eventBus.subscribe('view:showExplorer', () => {
      setActiveView('explorer');
      setSidebarVisible(true);
    });

    eventBus.subscribe('view:showSearch', () => {
      setActiveView('search');
      setSidebarVisible(true);
    });

    eventBus.subscribe('view:showGit', () => {
      setActiveView('git');
      setSidebarVisible(true);
    });

    eventBus.subscribe('view:showDebug', () => {
      setActiveView('debug');
      setSidebarVisible(true);
    });

    eventBus.subscribe('view:showExtensions', () => {
      setActiveView('extensions');
      setSidebarVisible(true);
    });

    eventBus.subscribe('theme:changed', (data: { theme: string }) => {
      setTheme(data.theme);
      applyTheme(data.theme);
    });

    eventBus.subscribe('commandPalette:toggle', () => {
      setCommandPaletteOpen(prev => !prev);
    });
  };

  const cleanupEventListeners = () => {
    // Event listeners are automatically cleaned up by EventBus
  };

  const setupKeyboardShortcuts = () => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command Palette: Ctrl+Shift+P or F1
      if ((e.ctrlKey && e.shiftKey && e.key === 'P') || e.key === 'F1') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }

      // Quick Open: Ctrl+P
      if (e.ctrlKey && !e.shiftKey && e.key === 'p') {
        e.preventDefault();
        EventBus.getInstance().emit('quickOpen:toggle', {});
      }

      // Toggle Sidebar: Ctrl+B
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        setSidebarVisible(prev => !prev);
      }

      // Toggle Panel: Ctrl+J
      if (e.ctrlKey && e.key === 'j') {
        e.preventDefault();
        setPanelVisible(prev => !prev);
      }

      // Toggle Terminal: Ctrl+`
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault();
        EventBus.getInstance().emit('terminal:toggle', {});
      }

      // Save: Ctrl+S
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        EventBus.getInstance().emit('editor:save', {});
      }

      // Find: Ctrl+F
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        EventBus.getInstance().emit('search:open', {});
      }

      // Replace: Ctrl+H
      if (e.ctrlKey && e.key === 'h') {
        e.preventDefault();
        EventBus.getInstance().emit('search:replace', {});
      }

      // Settings: Ctrl+,
      if (e.ctrlKey && e.key === ',') {
        e.preventDefault();
        EventBus.getInstance().emit('settings:open', {});
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  };

  const applySettings = () => {
    const settingsService = SettingsService.getInstance();

    // Apply font settings
    const fontSize = settingsService.getSetting('editor.fontSize') || 14;
    const fontFamily = settingsService.getSetting('editor.fontFamily') || 'Consolas, monospace';
    
    document.documentElement.style.setProperty('--vscode-editor-font-size', `${fontSize}px`);
    document.documentElement.style.setProperty('--vscode-editor-font-family', fontFamily);

    // Apply other settings
    const lineHeight = settingsService.getSetting('editor.lineHeight') || 1.5;
    document.documentElement.style.setProperty('--vscode-editor-line-height', `${lineHeight}`);
  };

  const applyTheme = (themeName: string) => {
    const themeService = ThemeService.getInstance();
    const themeColors = themeService.getThemeColors(themeName);

    // Apply theme colors to CSS variables
    Object.entries(themeColors).forEach(([key, value]) => {
      document.documentElement.style.setProperty(`--vscode-${key}`, value);
    });
  };

  return (
    <div className={`app theme-${theme}`}>
      <div className="app-container">
        <ActivityBar activeView={activeView} onViewChange={setActiveView} />
        
        {sidebarVisible && (
          <Sidebar activeView={activeView} />
        )}

        <div className="main-area">
          <EditorArea />
          
          {panelVisible && (
            <PanelArea />
          )}
        </div>
      </div>

      <StatusBar />

      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />

      <NotificationToast />

      <style jsx>{`
        .app {
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          background: var(--vscode-editor-background);
          color: var(--vscode-editor-foreground);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        }

        .app-container {
          display: flex;
          height: calc(100vh - 22px);
        }

        .main-area {
          display: flex;
          flex-direction: column;
          flex: 1;
          overflow: hidden;
        }

        /* Theme Variables - Dark */
        .theme-dark {
          --vscode-editor-background: #1e1e1e;
          --vscode-editor-foreground: #d4d4d4;
          --vscode-sideBar-background: #252526;
          --vscode-sideBar-foreground: #cccccc;
          --vscode-sideBarSectionHeader-background: #2d2d30;
          --vscode-activityBar-background: #333333;
          --vscode-activityBar-foreground: #ffffff;
          --vscode-panel-background: #1e1e1e;
          --vscode-panel-border: #2d2d30;
          --vscode-statusBar-background: #007acc;
          --vscode-statusBar-foreground: #ffffff;
          --vscode-editorGroupHeader-tabsBackground: #252526;
          --vscode-editorGroupHeader-tabsBorder: #2d2d30;
          --vscode-tab-activeBackground: #1e1e1e;
          --vscode-tab-activeForeground: #ffffff;
          --vscode-tab-inactiveBackground: #2d2d30;
          --vscode-tab-inactiveForeground: #969696;
          --vscode-tab-border: #2d2d30;
          --vscode-tab-activeBorder: #007acc;
          --vscode-tab-hoverBackground: #2d2d30;
          --vscode-input-background: #3c3c3c;
          --vscode-input-foreground: #cccccc;
          --vscode-input-border: #3c3c3c;
          --vscode-button-background: #0e639c;
          --vscode-button-foreground: #ffffff;
          --vscode-button-hoverBackground: #1177bb;
          --vscode-button-secondaryBackground: #3a3d41;
          --vscode-button-secondaryForeground: #cccccc;
          --vscode-button-secondaryHoverBackground: #45494e;
          --vscode-button-border: #3c3c3c;
          --vscode-list-activeSelectionBackground: #094771;
          --vscode-list-activeSelectionForeground: #ffffff;
          --vscode-list-hoverBackground: #2a2d2e;
          --vscode-focusBorder: #007acc;
          --vscode-descriptionForeground: #969696;
          --vscode-errorForeground: #f48771;
          --vscode-errorBackground: #5a1d1d;
          --vscode-menu-background: #252526;
          --vscode-menu-foreground: #cccccc;
          --vscode-menu-selectionBackground: #094771;
          --vscode-menu-selectionForeground: #ffffff;
          --vscode-menu-border: #454545;
          --vscode-menu-separatorBackground: #454545;
          --vscode-toolbar-hoverBackground: #2d2d30;
          --vscode-badge-background: #4d4d4d;
          --vscode-badge-foreground: #ffffff;
          --vscode-quickInput-background: #252526;
          --vscode-quickInput-border: #454545;
          --vscode-editorLineNumber-foreground: #858585;
          --vscode-editor-hoverHighlightBackground: #264f78;
          --vscode-editor-selectionBackground: #264f78;
          --vscode-editorHoverWidget-background: #252526;
          --vscode-editorHoverWidget-border: #454545;
          --vscode-diffEditor-insertedTextBackground: rgba(155, 185, 85, 0.2);
          --vscode-diffEditor-removedTextBackground: rgba(255, 0, 0, 0.2);
          --vscode-diffEditor-border: #454545;
          --vscode-diffEditor-unchangedRegionBackground: #2d2d30;
          --vscode-gitDecoration-modifiedResourceForeground: #e2c08d;
          --vscode-gitDecoration-addedResourceForeground: #81b88b;
          --vscode-gitDecoration-deletedResourceForeground: #c74e39;
          --vscode-gitDecoration-renamedResourceForeground: #73c991;
          --vscode-gitDecoration-untrackedResourceForeground: #73c991;
          --vscode-terminal-background: #1e1e1e;
          --vscode-terminal-foreground: #cccccc;
          --vscode-terminal-ansiBlack: #000000;
          --vscode-terminal-ansiRed: #cd3131;
          --vscode-terminal-ansiGreen: #0dbc79;
          --vscode-terminal-ansiYellow: #e5e510;
          --vscode-terminal-ansiBlue: #2472c8;
          --vscode-terminal-ansiMagenta: #bc3fbc;
          --vscode-terminal-ansiCyan: #11a8cd;
          --vscode-terminal-ansiWhite: #e5e5e5;
          --vscode-debugTokenExpression-name: #c586c0;
          --vscode-debugTokenExpression-value: #cccccc;
          --vscode-debugTokenExpression-string: #ce9178;
          --vscode-debugTokenExpression-number: #b5cea8;
          --vscode-debugTokenExpression-boolean: #569cd6;
          --vscode-keybindingLabel-background: #2d2d30;
          --vscode-keybindingLabel-foreground: #cccccc;
          --vscode-keybindingLabel-border: #3c3c3c;
          --vscode-dropdown-background: #3c3c3c;
          --vscode-dropdown-foreground: #cccccc;
          --vscode-dropdown-border: #3c3c3c;
        }

        /* Theme Variables - Light */
        .theme-light {
          --vscode-editor-background: #ffffff;
          --vscode-editor-foreground: #000000;
          --vscode-sideBar-background: #f3f3f3;
          --vscode-sideBar-foreground: #000000;
          --vscode-sideBarSectionHeader-background: #e7e7e7;
          --vscode-activityBar-background: #2c2c2c;
          --vscode-activityBar-foreground: #ffffff;
          --vscode-panel-background: #ffffff;
          --vscode-panel-border: #e7e7e7;
          --vscode-statusBar-background: #007acc;
          --vscode-statusBar-foreground: #ffffff;
          --vscode-editorGroupHeader-tabsBackground: #f3f3f3;
          --vscode-editorGroupHeader-tabsBorder: #e7e7e7;
          --vscode-tab-activeBackground: #ffffff;
          --vscode-tab-activeForeground: #000000;
          --vscode-tab-inactiveBackground: #ececec;
          --vscode-tab-inactiveForeground: #6c6c6c;
          --vscode-tab-border: #e7e7e7;
          --vscode-tab-activeBorder: #007acc;
          --vscode-tab-hoverBackground: #ececec;
          --vscode-input-background: #ffffff;
          --vscode-input-foreground: #000000;
          --vscode-input-border: #cecece;
          --vscode-button-background: #007acc;
          --vscode-button-foreground: #ffffff;
          --vscode-button-hoverBackground: #0062a3;
          --vscode-button-secondaryBackground: #e7e7e7;
          --vscode-button-secondaryForeground: #000000;
          --vscode-button-secondaryHoverBackground: #d7d7d7;
          --vscode-button-border: #cecece;
          --vscode-list-activeSelectionBackground: #0060c0;
          --vscode-list-activeSelectionForeground: #ffffff;
          --vscode-list-hoverBackground: #e8e8e8;
          --vscode-focusBorder: #007acc;
          --vscode-descriptionForeground: #6c6c6c;
          --vscode-errorForeground: #e51400;
          --vscode-errorBackground: #ffeaea;
          --vscode-menu-background: #ffffff;
          --vscode-menu-foreground: #000000;
          --vscode-menu-selectionBackground: #0060c0;
          --vscode-menu-selectionForeground: #ffffff;
          --vscode-menu-border: #cecece;
          --vscode-menu-separatorBackground: #cecece;
          --vscode-toolbar-hoverBackground: #e7e7e7;
          --vscode-badge-background: #c4c4c4;
          --vscode-badge-foreground: #000000;
          --vscode-quickInput-background: #ffffff;
          --vscode-quickInput-border: #cecece;
          --vscode-editorLineNumber-foreground: #237893;
          --vscode-editor-hoverHighlightBackground: #add6ff;
          --vscode-editor-selectionBackground: #add6ff;
          --vscode-editorHoverWidget-background: #f3f3f3;
          --vscode-editorHoverWidget-border: #cecece;
          --vscode-diffEditor-insertedTextBackground: rgba(155, 185, 85, 0.3);
          --vscode-diffEditor-removedTextBackground: rgba(255, 0, 0, 0.3);
          --vscode-diffEditor-border: #cecece;
          --vscode-diffEditor-unchangedRegionBackground: #f3f3f3;
          --vscode-gitDecoration-modifiedResourceForeground: #895503;
          --vscode-gitDecoration-addedResourceForeground: #587c0c;
          --vscode-gitDecoration-deletedResourceForeground: #ad0707;
          --vscode-gitDecoration-renamedResourceForeground: #007100;
          --vscode-gitDecoration-untrackedResourceForeground: #007100;
          --vscode-terminal-background: #ffffff;
          --vscode-terminal-foreground: #000000;
          --vscode-terminal-ansiBlack: #000000;
          --vscode-terminal-ansiRed: #cd3131;
          --vscode-terminal-ansiGreen: #00bc00;
          --vscode-terminal-ansiYellow: #949800;
          --vscode-terminal-ansiBlue: #0451a5;
          --vscode-terminal-ansiMagenta: #bc05bc;
          --vscode-terminal-ansiCyan: #0598bc;
          --vscode-terminal-ansiWhite: #555555;
          --vscode-debugTokenExpression-name: #9b46b0;
          --vscode-debugTokenExpression-value: #000000;
          --vscode-debugTokenExpression-string: #a31515;
          --vscode-debugTokenExpression-number: #098658;
          --vscode-debugTokenExpression-boolean: #0000ff;
          --vscode-keybindingLabel-background: #e7e7e7;
          --vscode-keybindingLabel-foreground: #000000;
          --vscode-keybindingLabel-border: #cecece;
          --vscode-dropdown-background: #ffffff;
          --vscode-dropdown-foreground: #000000;
          --vscode-dropdown-border: #cecece;
        }

        /* Global Styles */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        ::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }

        ::-webkit-scrollbar-track {
          background: var(--vscode-editor-background);
        }

        ::-webkit-scrollbar-thumb {
          background: var(--vscode-scrollbarSlider-background, #424242);
          border-radius: 5px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: var(--vscode-scrollbarSlider-hoverBackground, #4f4f4f);
        }
      `}</style>
    </div>
  );
};
