/**
 * AETHEL ENGINE - UNIFIED SDK
 * ===========================
 * 
 * SDK unificado que funciona tanto no Desktop (Theia) quanto na Web (Next.js).
 * Abstrai as diferenças entre plataformas e fornece uma API consistente.
 * 
 * Uso:
 *   import { aethel } from '@aethel/api';
 *   aethel.window.showInformationMessage('Hello!');
 *   aethel.render.start({ scene: 'main.blend' });
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type Platform = 'theia' | 'web' | 'unknown';

export interface MessageOptions {
    modal?: boolean;
    detail?: string;
    items?: string[];
}

export interface ProgressOptions {
    location?: 'notification' | 'window' | 'source-control';
    title: string;
    cancellable?: boolean;
}

export interface ProgressReport {
    message?: string;
    increment?: number;
}

export interface QuickPickItem {
    label: string;
    description?: string;
    detail?: string;
    picked?: boolean;
    alwaysShow?: boolean;
}

export interface InputBoxOptions {
    title?: string;
    prompt?: string;
    placeholder?: string;
    value?: string;
    password?: boolean;
    validateInput?: (value: string) => string | null;
}

export interface FileFilter {
    name: string;
    extensions: string[];
}

export interface OpenDialogOptions {
    canSelectFiles?: boolean;
    canSelectFolders?: boolean;
    canSelectMany?: boolean;
    filters?: FileFilter[];
    title?: string;
    defaultUri?: string;
}

export interface SaveDialogOptions {
    filters?: FileFilter[];
    title?: string;
    defaultUri?: string;
    saveLabel?: string;
}

export interface RenderOptions {
    scene: string;
    output?: string;
    frames?: { start: number; end: number };
    resolution?: { width: number; height: number };
    samples?: number;
    engine?: 'cycles' | 'eevee' | 'workbench';
    format?: 'PNG' | 'JPEG' | 'EXR' | 'TIFF' | 'MP4';
    camera?: string;
}

export interface RenderJob {
    jobId: string;
    status: 'queued' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
    progress?: number;
    message?: string;
    startedAt?: string;
    finishedAt?: string;
    [key: string]: unknown;
}

export interface GenerationOptions {
    type: 'asset' | 'scene' | 'material' | 'character' | 'landscape';
    prompt: string;
    style?: string;
    quality?: 'draft' | 'medium' | 'high' | 'production';
    seed?: number;
}

export interface CollaborationOptions {
    document: string;
    username?: string;
    color?: string;
}

export interface Position {
    x: number;
    y: number;
    z: number;
}

export interface SystemHealth {
    status: 'ok' | 'degraded' | 'down';
    timestamp?: string;
    services?: Record<string, unknown>;
    metrics?: Record<string, unknown>;
    [key: string]: unknown;
}

// ============================================================================
// PLATFORM DETECTION
// ============================================================================

function detectPlatform(): Platform {
    // Check for Theia environment
    if (typeof window !== 'undefined') {
        // Theia exposes these globals
        if ((window as any).__THEIA_PLUGIN_HOST) {
            return 'theia';
        }
        
        // Check for VS Code/Theia API
        if (typeof (window as any).acquireVsCodeApi === 'function') {
            return 'theia';
        }
        
        // Check for our bridge
        if ((window as any).__AETHEL_BRIDGE__) {
            return 'theia';
        }
        
        // We're in a browser
        return 'web';
    }
    
    // Node.js environment (Theia backend)
    if (typeof process !== 'undefined' && process.versions?.electron) {
        return 'theia';
    }
    
    return 'unknown';
}

// ============================================================================
// THEIA ADAPTER
// ============================================================================

const theiaAdapter = {
    window: {
        showInformationMessage: async (message: string, options?: MessageOptions): Promise<string | undefined> => {
            const vscode = (window as any).acquireVsCodeApi?.() || (window as any).__AETHEL_BRIDGE__;
            if (vscode?.postMessage) {
                return new Promise(resolve => {
                    const handler = (event: MessageEvent) => {
                        if (event.data.type === 'message-response') {
                            window.removeEventListener('message', handler);
                            resolve(event.data.result);
                        }
                    };
                    window.addEventListener('message', handler);
                    vscode.postMessage({
                        type: 'showInformationMessage',
                        message,
                        options
                    });
                });
            }
            console.info(`[INFO] ${message}`);
            return undefined;
        },
        
        showWarningMessage: async (message: string, options?: MessageOptions): Promise<string | undefined> => {
            const vscode = (window as any).acquireVsCodeApi?.() || (window as any).__AETHEL_BRIDGE__;
            if (vscode?.postMessage) {
                return new Promise(resolve => {
                    const handler = (event: MessageEvent) => {
                        if (event.data.type === 'message-response') {
                            window.removeEventListener('message', handler);
                            resolve(event.data.result);
                        }
                    };
                    window.addEventListener('message', handler);
                    vscode.postMessage({
                        type: 'showWarningMessage',
                        message,
                        options
                    });
                });
            }
            console.warn(`[WARN] ${message}`);
            return undefined;
        },
        
        showErrorMessage: async (message: string, options?: MessageOptions): Promise<string | undefined> => {
            const vscode = (window as any).acquireVsCodeApi?.() || (window as any).__AETHEL_BRIDGE__;
            if (vscode?.postMessage) {
                return new Promise(resolve => {
                    const handler = (event: MessageEvent) => {
                        if (event.data.type === 'message-response') {
                            window.removeEventListener('message', handler);
                            resolve(event.data.result);
                        }
                    };
                    window.addEventListener('message', handler);
                    vscode.postMessage({
                        type: 'showErrorMessage',
                        message,
                        options
                    });
                });
            }
            console.error(`[ERROR] ${message}`);
            return undefined;
        },
        
        showQuickPick: async <T extends QuickPickItem>(items: T[], options?: { title?: string; placeholder?: string }): Promise<T | undefined> => {
            const vscode = (window as any).acquireVsCodeApi?.() || (window as any).__AETHEL_BRIDGE__;
            if (vscode?.postMessage) {
                return new Promise(resolve => {
                    const handler = (event: MessageEvent) => {
                        if (event.data.type === 'quickpick-response') {
                            window.removeEventListener('message', handler);
                            resolve(event.data.result);
                        }
                    };
                    window.addEventListener('message', handler);
                    vscode.postMessage({
                        type: 'showQuickPick',
                        items,
                        options
                    });
                });
            }
            return undefined;
        },
        
        showInputBox: async (options: InputBoxOptions): Promise<string | undefined> => {
            const vscode = (window as any).acquireVsCodeApi?.() || (window as any).__AETHEL_BRIDGE__;
            if (vscode?.postMessage) {
                return new Promise(resolve => {
                    const handler = (event: MessageEvent) => {
                        if (event.data.type === 'inputbox-response') {
                            window.removeEventListener('message', handler);
                            resolve(event.data.result);
                        }
                    };
                    window.addEventListener('message', handler);
                    vscode.postMessage({
                        type: 'showInputBox',
                        options
                    });
                });
            }
            return undefined;
        },
        
        showOpenDialog: async (options: OpenDialogOptions): Promise<string[] | undefined> => {
            const vscode = (window as any).acquireVsCodeApi?.() || (window as any).__AETHEL_BRIDGE__;
            if (vscode?.postMessage) {
                return new Promise(resolve => {
                    const handler = (event: MessageEvent) => {
                        if (event.data.type === 'opendialog-response') {
                            window.removeEventListener('message', handler);
                            resolve(event.data.result);
                        }
                    };
                    window.addEventListener('message', handler);
                    vscode.postMessage({
                        type: 'showOpenDialog',
                        options
                    });
                });
            }
            return undefined;
        },
        
        showSaveDialog: async (options: SaveDialogOptions): Promise<string | undefined> => {
            const vscode = (window as any).acquireVsCodeApi?.() || (window as any).__AETHEL_BRIDGE__;
            if (vscode?.postMessage) {
                return new Promise(resolve => {
                    const handler = (event: MessageEvent) => {
                        if (event.data.type === 'savedialog-response') {
                            window.removeEventListener('message', handler);
                            resolve(event.data.result);
                        }
                    };
                    window.addEventListener('message', handler);
                    vscode.postMessage({
                        type: 'showSaveDialog',
                        options
                    });
                });
            }
            return undefined;
        },
        
        withProgress: async <T>(
            options: ProgressOptions,
            task: (progress: { report: (value: ProgressReport) => void }) => Promise<T>
        ): Promise<T> => {
            const vscode = (window as any).acquireVsCodeApi?.() || (window as any).__AETHEL_BRIDGE__;
            const progressId = `progress-${Date.now()}`;
            
            if (vscode?.postMessage) {
                vscode.postMessage({
                    type: 'startProgress',
                    id: progressId,
                    options
                });
            }
            
            try {
                const result = await task({
                    report: (value) => {
                        if (vscode?.postMessage) {
                            vscode.postMessage({
                                type: 'reportProgress',
                                id: progressId,
                                value
                            });
                        }
                    }
                });
                
                return result;
            } finally {
                if (vscode?.postMessage) {
                    vscode.postMessage({
                        type: 'endProgress',
                        id: progressId
                    });
                }
            }
        },
        
        setStatusBarMessage: (text: string, hideAfterMs?: number): { dispose: () => void } => {
            const vscode = (window as any).acquireVsCodeApi?.() || (window as any).__AETHEL_BRIDGE__;
            const statusId = `status-${Date.now()}`;
            
            if (vscode?.postMessage) {
                vscode.postMessage({
                    type: 'setStatusBarMessage',
                    id: statusId,
                    text,
                    hideAfterMs
                });
            }
            
            return {
                dispose: () => {
                    if (vscode?.postMessage) {
                        vscode.postMessage({
                            type: 'clearStatusBarMessage',
                            id: statusId
                        });
                    }
                }
            };
        }
    }
};

// ============================================================================
// WEB ADAPTER
// ============================================================================

let toastContainer: HTMLElement | null = null;

function ensureToastContainer(): HTMLElement {
    if (toastContainer) return toastContainer;
    
    toastContainer = document.createElement('div');
    toastContainer.id = 'aethel-toast-container';
    toastContainer.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 99999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
    `;
    document.body.appendChild(toastContainer);
    
    return toastContainer;
}

function showToast(message: string, type: 'info' | 'warning' | 'error' = 'info', duration = 5000): void {
    const container = ensureToastContainer();
    
    const colors = {
        info: { bg: '#2563eb', border: '#3b82f6' },
        warning: { bg: '#d97706', border: '#f59e0b' },
        error: { bg: '#dc2626', border: '#ef4444' }
    };
    
    const toast = document.createElement('div');
    toast.style.cssText = `
        background: ${colors[type].bg};
        border: 1px solid ${colors[type].border};
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        max-width: 400px;
        animation: slideIn 0.3s ease-out;
        pointer-events: auto;
    `;
    toast.textContent = message;
    
    // Add animation keyframes
    if (!document.getElementById('aethel-toast-styles')) {
        const style = document.createElement('style');
        style.id = 'aethel-toast-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-in forwards';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

const webAdapter = {
    window: {
        showInformationMessage: async (message: string, options?: MessageOptions): Promise<string | undefined> => {
            if (options?.modal) {
                return new Promise(resolve => {
                    if (options.items?.length) {
                        // Show buttons
                        const result = window.confirm(message + '\n\n' + options.detail);
                        resolve(result ? options.items[0] : undefined);
                    } else {
                        window.alert(message);
                        resolve(undefined);
                    }
                });
            }
            
            showToast(message, 'info');
            return undefined;
        },
        
        showWarningMessage: async (message: string, options?: MessageOptions): Promise<string | undefined> => {
            if (options?.modal) {
                const result = window.confirm(message);
                return result ? options?.items?.[0] : undefined;
            }
            
            showToast(message, 'warning');
            return undefined;
        },
        
        showErrorMessage: async (message: string, options?: MessageOptions): Promise<string | undefined> => {
            if (options?.modal) {
                window.alert(message);
            } else {
                showToast(message, 'error', 8000);
            }
            return undefined;
        },
        
        showQuickPick: async <T extends QuickPickItem>(items: T[], options?: { title?: string; placeholder?: string }): Promise<T | undefined> => {
            // Create modal dialog
            return new Promise(resolve => {
                const overlay = document.createElement('div');
                overlay.style.cssText = `
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.7);
                    z-index: 99999;
                    display: flex;
                    align-items: flex-start;
                    justify-content: center;
                    padding-top: 100px;
                `;
                
                const dialog = document.createElement('div');
                dialog.style.cssText = `
                    background: #1e1e1e;
                    border: 1px solid #3c3c3c;
                    border-radius: 8px;
                    width: 500px;
                    max-height: 400px;
                    overflow: hidden;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                `;
                
                if (options?.title) {
                    const header = document.createElement('div');
                    header.style.cssText = 'padding: 12px 16px; border-bottom: 1px solid #3c3c3c; color: white; font-weight: 500;';
                    header.textContent = options.title;
                    dialog.appendChild(header);
                }
                
                const list = document.createElement('div');
                list.style.cssText = 'max-height: 300px; overflow-y: auto;';
                
                items.forEach((item, index) => {
                    const option = document.createElement('div');
                    option.style.cssText = `
                        padding: 8px 16px;
                        cursor: pointer;
                        color: white;
                        transition: background 0.2s;
                    `;
                    option.onmouseenter = () => option.style.background = '#2d2d2d';
                    option.onmouseleave = () => option.style.background = 'transparent';
                    option.innerHTML = `
                        <div style="font-weight: 500;">${item.label}</div>
                        ${item.description ? `<div style="font-size: 12px; color: #888;">${item.description}</div>` : ''}
                    `;
                    option.onclick = () => {
                        overlay.remove();
                        resolve(item);
                    };
                    list.appendChild(option);
                });
                
                dialog.appendChild(list);
                overlay.appendChild(dialog);
                
                overlay.onclick = (e) => {
                    if (e.target === overlay) {
                        overlay.remove();
                        resolve(undefined);
                    }
                };
                
                document.body.appendChild(overlay);
            });
        },
        
        showInputBox: async (options: InputBoxOptions): Promise<string | undefined> => {
            return new Promise(resolve => {
                const result = window.prompt(options.prompt || options.title || 'Input', options.value || '');
                resolve(result || undefined);
            });
        },
        
        showOpenDialog: async (options: OpenDialogOptions): Promise<string[] | undefined> => {
            return new Promise(resolve => {
                const input = document.createElement('input');
                input.type = 'file';
                input.multiple = options.canSelectMany ?? false;
                
                if (options.filters?.length) {
                    input.accept = options.filters
                        .flatMap(f => f.extensions.map(e => `.${e}`))
                        .join(',');
                }
                
                input.onchange = () => {
                    if (input.files?.length) {
                        const paths = Array.from(input.files).map(f => f.name);
                        resolve(paths);
                    } else {
                        resolve(undefined);
                    }
                };
                
                input.click();
            });
        },
        
        showSaveDialog: async (options: SaveDialogOptions): Promise<string | undefined> => {
            const name = window.prompt(options.title || 'Save as', options.defaultUri || '');
            return name || undefined;
        },
        
        withProgress: async <T>(
            options: ProgressOptions,
            task: (progress: { report: (value: ProgressReport) => void }) => Promise<T>
        ): Promise<T> => {
            // Create progress notification
            const container = ensureToastContainer();
            
            const progressEl = document.createElement('div');
            progressEl.style.cssText = `
                background: #1e1e1e;
                border: 1px solid #3c3c3c;
                color: white;
                padding: 12px 16px;
                border-radius: 8px;
                min-width: 300px;
                pointer-events: auto;
            `;
            
            const title = document.createElement('div');
            title.style.cssText = 'font-weight: 500; margin-bottom: 8px;';
            title.textContent = options.title;
            
            const message = document.createElement('div');
            message.style.cssText = 'font-size: 12px; color: #888; margin-bottom: 8px;';
            
            const bar = document.createElement('div');
            bar.style.cssText = 'height: 4px; background: #3c3c3c; border-radius: 2px; overflow: hidden;';
            
            const fill = document.createElement('div');
            fill.style.cssText = 'height: 100%; background: #2563eb; width: 0%; transition: width 0.3s;';
            bar.appendChild(fill);
            
            progressEl.appendChild(title);
            progressEl.appendChild(message);
            progressEl.appendChild(bar);
            container.appendChild(progressEl);
            
            let progress = 0;
            
            try {
                const result = await task({
                    report: (value) => {
                        if (value.message) message.textContent = value.message;
                        if (value.increment) {
                            progress = Math.min(100, progress + value.increment);
                            fill.style.width = `${progress}%`;
                        }
                    }
                });
                
                return result;
            } finally {
                progressEl.remove();
            }
        },
        
        setStatusBarMessage: (text: string, hideAfterMs?: number): { dispose: () => void } => {
            // Update status bar if exists
            let statusBar = document.getElementById('aethel-status-bar');
            if (!statusBar) {
                statusBar = document.createElement('div');
                statusBar.id = 'aethel-status-bar';
                statusBar.style.cssText = `
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    height: 24px;
                    background: #007acc;
                    color: white;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    padding: 0 10px;
                    z-index: 99998;
                `;
                document.body.appendChild(statusBar);
            }
            
            statusBar.textContent = text;
            
            let timeout: NodeJS.Timeout;
            if (hideAfterMs) {
                timeout = setTimeout(() => {
                    statusBar!.textContent = '';
                }, hideAfterMs);
            }
            
            return {
                dispose: () => {
                    clearTimeout(timeout);
                    statusBar!.textContent = '';
                }
            };
        }
    }
};

// ============================================================================
// GATEWAY CLIENT
// ============================================================================

class GatewayClient {
    private ws: WebSocket | null = null;
    private baseUrl: string;
    private wsUrl: string;
    private listeners: Map<string, Set<(data: any) => void>> = new Map();
    private pendingRequests: Map<string, { resolve: Function; reject: Function }> = new Map();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    
    constructor(baseUrl: string = 'http://localhost:4000') {
        this.baseUrl = baseUrl;
        this.wsUrl = baseUrl.replace('http', 'ws') + '/events';
    }
    
    // HTTP Methods
    async get<T>(path: string): Promise<T> {
        const response = await fetch(`${this.baseUrl}${path}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        return response.json();
    }
    
    async post<T>(path: string, body?: any): Promise<T> {
        const response = await fetch(`${this.baseUrl}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : undefined
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        return response.json();
    }
    
    async delete<T>(path: string): Promise<T> {
        const response = await fetch(`${this.baseUrl}${path}`, { method: 'DELETE' });
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        return response.json();
    }
    
    // WebSocket Methods
    connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(this.wsUrl);
            
            this.ws.onopen = () => {
                this.reconnectAttempts = 0;
                resolve();
            };
            
            this.ws.onclose = () => {
                this.emit('disconnected', {});
                this.tryReconnect();
            };
            
            this.ws.onerror = (error) => {
                reject(error);
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    // Handle RPC responses
                    if (data.requestId && this.pendingRequests.has(data.requestId)) {
                        const { resolve, reject } = this.pendingRequests.get(data.requestId)!;
                        this.pendingRequests.delete(data.requestId);
                        
                        if (data.error) {
                            reject(new Error(data.error));
                        } else {
                            resolve(data.result);
                        }
                        return;
                    }
                    
                    // Handle events
                    if (data.type) {
                        this.emit(data.type, data);
                    }
                } catch (err) {
                    console.error('Failed to parse WebSocket message:', err);
                }
            };
        });
    }
    
    private tryReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.emit('reconnect-failed', {});
            return;
        }
        
        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        
        setTimeout(() => {
            this.connect().catch(() => {
                this.tryReconnect();
            });
        }, delay);
    }
    
    disconnect(): void {
        this.ws?.close();
        this.ws = null;
    }
    
    send(type: string, data: any): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type, ...data }));
        }
    }
    
    request<T>(type: string, data: any): Promise<T> {
        return new Promise((resolve, reject) => {
            const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            this.pendingRequests.set(requestId, { resolve, reject });
            
            // Timeout after 30s
            setTimeout(() => {
                if (this.pendingRequests.has(requestId)) {
                    this.pendingRequests.delete(requestId);
                    reject(new Error('Request timeout'));
                }
            }, 30000);
            
            this.send(type, { ...data, requestId });
        });
    }
    
    on(event: string, callback: (data: any) => void): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);
        
        return () => {
            this.listeners.get(event)?.delete(callback);
        };
    }
    
    private emit(event: string, data: any): void {
        this.listeners.get(event)?.forEach(cb => cb(data));
    }
}

// ============================================================================
// AETHEL SDK
// ============================================================================

class AethelSDK {
    private platform: Platform;
    private gateway: GatewayClient;
    private adapter: typeof theiaAdapter | typeof webAdapter;
    
    constructor() {
        this.platform = detectPlatform();
        this.adapter = this.platform === 'theia' ? theiaAdapter : webAdapter;
        this.gateway = new GatewayClient(
            typeof window !== 'undefined' 
                ? `http://${window.location.hostname}:4000`
                : 'http://localhost:4000'
        );
        
        console.log(`🚀 Aethel SDK initialized (Platform: ${this.platform})`);
    }
    
    /**
     * Window/UI API
     */
    get window() {
        return this.adapter.window;
    }
    
    /**
     * Platform info
     */
    get platform_info() {
        return {
            type: this.platform,
            isTheia: this.platform === 'theia',
            isWeb: this.platform === 'web'
        };
    }
    
    /**
     * Render API
     */
    render = {
        start: async (options: RenderOptions): Promise<string> => {
            const result = await this.gateway.post<{ jobId: string }>('/api/render/start', options);
            return result.jobId;
        },
        
        pause: async (jobId: string): Promise<void> => {
            await this.gateway.post(`/api/render/${jobId}/pause`);
        },
        
        resume: async (jobId: string): Promise<void> => {
            await this.gateway.post(`/api/render/${jobId}/resume`);
        },
        
        cancel: async (jobId: string): Promise<void> => {
            await this.gateway.post(`/api/render/${jobId}/cancel`);
        },
        
        getProgress: async (jobId: string): Promise<RenderJob> => {
            return this.gateway.get(`/api/render/${jobId}/progress`);
        },
        
        onProgress: (jobId: string, callback: (progress: RenderJob) => void): () => void => {
            return this.gateway.on('render-progress', (data) => {
                if (data.jobId === jobId) {
                    callback(data);
                }
            });
        }
    };
    
    /**
     * AI/Generation API
     */
    ai = {
        generate: async (options: GenerationOptions): Promise<{ id: string; url: string }> => {
            return this.gateway.post('/api/ai/generate', options);
        },
        
        chat: async (message: string, context?: any): Promise<string> => {
            const result = await this.gateway.post<{ response: string }>('/api/ai/chat', { message, context });
            return result.response;
        },
        
        getDNA: async (): Promise<any> => {
            return this.gateway.get('/api/ai/dna');
        },
        
        updateDNA: async (dna: any): Promise<void> => {
            await this.gateway.post('/api/ai/dna', dna);
        }
    };
    
    /**
     * Jobs/Queue API
     */
    jobs = {
        list: async (): Promise<any[]> => {
            return this.gateway.get('/api/jobs');
        },
        
        get: async (jobId: string): Promise<any> => {
            return this.gateway.get(`/api/jobs/${jobId}`);
        },
        
        cancel: async (jobId: string): Promise<void> => {
            await this.gateway.delete(`/api/jobs/${jobId}`);
        },
        
        clearCompleted: async (): Promise<void> => {
            await this.gateway.post('/api/jobs/clear-completed');
        },
        
        getStats: async (): Promise<any> => {
            return this.gateway.get('/api/jobs/stats');
        }
    };
    
    /**
     * Health/System API
     */
    health = {
        get: async (): Promise<SystemHealth> => {
            return this.gateway.get('/api/health');
        },
        
        getDashboard: async (): Promise<SystemHealth> => {
            return this.gateway.get('/api/health/dashboard');
        },
        
        subscribe: (callback: (health: SystemHealth) => void): () => void => {
            return this.gateway.on('health-update', callback);
        }
    };
    
    /**
     * Storage/Assets API
     */
    assets = {
        list: async (path?: string): Promise<any[]> => {
            return this.gateway.get(`/api/assets${path ? `?path=${path}` : ''}`);
        },
        
        upload: async (file: File, path?: string): Promise<{ url: string }> => {
            const formData = new FormData();
            formData.append('file', file);
            if (path) formData.append('path', path);
            
            const response = await fetch(`${this.gateway['baseUrl']}/api/assets/upload`, {
                method: 'POST',
                body: formData
            });
            
            return response.json();
        },
        
        download: async (assetId: string): Promise<Blob> => {
            const response = await fetch(`${this.gateway['baseUrl']}/api/assets/${assetId}/download`);
            return response.blob();
        },
        
        delete: async (assetId: string): Promise<void> => {
            await this.gateway.delete(`/api/assets/${assetId}`);
        }
    };
    
    /**
     * Collaboration API
     */
    collaboration = {
        join: async (options: CollaborationOptions): Promise<void> => {
            this.gateway.send('collab-join', options);
        },
        
        leave: async (document: string): Promise<void> => {
            this.gateway.send('collab-leave', { document });
        },
        
        onUserJoined: (callback: (user: { id: string; name: string; color: string }) => void): () => void => {
            return this.gateway.on('collab-user-joined', callback);
        },
        
        onUserLeft: (callback: (userId: string) => void): () => void => {
            return this.gateway.on('collab-user-left', callback);
        },
        
        onCursorUpdate: (callback: (data: { userId: string; position: Position }) => void): () => void => {
            return this.gateway.on('collab-cursor-update', callback);
        },
        
        updateCursor: (position: Position): void => {
            this.gateway.send('collab-cursor', { position });
        }
    };
    
    /**
     * Audio API (delegates to audio engine)
     */
    audio = {
        play: (trackId: string, options?: any): string => {
            // Dynamically import audio engine
            const audioEngine = (window as any).__aethelAudio;
            if (audioEngine) {
                return audioEngine.play(trackId, options);
            }
            console.warn('Audio engine not initialized');
            return '';
        },
        
        stop: (instanceId: string, fade?: number): void => {
            const audioEngine = (window as any).__aethelAudio;
            audioEngine?.stop(instanceId, fade);
        },
        
        setVolume: (channel: string, volume: number): void => {
            const audioEngine = (window as any).__aethelAudio;
            audioEngine?.setChannelVolume(channel, volume);
        }
    };
    
    /**
     * Connection management
     */
    async connect(): Promise<void> {
        await this.gateway.connect();
    }
    
    disconnect(): void {
        this.gateway.disconnect();
    }
    
    onConnectionChange(callback: (connected: boolean) => void): () => void {
        const unsub1 = this.gateway.on('connected', () => callback(true));
        const unsub2 = this.gateway.on('disconnected', () => callback(false));
        
        return () => {
            unsub1();
            unsub2();
        };
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

// Singleton instance
export const aethel = new AethelSDK();

// Export class for testing
export { AethelSDK, GatewayClient };

// Types já são exportados acima nas definições

// For module systems
export default aethel;
