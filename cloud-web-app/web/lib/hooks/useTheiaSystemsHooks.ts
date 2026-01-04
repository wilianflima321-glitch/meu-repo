/**
 * Unified Theia Systems Hooks
 * 
 * React hooks that connect WebApp components to Theia backend systems.
 * These hooks replace the local managers with unified system access.
 * 
 * Usage:
 * - useSearch() instead of SearchManager
 * - useTheme() instead of ThemeManager
 * - useKeybinding() instead of KeyboardManager
 * - useNotifications() instead of NotificationCenter local state
 * - useCommandPalette() instead of local command handling
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// ==================== Types ====================

// Search Types
export interface SearchQuery {
    pattern: string;
    isRegex?: boolean;
    caseSensitive?: boolean;
    wholeWord?: boolean;
    includePattern?: string;
    excludePattern?: string;
    maxResults?: number;
    domain?: 'files' | 'text' | 'symbols' | 'assets' | 'commands' | 'all';
}

export interface SearchResult {
    id: string;
    file: string;
    line: number;
    column: number;
    match: string;
    preview: string;
    type: 'file' | 'text-match' | 'symbol' | 'asset' | 'command';
    score?: number;
}

// Theme Types
export interface Theme {
    id: string;
    name: string;
    type: 'light' | 'dark' | 'high-contrast';
    colors: Record<string, string>;
}

// Keybinding Types
export interface Keybinding {
    id: string;
    key: string;
    command: string;
    when?: string;
    source: 'user' | 'extension' | 'default';
}

// Notification Types
export interface Notification {
    id: string;
    type: 'info' | 'warning' | 'error' | 'success' | 'progress';
    title: string;
    message?: string;
    progress?: number;
    actions?: NotificationAction[];
    timestamp: number;
    read: boolean;
}

export interface NotificationAction {
    id: string;
    label: string;
    primary?: boolean;
}

// Command Types
export interface Command {
    id: string;
    title: string;
    category?: string;
    keybinding?: string;
    icon?: string;
    enabled?: boolean;
}

// AI Types
export interface AIRequest {
    prompt: string;
    context?: string;
    agentType?: string;
    stream?: boolean;
}

export interface AIResponse {
    content: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

// ==================== Bridge Connection ====================

/**
 * Connection state to Theia backend
 */
interface BridgeState {
    connected: boolean;
    syncing: boolean;
    lastSync: number;
}

// Event bus for cross-component communication
const eventBus = new Map<string, Set<(data: unknown) => void>>();

function emitEvent(event: string, data: unknown): void {
    eventBus.get(event)?.forEach(cb => cb(data));
}

function onEvent(event: string, callback: (data: unknown) => void): () => void {
    if (!eventBus.has(event)) {
        eventBus.set(event, new Set());
    }
    eventBus.get(event)!.add(callback);
    return () => eventBus.get(event)?.delete(callback);
}

// ==================== useSearch Hook ====================

export interface UseSearchReturn {
    results: SearchResult[];
    isSearching: boolean;
    error: string | null;
    search: (query: SearchQuery) => Promise<SearchResult[]>;
    searchInFile: (file: string, query: SearchQuery) => Promise<SearchResult[]>;
    replace: (query: SearchQuery, replacement: string) => Promise<number>;
    replaceAll: (query: SearchQuery, replacement: string) => Promise<number>;
    cancel: () => void;
    history: SearchQuery[];
    clearHistory: () => void;
}

export function useSearch(): UseSearchReturn {
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<SearchQuery[]>([]);
    const abortController = useRef<AbortController | null>(null);

    // Load history from storage
    useEffect(() => {
        const stored = localStorage.getItem('search-history');
        if (stored) {
            try {
                setHistory(JSON.parse(stored));
            } catch {
                // Ignore parse errors
            }
        }
    }, []);

    const search = useCallback(async (query: SearchQuery): Promise<SearchResult[]> => {
        // Cancel previous search
        abortController.current?.abort();
        abortController.current = new AbortController();

        setIsSearching(true);
        setError(null);

        try {
            // Try to use Theia backend via postMessage or API
            const searchResults = await performSearch(query, abortController.current.signal);
            
            setResults(searchResults);
            
            // Add to history
            setHistory(prev => {
                const newHistory = [query, ...prev.filter(h => h.pattern !== query.pattern)].slice(0, 20);
                localStorage.setItem('search-history', JSON.stringify(newHistory));
                return newHistory;
            });

            return searchResults;
        } catch (err) {
            if ((err as Error).name !== 'AbortError') {
                setError((err as Error).message);
            }
            return [];
        } finally {
            setIsSearching(false);
        }
    }, []);

    const searchInFile = useCallback(async (file: string, query: SearchQuery): Promise<SearchResult[]> => {
        return performSearchInFile(file, query);
    }, []);

    const replace = useCallback(async (query: SearchQuery, replacement: string): Promise<number> => {
        return performReplace(query, replacement, false);
    }, []);

    const replaceAll = useCallback(async (query: SearchQuery, replacement: string): Promise<number> => {
        return performReplace(query, replacement, true);
    }, []);

    const cancel = useCallback(() => {
        abortController.current?.abort();
        setIsSearching(false);
    }, []);

    const clearHistory = useCallback(() => {
        setHistory([]);
        localStorage.removeItem('search-history');
    }, []);

    return {
        results,
        isSearching,
        error,
        search,
        searchInFile,
        replace,
        replaceAll,
        cancel,
        history,
        clearHistory,
    };
}

