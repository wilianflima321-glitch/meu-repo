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
 * - useNotifications() instead of local notification state
 * - useCommandPalette() instead of local command handling
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAI } from './useTheiaAIHook';
import { useCommandPalette } from './useTheiaCommandPalette';
import { emitEvent, onEvent } from './useTheiaSystemsEvents';
import { buildKeyString, loadDefaultKeybinding, loadKeybindings, loadTheme, loadThemes, saveKeybindings } from './useTheiaSystemDefaults';
export { useAI } from './useTheiaAIHook';
export { useCommandPalette } from './useTheiaCommandPalette';
export type * from './useTheiaSystemsHooks.types';
import type {
    Command,
    Keybinding,
    Notification,
    SearchQuery,
    SearchResult,
    Theme,
} from './useTheiaSystemsHooks.types';

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

const theiaSystemsHooks = {
    useSearch,
    useTheme,
    useKeybinding,
    useNotifications,
    useCommandPalette,
    useAI,
};

export default theiaSystemsHooks;
