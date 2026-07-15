import type { Command, Keybinding, Theme } from './useTheiaSystemsHooks'

export async function loadThemes(): Promise<Theme[]> {
    // Built-in themes
    return [
        {
            id: 'dark-plus',
            name: 'Dark+',
            type: 'dark',
            colors: {
                'editor.background': '#1e1e1e',
                'editor.foreground': '#d4d4d4',
                'activityBar.background': '#333333',
                'sideBar.background': '#252526',
                'statusBar.background': '#007acc',
            },
        },
        {
            id: 'light-plus',
            name: 'Light+',
            type: 'light',
            colors: {
                'editor.background': '#ffffff',
                'editor.foreground': '#000000',
                'activityBar.background': '#2c2c2c',
                'sideBar.background': '#f3f3f3',
                'statusBar.background': '#007acc',
            },
        },
        {
            id: 'high-contrast',
            name: 'High Contrast',
            type: 'high-contrast',
            colors: {
                'editor.background': '#000000',
                'editor.foreground': '#ffffff',
                'activityBar.background': '#000000',
                'sideBar.background': '#000000',
                'statusBar.background': '#000000',
            },
        },
    ];
}

export async function loadTheme(themeId: string): Promise<Theme | null> {
    const themes = await loadThemes();
    return themes.find(t => t.id === themeId) || themes[0];
}

export async function loadKeybindings(): Promise<Keybinding[]> {
    // Load from storage or return defaults
    const stored = localStorage.getItem('keybindings');
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch {
            // Ignore
        }
    }

    // Default keybindings
    return [
        { id: 'kb-1', key: 'Ctrl+S', command: 'file.save', source: 'default' },
        { id: 'kb-2', key: 'Ctrl+Shift+P', command: 'commandPalette.open', source: 'default' },
        { id: 'kb-3', key: 'Ctrl+P', command: 'quickOpen', source: 'default' },
        { id: 'kb-4', key: 'Ctrl+Shift+F', command: 'search.open', source: 'default' },
        { id: 'kb-5', key: 'Ctrl+`', command: 'terminal.toggle', source: 'default' },
        { id: 'kb-6', key: 'Ctrl+B', command: 'sidebar.toggle', source: 'default' },
        { id: 'kb-7', key: 'F5', command: 'debug.start', source: 'default' },
        { id: 'kb-8', key: 'Ctrl+Shift+G', command: 'git.open', source: 'default' },
    ];
}

export async function saveKeybindings(keybindings: Keybinding[]): Promise<void> {
    localStorage.setItem('keybindings', JSON.stringify(keybindings));
}

export async function loadDefaultKeybinding(command: string): Promise<Keybinding | null> {
    const defaults = await loadKeybindings();
    return defaults.find(k => k.command === command) || null;
}

export function buildKeyString(e: KeyboardEvent): string {
    const parts: string[] = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey) parts.push('Alt');
    if (e.metaKey) parts.push('Meta');

    const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
    parts.push(key);

    return parts.join('+');
}

export async function loadCommands(): Promise<Command[]> {
    // Default commands
    return [
        { id: 'file.new', title: 'New File', category: 'File', keybinding: 'Ctrl+N' },
        { id: 'file.open', title: 'Open File', category: 'File', keybinding: 'Ctrl+O' },
        { id: 'file.save', title: 'Save', category: 'File', keybinding: 'Ctrl+S' },
        { id: 'file.saveAll', title: 'Save All', category: 'File', keybinding: 'Ctrl+Shift+S' },
        { id: 'edit.undo', title: 'Undo', category: 'Edit', keybinding: 'Ctrl+Z' },
        { id: 'edit.redo', title: 'Redo', category: 'Edit', keybinding: 'Ctrl+Y' },
        { id: 'edit.find', title: 'Find', category: 'Edit', keybinding: 'Ctrl+F' },
        { id: 'edit.replace', title: 'Replace', category: 'Edit', keybinding: 'Ctrl+H' },
        { id: 'view.terminal', title: 'Toggle Terminal', category: 'View', keybinding: 'Ctrl+`' },
        { id: 'view.sidebar', title: 'Toggle Sidebar', category: 'View', keybinding: 'Ctrl+B' },
        { id: 'view.explorer', title: 'Show Explorer', category: 'View', keybinding: 'Ctrl+Shift+E' },
        { id: 'view.search', title: 'Show Search', category: 'View', keybinding: 'Ctrl+Shift+F' },
        { id: 'view.git', title: 'Show Git', category: 'View', keybinding: 'Ctrl+Shift+G' },
        { id: 'view.debug', title: 'Show Debug', category: 'View', keybinding: 'Ctrl+Shift+D' },
        { id: 'view.extensions', title: 'Show Extensions', category: 'View', keybinding: 'Ctrl+Shift+X' },
        { id: 'debug.start', title: 'Start Debugging', category: 'Debug', keybinding: 'F5' },
        { id: 'debug.stop', title: 'Stop Debugging', category: 'Debug', keybinding: 'Shift+F5' },
        { id: 'debug.restart', title: 'Restart Debugging', category: 'Debug', keybinding: 'Ctrl+Shift+F5' },
        { id: 'git.commit', title: 'Git: Commit', category: 'Git' },
        { id: 'git.push', title: 'Git: Push', category: 'Git' },
        { id: 'git.pull', title: 'Git: Pull', category: 'Git' },
        { id: 'ai.chat', title: 'AI: Open Chat', category: 'AI', keybinding: 'Ctrl+Shift+I' },
        { id: 'ai.explain', title: 'AI: Explain Selection', category: 'AI' },
        { id: 'ai.generate', title: 'AI: Generate Code', category: 'AI' },
    ];
}
