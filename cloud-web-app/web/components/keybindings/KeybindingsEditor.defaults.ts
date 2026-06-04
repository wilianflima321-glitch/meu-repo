import type { Keybinding } from './KeybindingsEditor'

export const DEFAULT_KEYBINDINGS: Keybinding[] = [
  // File
  { id: 'file.new', command: 'file.newFile', label: 'New File', keybinding: 'Ctrl+N', defaultKeybinding: 'Ctrl+N', category: 'File', source: 'default' },
  { id: 'file.open', command: 'file.openFile', label: 'Open File', keybinding: 'Ctrl+O', defaultKeybinding: 'Ctrl+O', category: 'File', source: 'default' },
  { id: 'file.save', command: 'file.save', label: 'Save', keybinding: 'Ctrl+S', defaultKeybinding: 'Ctrl+S', category: 'File', source: 'default' },
  { id: 'file.saveAs', command: 'file.saveAs', label: 'Save As', keybinding: 'Ctrl+Shift+S', defaultKeybinding: 'Ctrl+Shift+S', category: 'File', source: 'default' },
  { id: 'file.saveAll', command: 'file.saveAll', label: 'Save All', keybinding: 'Ctrl+K S', defaultKeybinding: 'Ctrl+K S', category: 'File', source: 'default' },
  { id: 'file.close', command: 'file.closeTab', label: 'Close Tab', keybinding: 'Ctrl+W', defaultKeybinding: 'Ctrl+W', category: 'File', source: 'default' },
  { id: 'file.closeAll', command: 'file.closeAllTabs', label: 'Close All Tabs', keybinding: 'Ctrl+K Ctrl+W', defaultKeybinding: 'Ctrl+K Ctrl+W', category: 'File', source: 'default' },

  // Edit
  { id: 'edit.undo', command: 'edit.undo', label: 'Undo', keybinding: 'Ctrl+Z', defaultKeybinding: 'Ctrl+Z', category: 'Edit', source: 'default' },
  { id: 'edit.redo', command: 'edit.redo', label: 'Redo', keybinding: 'Ctrl+Y', defaultKeybinding: 'Ctrl+Y', category: 'Edit', source: 'default' },
  { id: 'edit.cut', command: 'edit.cut', label: 'Cut', keybinding: 'Ctrl+X', defaultKeybinding: 'Ctrl+X', category: 'Edit', source: 'default' },
  { id: 'edit.copy', command: 'edit.copy', label: 'Copy', keybinding: 'Ctrl+C', defaultKeybinding: 'Ctrl+C', category: 'Edit', source: 'default' },
  { id: 'edit.paste', command: 'edit.paste', label: 'Paste', keybinding: 'Ctrl+V', defaultKeybinding: 'Ctrl+V', category: 'Edit', source: 'default' },
  { id: 'edit.selectAll', command: 'edit.selectAll', label: 'Select All', keybinding: 'Ctrl+A', defaultKeybinding: 'Ctrl+A', category: 'Edit', source: 'default' },
  { id: 'edit.find', command: 'edit.find', label: 'Find', keybinding: 'Ctrl+F', defaultKeybinding: 'Ctrl+F', category: 'Edit', source: 'default' },
  { id: 'edit.replace', command: 'edit.replace', label: 'Replace', keybinding: 'Ctrl+H', defaultKeybinding: 'Ctrl+H', category: 'Edit', source: 'default' },
  { id: 'edit.findInFiles', command: 'edit.findInFiles', label: 'Find in Files', keybinding: 'Ctrl+Shift+F', defaultKeybinding: 'Ctrl+Shift+F', category: 'Edit', source: 'default' },
  { id: 'edit.toggleComment', command: 'edit.toggleComment', label: 'Toggle Line Comment', keybinding: 'Ctrl+/', defaultKeybinding: 'Ctrl+/', category: 'Edit', source: 'default' },
  { id: 'edit.blockComment', command: 'edit.blockComment', label: 'Toggle Block Comment', keybinding: 'Ctrl+Shift+/', defaultKeybinding: 'Ctrl+Shift+/', category: 'Edit', source: 'default' },
  { id: 'edit.format', command: 'edit.formatDocument', label: 'Format Document', keybinding: 'Shift+Alt+F', defaultKeybinding: 'Shift+Alt+F', category: 'Edit', source: 'default' },
  { id: 'edit.deleteLine', command: 'edit.deleteLine', label: 'Delete Line', keybinding: 'Ctrl+Shift+K', defaultKeybinding: 'Ctrl+Shift+K', category: 'Edit', source: 'default' },
  { id: 'edit.duplicateLine', command: 'edit.duplicateLine', label: 'Duplicate Line', keybinding: 'Shift+Alt+Down', defaultKeybinding: 'Shift+Alt+Down', category: 'Edit', source: 'default' },
  { id: 'edit.moveLine', command: 'edit.moveLine', label: 'Move Line Up', keybinding: 'Alt+Up', defaultKeybinding: 'Alt+Up', category: 'Edit', source: 'default' },

  // View
  { id: 'view.commandPalette', command: 'view.commandPalette', label: 'Command Palette', keybinding: 'Ctrl+Shift+P', defaultKeybinding: 'Ctrl+Shift+P', category: 'View', source: 'default' },
  { id: 'view.quickOpen', command: 'view.quickOpen', label: 'Quick Open', keybinding: 'Ctrl+P', defaultKeybinding: 'Ctrl+P', category: 'View', source: 'default' },
  { id: 'view.explorer', command: 'view.explorer', label: 'Show Explorer', keybinding: 'Ctrl+Shift+E', defaultKeybinding: 'Ctrl+Shift+E', category: 'View', source: 'default' },
  { id: 'view.search', command: 'view.search', label: 'Show Search', keybinding: 'Ctrl+Shift+F', defaultKeybinding: 'Ctrl+Shift+F', category: 'View', source: 'default' },
  { id: 'view.git', command: 'view.git', label: 'Show Source Control', keybinding: 'Ctrl+Shift+G', defaultKeybinding: 'Ctrl+Shift+G', category: 'View', source: 'default' },
  { id: 'view.debug', command: 'view.debug', label: 'Show Debug', keybinding: 'Ctrl+Shift+D', defaultKeybinding: 'Ctrl+Shift+D', category: 'View', source: 'default' },
  { id: 'view.extensions', command: 'view.extensions', label: 'Show Extensions', keybinding: 'Ctrl+Shift+X', defaultKeybinding: 'Ctrl+Shift+X', category: 'View', source: 'default' },
  { id: 'view.terminal', command: 'view.terminal', label: 'Toggle Terminal', keybinding: 'Ctrl+`', defaultKeybinding: 'Ctrl+`', category: 'View', source: 'default' },
  { id: 'view.problems', command: 'view.problems', label: 'Show Problems', keybinding: 'Ctrl+Shift+M', defaultKeybinding: 'Ctrl+Shift+M', category: 'View', source: 'default' },
  { id: 'view.sidebar', command: 'view.sidebar', label: 'Toggle Sidebar', keybinding: 'Ctrl+B', defaultKeybinding: 'Ctrl+B', category: 'View', source: 'default' },
  { id: 'view.panel', command: 'view.panel', label: 'Toggle Panel', keybinding: 'Ctrl+J', defaultKeybinding: 'Ctrl+J', category: 'View', source: 'default' },
  { id: 'view.fullscreen', command: 'view.fullscreen', label: 'Toggle Full Screen', keybinding: 'F11', defaultKeybinding: 'F11', category: 'View', source: 'default' },
  { id: 'view.zoomIn', command: 'view.zoomIn', label: 'Zoom In', keybinding: 'Ctrl+=', defaultKeybinding: 'Ctrl+=', category: 'View', source: 'default' },
  { id: 'view.zoomOut', command: 'view.zoomOut', label: 'Zoom Out', keybinding: 'Ctrl+-', defaultKeybinding: 'Ctrl+-', category: 'View', source: 'default' },
  { id: 'view.resetZoom', command: 'view.resetZoom', label: 'Reset Zoom', keybinding: 'Ctrl+0', defaultKeybinding: 'Ctrl+0', category: 'View', source: 'default' },

  // Go
  { id: 'go.definition', command: 'go.definition', label: 'Go to Definition', keybinding: 'F12', defaultKeybinding: 'F12', category: 'Go', source: 'default' },
  { id: 'go.declaration', command: 'go.declaration', label: 'Go to Declaration', keybinding: 'Ctrl+F12', defaultKeybinding: 'Ctrl+F12', category: 'Go', source: 'default' },
  { id: 'go.references', command: 'go.references', label: 'Go to References', keybinding: 'Shift+F12', defaultKeybinding: 'Shift+F12', category: 'Go', source: 'default' },
  { id: 'go.line', command: 'go.line', label: 'Go to Line', keybinding: 'Ctrl+G', defaultKeybinding: 'Ctrl+G', category: 'Go', source: 'default' },
  { id: 'go.symbol', command: 'go.symbol', label: 'Go to Symbol', keybinding: 'Ctrl+Shift+O', defaultKeybinding: 'Ctrl+Shift+O', category: 'Go', source: 'default' },
  { id: 'go.back', command: 'go.back', label: 'Go Back', keybinding: 'Alt+Left', defaultKeybinding: 'Alt+Left', category: 'Go', source: 'default' },
  { id: 'go.forward', command: 'go.forward', label: 'Go Forward', keybinding: 'Alt+Right', defaultKeybinding: 'Alt+Right', category: 'Go', source: 'default' },
  { id: 'go.nextError', command: 'go.nextError', label: 'Go to Next Problem', keybinding: 'F8', defaultKeybinding: 'F8', category: 'Go', source: 'default' },
  { id: 'go.prevError', command: 'go.prevError', label: 'Go to Previous Problem', keybinding: 'Shift+F8', defaultKeybinding: 'Shift+F8', category: 'Go', source: 'default' },

  // Debug
  { id: 'debug.start', command: 'debug.start', label: 'Start Debugging', keybinding: 'F5', defaultKeybinding: 'F5', category: 'Debug', source: 'default' },
  { id: 'debug.startWithout', command: 'debug.startWithout', label: 'Start Without Debugging', keybinding: 'Ctrl+F5', defaultKeybinding: 'Ctrl+F5', category: 'Debug', source: 'default' },
  { id: 'debug.stop', command: 'debug.stop', label: 'Stop', keybinding: 'Shift+F5', defaultKeybinding: 'Shift+F5', category: 'Debug', source: 'default' },
  { id: 'debug.restart', command: 'debug.restart', label: 'Restart', keybinding: 'Ctrl+Shift+F5', defaultKeybinding: 'Ctrl+Shift+F5', category: 'Debug', source: 'default' },
  { id: 'debug.breakpoint', command: 'debug.breakpoint', label: 'Toggle Breakpoint', keybinding: 'F9', defaultKeybinding: 'F9', category: 'Debug', source: 'default' },
  { id: 'debug.stepOver', command: 'debug.stepOver', label: 'Step Over', keybinding: 'F10', defaultKeybinding: 'F10', category: 'Debug', source: 'default' },
  { id: 'debug.stepInto', command: 'debug.stepInto', label: 'Step Into', keybinding: 'F11', defaultKeybinding: 'F11', when: 'debuggingActive', category: 'Debug', source: 'default' },
  { id: 'debug.stepOut', command: 'debug.stepOut', label: 'Step Out', keybinding: 'Shift+F11', defaultKeybinding: 'Shift+F11', category: 'Debug', source: 'default' },
  { id: 'debug.continue', command: 'debug.continue', label: 'Continue', keybinding: 'F5', defaultKeybinding: 'F5', when: 'debuggingActive', category: 'Debug', source: 'default' },

  // Terminal
  { id: 'terminal.new', command: 'terminal.new', label: 'New Terminal', keybinding: 'Ctrl+Shift+`', defaultKeybinding: 'Ctrl+Shift+`', category: 'Terminal', source: 'default' },
  { id: 'terminal.split', command: 'terminal.split', label: 'Split Terminal', keybinding: 'Ctrl+Shift+5', defaultKeybinding: 'Ctrl+Shift+5', category: 'Terminal', source: 'default' },
  { id: 'terminal.clear', command: 'terminal.clear', label: 'Clear Terminal', keybinding: null, defaultKeybinding: null, category: 'Terminal', source: 'default' },
  { id: 'terminal.kill', command: 'terminal.kill', label: 'Kill Terminal', keybinding: null, defaultKeybinding: null, category: 'Terminal', source: 'default' },

  // Engine
  { id: 'engine.play', command: 'engine.play', label: 'Play in Editor', keybinding: 'Alt+P', defaultKeybinding: 'Alt+P', category: 'Engine', source: 'default' },
  { id: 'engine.stop', command: 'engine.stop', label: 'Stop Playing', keybinding: 'Escape', defaultKeybinding: 'Escape', when: 'enginePlaying', category: 'Engine', source: 'default' },
  { id: 'engine.pause', command: 'engine.pause', label: 'Pause', keybinding: 'Alt+Pause', defaultKeybinding: 'Alt+Pause', category: 'Engine', source: 'default' },
  { id: 'engine.build', command: 'engine.build', label: 'Build Project', keybinding: 'Ctrl+Shift+B', defaultKeybinding: 'Ctrl+Shift+B', category: 'Engine', source: 'default' },
  { id: 'engine.rebuild', command: 'engine.rebuild', label: 'Rebuild Project', keybinding: 'Ctrl+Shift+Alt+B', defaultKeybinding: 'Ctrl+Shift+Alt+B', category: 'Engine', source: 'default' },

  // AI
  { id: 'ai.chat', command: 'ai.openChat', label: 'Open AI Chat', keybinding: 'Ctrl+Shift+I', defaultKeybinding: 'Ctrl+Shift+I', category: 'AI', source: 'default' },
  { id: 'ai.inlineCompletion', command: 'ai.triggerInline', label: 'Trigger Inline Completion', keybinding: 'Ctrl+Space', defaultKeybinding: 'Ctrl+Space', category: 'AI', source: 'default' },
  { id: 'ai.acceptSuggestion', command: 'ai.acceptSuggestion', label: 'Accept AI Suggestion', keybinding: 'Tab', defaultKeybinding: 'Tab', when: 'aiSuggestionVisible', category: 'AI', source: 'default' },
  { id: 'ai.rejectSuggestion', command: 'ai.rejectSuggestion', label: 'Reject AI Suggestion', keybinding: 'Escape', defaultKeybinding: 'Escape', when: 'aiSuggestionVisible', category: 'AI', source: 'default' },
  { id: 'ai.explainCode', command: 'ai.explainCode', label: 'Explain Code', keybinding: 'Ctrl+Shift+E', defaultKeybinding: 'Ctrl+Shift+E', when: 'editorHasSelection', category: 'AI', source: 'default' },
  { id: 'ai.fixErrors', command: 'ai.fixErrors', label: 'Fix Errors with AI', keybinding: 'Ctrl+.', defaultKeybinding: 'Ctrl+.', when: 'editorHasProblems', category: 'AI', source: 'default' },

  // Preferences
  { id: 'pref.settings', command: 'preferences.settings', label: 'Open Settings', keybinding: 'Ctrl+,', defaultKeybinding: 'Ctrl+,', category: 'Preferences', source: 'default' },
  { id: 'pref.keybindings', command: 'preferences.keybindings', label: 'Keyboard Shortcuts', keybinding: 'Ctrl+K Ctrl+S', defaultKeybinding: 'Ctrl+K Ctrl+S', category: 'Preferences', source: 'default' },
  { id: 'pref.theme', command: 'preferences.colorTheme', label: 'Color Theme', keybinding: 'Ctrl+K Ctrl+T', defaultKeybinding: 'Ctrl+K Ctrl+T', category: 'Preferences', source: 'default' },
]
