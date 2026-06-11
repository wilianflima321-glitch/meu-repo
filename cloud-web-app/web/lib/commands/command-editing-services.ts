'use client';

import { logger } from '@/lib/observability/logger';

// ============================================================================
// CLIPBOARD SERVICE (Browser API)
// ============================================================================

class ClipboardService {
  private internalClipboard: unknown = null;

  async copy(data: unknown): Promise<boolean> {
    try {
      if (typeof data === 'string') {
        await navigator.clipboard.writeText(data);
      } else {
        await navigator.clipboard.writeText(JSON.stringify(data));
        this.internalClipboard = data;
      }
      return true;
    } catch (error) {
      logger.error('Clipboard copy failed:', error);
      this.internalClipboard = data;
      return false;
    }
  }

  async paste(): Promise<string> {
    try {
      return await navigator.clipboard.readText();
    } catch (error) {
      logger.error('Clipboard paste failed:', error);
      return '';
    }
  }

  async pasteInternal<T>(): Promise<T | null> {
    return this.internalClipboard as T | null;
  }
}

export const clipboardService = new ClipboardService();

// ============================================================================
// UNDO/REDO MANAGER
// ============================================================================

interface UndoableAction {
  id: string;
  type: string;
  timestamp: number;
  data: unknown;
  undo: () => void | Promise<void>;
  redo: () => void | Promise<void>;
}

class UndoRedoManager {
  private undoStack: UndoableAction[] = [];
  private redoStack: UndoableAction[] = [];
  private maxStackSize = 100;
  private listeners: Set<() => void> = new Set();

  push(action: Omit<UndoableAction, 'id' | 'timestamp'>): void {
    const undoableAction: UndoableAction = {
      ...action,
      id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    this.undoStack.push(undoableAction);
    this.redoStack = []; // Clear redo stack on new action

    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }

    this.notifyListeners();
  }

  async undo(): Promise<boolean> {
    const action = this.undoStack.pop();
    if (!action) return false;

    try {
      await action.undo();
      this.redoStack.push(action);
      this.notifyListeners();
      return true;
    } catch (error) {
      logger.error('Undo failed:', error);
      this.undoStack.push(action); // Restore if failed
      return false;
    }
  }

  async redo(): Promise<boolean> {
    const action = this.redoStack.pop();
    if (!action) return false;

    try {
      await action.redo();
      this.undoStack.push(action);
      this.notifyListeners();
      return true;
    } catch (error) {
      logger.error('Redo failed:', error);
      this.redoStack.push(action); // Restore if failed
      return false;
    }
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  getUndoLabel(): string {
    const action = this.undoStack[this.undoStack.length - 1];
    return action ? action.type : '';
  }

  getRedoLabel(): string {
    const action = this.redoStack[this.redoStack.length - 1];
    return action ? action.type : '';
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.notifyListeners();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
}

export const undoRedoManager = new UndoRedoManager();
