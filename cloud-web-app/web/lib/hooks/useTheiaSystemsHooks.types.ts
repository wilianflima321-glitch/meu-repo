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

export interface Theme {
    id: string;
    name: string;
    type: 'light' | 'dark' | 'high-contrast';
    colors: Record<string, string>;
}

export interface Keybinding {
    id: string;
    key: string;
    command: string;
    when?: string;
    source: 'user' | 'extension' | 'default';
}

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

export interface Command {
    id: string;
    title: string;
    category?: string;
    keybinding?: string;
    icon?: string;
    enabled?: boolean;
}

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
