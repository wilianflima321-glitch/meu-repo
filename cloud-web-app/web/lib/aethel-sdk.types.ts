/** Shared public types for Aethel SDK. */

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