// ==================== useTheme Hook ====================

export interface UseThemeReturn {
    theme: Theme | null;
    themes: Theme[];
    setTheme: (themeId: string) => Promise<void>;
    getColor: (colorId: string) => string | undefined;
    isDark: boolean;
    toggleTheme: () => void;
}

export function useTheme(): UseThemeReturn {
    const [theme, setThemeState] = useState<Theme | null>(null);
    const [themes, setThemes] = useState<Theme[]>([]);

    // Initialize themes
    useEffect(() => {
        loadThemes().then(setThemes);
        
        // Get current theme
        const storedThemeId = localStorage.getItem('theme-id') || 'dark-plus';
        loadTheme(storedThemeId).then(setThemeState);

        // Apply CSS variables
        return onEvent('theme-changed', (data) => {
            setThemeState(data as Theme);
        });
    }, []);

    // Apply theme colors as CSS variables
    useEffect(() => {
        if (theme) {
            const root = document.documentElement;
            Object.entries(theme.colors).forEach(([key, value]) => {
                root.style.setProperty(`--${key.replace(/\./g, '-')}`, value);
            });
        }
    }, [theme]);

    const setTheme = useCallback(async (themeId: string) => {
        const newTheme = await loadTheme(themeId);
        if (newTheme) {
            setThemeState(newTheme);
            localStorage.setItem('theme-id', themeId);
            emitEvent('theme-changed', newTheme);
        }
    }, []);

    const getColor = useCallback((colorId: string): string | undefined => {
        return theme?.colors[colorId];
    }, [theme]);

    const isDark = useMemo(() => theme?.type === 'dark' || theme?.type === 'high-contrast', [theme]);

    const toggleTheme = useCallback(() => {
        const newType = isDark ? 'light-plus' : 'dark-plus';
        setTheme(newType);
    }, [isDark, setTheme]);

    return {
        theme,
        themes,
        setTheme,
        getColor,
        isDark,
        toggleTheme,
    };
}

// ==================== useKeybinding Hook ====================

export interface UseKeybindingReturn {
    keybindings: Keybinding[];
    setKeybinding: (keybinding: Keybinding) => void;
    removeKeybinding: (id: string) => void;
    resetKeybinding: (command: string) => void;
    getKeybinding: (command: string) => Keybinding | undefined;
    executeCommand: (command: string, args?: unknown) => Promise<void>;
    registerHandler: (command: string, handler: () => void | Promise<void>) => () => void;
}

