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
import { useAI } from './useTheiaAIHook';
import { buildKeyString, loadCommands, loadDefaultKeybinding, loadKeybindings, loadTheme, loadThemes, saveKeybindings } from './useTheiaSystemDefaults';
export { useAI } from './useTheiaAIHook';

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