export function useKeybinding(): UseKeybindingReturn {
    const [keybindings, setKeybindings] = useState<Keybinding[]>([]);
    const handlersRef = useRef<Map<string, () => void | Promise<void>>>(new Map());

    // Load keybindings
    useEffect(() => {
        loadKeybindings().then(setKeybindings);

        // Listen for keyboard events
        const handleKeyDown = (e: KeyboardEvent) => {
            // Skip if in input
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                if (!e.ctrlKey && !e.metaKey) return;
            }

            const key = buildKeyString(e);
            const binding = keybindings.find(k => k.key.toLowerCase() === key.toLowerCase());
            
            if (binding) {
                e.preventDefault();
                e.stopPropagation();
                
                const handler = handlersRef.current.get(binding.command);
                if (handler) {
                    handler();
                } else {
                    // Emit event for other components to handle
                    emitEvent(`command:${binding.command}`, {});
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [keybindings]);

    const setKeybinding = useCallback((keybinding: Keybinding) => {
        setKeybindings(prev => {
            const newBindings = prev.filter(k => k.id !== keybinding.id);
            newBindings.push(keybinding);
            saveKeybindings(newBindings);
            return newBindings;
        });
    }, []);

    const removeKeybinding = useCallback((id: string) => {
        setKeybindings(prev => {
            const newBindings = prev.filter(k => k.id !== id);
            saveKeybindings(newBindings);
            return newBindings;
        });
    }, []);

    const resetKeybinding = useCallback((command: string) => {
        // Reset to default
        loadDefaultKeybinding(command).then(defaultBinding => {
            if (defaultBinding) {
                setKeybinding(defaultBinding);
            }
        });
    }, [setKeybinding]);

    const getKeybinding = useCallback((command: string): Keybinding | undefined => {
        return keybindings.find(k => k.command === command);
    }, [keybindings]);

    const executeCommand = useCallback(async (command: string, args?: unknown) => {
        const handler = handlersRef.current.get(command);
        if (handler) {
            await handler();
        } else {
            emitEvent(`command:${command}`, args);
        }
    }, []);

    const registerHandler = useCallback((command: string, handler: () => void | Promise<void>): () => void => {
        handlersRef.current.set(command, handler);
        return () => handlersRef.current.delete(command);
    }, []);

    return {
        keybindings,
        setKeybinding,
        removeKeybinding,
        resetKeybinding,
        getKeybinding,
        executeCommand,
        registerHandler,
    };
}

// ==================== useNotifications Hook ====================

export interface UseNotificationsReturn {
    notifications: Notification[];
    unreadCount: number;
    show: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => string;
    showInfo: (title: string, message?: string) => string;
    showWarning: (title: string, message?: string) => string;
    showError: (title: string, message?: string) => string;
    showSuccess: (title: string, message?: string) => string;
    showProgress: (title: string, progress: number, message?: string) => string;
    update: (id: string, updates: Partial<Notification>) => void;
    dismiss: (id: string) => void;
    dismissAll: () => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
}

export function useNotifications(): UseNotificationsReturn {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    // Load from storage
    useEffect(() => {
        const stored = localStorage.getItem('notifications');
        if (stored) {
            try {
                setNotifications(JSON.parse(stored));
            } catch {
                // Ignore
            }
        }

        // Listen for notification events
        return onEvent('notification', (data) => {
            const notification = data as Notification;
            setNotifications(prev => [notification, ...prev].slice(0, 100));
        });
    }, []);

    // Persist notifications
    useEffect(() => {
        localStorage.setItem('notifications', JSON.stringify(notifications.slice(0, 50)));
    }, [notifications]);

    const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

    const show = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): string => {
        const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const fullNotification: Notification = {
            ...notification,
            id,
            timestamp: Date.now(),
            read: false,
        };
        
        setNotifications(prev => [fullNotification, ...prev].slice(0, 100));
        emitEvent('notification', fullNotification);
        
        return id;
    }, []);

    const showInfo = useCallback((title: string, message?: string) => 
        show({ type: 'info', title, message }), [show]);
    
    const showWarning = useCallback((title: string, message?: string) => 
        show({ type: 'warning', title, message }), [show]);
    
    const showError = useCallback((title: string, message?: string) => 
        show({ type: 'error', title, message }), [show]);
    
    const showSuccess = useCallback((title: string, message?: string) => 
        show({ type: 'success', title, message }), [show]);

    const showProgress = useCallback((title: string, progress: number, message?: string) => 
        show({ type: 'progress', title, message, progress }), [show]);

    const update = useCallback((id: string, updates: Partial<Notification>) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
    }, []);

    const dismiss = useCallback((id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const dismissAll = useCallback(() => {
        setNotifications([]);
    }, []);

    const markAsRead = useCallback((id: string) => {
        update(id, { read: true });
    }, [update]);

    const markAllAsRead = useCallback(() => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }, []);

    return {
        notifications,
        unreadCount,
        show,
        showInfo,
        showWarning,
        showError,
        showSuccess,
        showProgress,
        update,
        dismiss,
        dismissAll,
        markAsRead,
        markAllAsRead,
    };
}

// ==================== useCommandPalette Hook ====================

export interface UseCommandPaletteReturn {
    isOpen: boolean;
    commands: Command[];
    recentCommands: Command[];
    open: () => void;
    close: () => void;
    toggle: () => void;
    execute: (commandId: string) => Promise<void>;
    registerCommand: (command: Command, handler: () => void | Promise<void>) => () => void;
    filter: (query: string) => Command[];
}

export function useCommandPalette(): UseCommandPaletteReturn {
    const [isOpen, setIsOpen] = useState(false);
    const [commands, setCommands] = useState<Command[]>([]);
    const [recentCommands, setRecentCommands] = useState<Command[]>([]);
    const handlersRef = useRef<Map<string, () => void | Promise<void>>>(new Map());

    // Load commands and set up keyboard listener
    useEffect(() => {
        loadCommands().then(setCommands);
        
        // Load recent
        const stored = localStorage.getItem('recent-commands');
        if (stored) {
            try {
                setRecentCommands(JSON.parse(stored));
            } catch {
                // Ignore
            }
        }

        // Listen for Ctrl+Shift+P / Cmd+Shift+P
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
            // Also Ctrl+K for quick actions
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(true);
            }
            // Escape to close
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    const open = useCallback(() => setIsOpen(true), []);
    const close = useCallback(() => setIsOpen(false), []);
    const toggle = useCallback(() => setIsOpen(prev => !prev), []);

    const execute = useCallback(async (commandId: string) => {
        const handler = handlersRef.current.get(commandId);
        if (handler) {
            await handler();
        } else {
            emitEvent(`command:${commandId}`, {});
        }

        // Add to recent
        const command = commands.find(c => c.id === commandId);
        if (command) {
            setRecentCommands(prev => {
                const newRecent = [command, ...prev.filter(c => c.id !== commandId)].slice(0, 10);
                localStorage.setItem('recent-commands', JSON.stringify(newRecent));
                return newRecent;
            });
        }

        close();
    }, [commands, close]);

    const registerCommand = useCallback((command: Command, handler: () => void | Promise<void>): () => void => {
        setCommands(prev => {
            if (prev.find(c => c.id === command.id)) {
                return prev.map(c => c.id === command.id ? command : c);
            }
            return [...prev, command];
        });
        handlersRef.current.set(command.id, handler);
        
        return () => {
            handlersRef.current.delete(command.id);
            setCommands(prev => prev.filter(c => c.id !== command.id));
        };
    }, []);

    const filter = useCallback((query: string): Command[] => {
        if (!query) return commands;
        
        const lowerQuery = query.toLowerCase();
        return commands
            .filter(c => 
                c.title.toLowerCase().includes(lowerQuery) ||
                c.category?.toLowerCase().includes(lowerQuery) ||
                c.id.toLowerCase().includes(lowerQuery)
            )
            .sort((a, b) => {
                // Prioritize title match
                const aTitle = a.title.toLowerCase().indexOf(lowerQuery);
                const bTitle = b.title.toLowerCase().indexOf(lowerQuery);
                if (aTitle !== -1 && bTitle === -1) return -1;
                if (bTitle !== -1 && aTitle === -1) return 1;
                return aTitle - bTitle;
            });
    }, [commands]);

    return {
        isOpen,
        commands,
        recentCommands,
        open,
        close,
        toggle,
        execute,
        registerCommand,
        filter,
    };
}

// ==================== useAI Hook ====================

export interface UseAIReturn {
    isLoading: boolean;
    error: string | null;
    chat: (request: AIRequest) => Promise<AIResponse>;
    stream: (request: AIRequest, onChunk: (chunk: string) => void) => Promise<AIResponse>;
    generateCode: (prompt: string, language: string) => Promise<string>;
    explainCode: (code: string, language: string) => Promise<string>;
    reviewCode: (code: string, language: string) => Promise<string>;
    translateCode: (code: string, fromLang: string, toLang: string) => Promise<string>;
    cancel: () => void;
}

export function useAI(): UseAIReturn {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const abortController = useRef<AbortController | null>(null);

    const chat = useCallback(async (request: AIRequest): Promise<AIResponse> => {
        abortController.current?.abort();
        abortController.current = new AbortController();

        setIsLoading(true);
        setError(null);

        try {
            const response = await callAIBackend(request, abortController.current.signal);
            return response;
        } catch (err) {
            if ((err as Error).name !== 'AbortError') {
                setError((err as Error).message);
            }
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const stream = useCallback(async (request: AIRequest, onChunk: (chunk: string) => void): Promise<AIResponse> => {
        abortController.current?.abort();
        abortController.current = new AbortController();

        setIsLoading(true);
        setError(null);

        try {
            const response = await streamAIBackend({ ...request, stream: true }, onChunk, abortController.current.signal);
            return response;
        } catch (err) {
            if ((err as Error).name !== 'AbortError') {
                setError((err as Error).message);
            }
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const generateCode = useCallback(async (prompt: string, language: string): Promise<string> => {
        const response = await chat({
            prompt: `Generate ${language} code for: ${prompt}. Return only the code, no explanations.`,
            agentType: 'coder',
        });
        return response.content;
    }, [chat]);

    const explainCode = useCallback(async (code: string, language: string): Promise<string> => {
        const response = await chat({
            prompt: `Explain this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\``,
            agentType: 'documenter',
        });
        return response.content;
    }, [chat]);

    const reviewCode = useCallback(async (code: string, language: string): Promise<string> => {
        const response = await chat({
            prompt: `Review this ${language} code for bugs, security issues, and best practices:\n\n\`\`\`${language}\n${code}\n\`\`\``,
            agentType: 'reviewer',
        });
        return response.content;
    }, [chat]);

    const translateCode = useCallback(async (code: string, fromLang: string, toLang: string): Promise<string> => {
        const response = await chat({
            prompt: `Translate this ${fromLang} code to ${toLang}. Return only the code:\n\n\`\`\`${fromLang}\n${code}\n\`\`\``,
            agentType: 'coder',
        });
        return response.content;
    }, [chat]);

    const cancel = useCallback(() => {
        abortController.current?.abort();
        setIsLoading(false);
    }, []);

    return {
        isLoading,
        error,
        chat,
        stream,
        generateCode,
        explainCode,
        reviewCode,
        translateCode,
        cancel,
    };
}

// ==================== Helper Functions ====================

async function performSearch(query: SearchQuery, signal: AbortSignal): Promise<SearchResult[]> {
    // Try to call Theia backend
    try {
        const response = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(query),
            signal,
        });
        
        if (response.ok) {
            return response.json();
        }
    } catch {
        // Fallback to local search simulation
    }

    // Fallback: emit event for Theia to handle
    return new Promise((resolve) => {
        const timeout = setTimeout(() => resolve([]), 5000);
        const cleanup = onEvent('search-results', (data) => {
            clearTimeout(timeout);
            cleanup();
            resolve(data as SearchResult[]);
        });
        emitEvent('search-request', query);
    });
}

async function performSearchInFile(file: string, query: SearchQuery): Promise<SearchResult[]> {
    // Implementation would connect to Theia backend
    return [];
}

async function performReplace(query: SearchQuery, replacement: string, all: boolean): Promise<number> {
    // Implementation would connect to Theia backend
    return 0;
}

async function loadThemes(): Promise<Theme[]> {
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

async function loadTheme(themeId: string): Promise<Theme | null> {
    const themes = await loadThemes();
    return themes.find(t => t.id === themeId) || themes[0];
}

async function loadKeybindings(): Promise<Keybinding[]> {
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

async function saveKeybindings(keybindings: Keybinding[]): Promise<void> {
    localStorage.setItem('keybindings', JSON.stringify(keybindings));
}

async function loadDefaultKeybinding(command: string): Promise<Keybinding | null> {
    const defaults = await loadKeybindings();
    return defaults.find(k => k.command === command) || null;
}

function buildKeyString(e: KeyboardEvent): string {
    const parts: string[] = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey) parts.push('Alt');
    if (e.metaKey) parts.push('Meta');
    
    const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
    parts.push(key);
    
    return parts.join('+');
}

async function loadCommands(): Promise<Command[]> {
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

async function callAIBackend(request: AIRequest, signal: AbortSignal): Promise<AIResponse> {
    try {
        const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
            signal,
        });

        if (response.ok) {
            return response.json();
        }
    } catch {
        // Fallback
    }

    // Fallback: return placeholder
    return {
        content: 'AI backend not connected. Please ensure the Theia backend is running.',
    };
}

async function streamAIBackend(
    request: AIRequest,
    onChunk: (chunk: string) => void,
    signal: AbortSignal
): Promise<AIResponse> {
    try {
        const response = await fetch('/api/ai/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
            signal,
        });

        if (response.ok && response.body) {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullContent = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                fullContent += chunk;
                onChunk(chunk);
            }

            return { content: fullContent };
        }
    } catch {
        // Fallback
    }

    return { content: 'Streaming not available' };
}

// ==================== Export All ====================

const theiaSystemsHooks = {
    useSearch,
    useTheme,
    useKeybinding,
    useNotifications,
    useCommandPalette,
    useAI,
};

export default theiaSystemsHooks;
