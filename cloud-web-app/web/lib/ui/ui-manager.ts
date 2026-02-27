/**
 * Runtime UI manager for themes, toasts, modals, drag-drop and focus.
 */
import { EventEmitter } from 'events';
import { darkTheme } from './ui-framework-themes';
import type { DragData, DropResult, ModalConfig, Theme, ToastConfig, ToastPosition } from './ui-framework.types';

export class UIManager extends EventEmitter {
  private theme: Theme = darkTheme;
  private toasts: Map<string, ToastConfig & { createdAt: number }> = new Map();
  private modals: Map<string, ModalConfig> = new Map();
  private activeModalStack: string[] = [];
  private focusStack: HTMLElement[] = [];
  private dragData: DragData | null = null;
  
  private toastCounter = 0;
  private defaultToastDuration = 5000;
  private defaultToastPosition: ToastPosition = 'top-right';
  
  constructor(theme?: Theme) {
    super();
    if (theme) this.theme = theme;
  }
  
  // ============================================================================
  // THEME
  // ============================================================================
  
  setTheme(theme: Theme): void {
    this.theme = theme;
    this.emit('themeChanged', { theme });
    this.applyThemeToDocument();
  }
  
  getTheme(): Theme {
    return this.theme;
  }
  
  private applyThemeToDocument(): void {
    if (typeof document === 'undefined') return;
    
    const root = document.documentElement;
    
    // Apply CSS custom properties
    root.style.setProperty('--ui-color-primary', this.theme.colors.primary);
    root.style.setProperty('--ui-color-secondary', this.theme.colors.secondary);
    root.style.setProperty('--ui-color-accent', this.theme.colors.accent);
    root.style.setProperty('--ui-color-background', this.theme.colors.background);
    root.style.setProperty('--ui-color-surface', this.theme.colors.surface);
    root.style.setProperty('--ui-color-error', this.theme.colors.error);
    root.style.setProperty('--ui-color-warning', this.theme.colors.warning);
    root.style.setProperty('--ui-color-success', this.theme.colors.success);
    root.style.setProperty('--ui-color-info', this.theme.colors.info);
    root.style.setProperty('--ui-color-text-primary', this.theme.colors.text.primary);
    root.style.setProperty('--ui-color-text-secondary', this.theme.colors.text.secondary);
    root.style.setProperty('--ui-color-border', this.theme.colors.border);
    root.style.setProperty('--ui-font-family', this.theme.typography.fontFamily);
  }
  
  // ============================================================================
  // TOASTS
  // ============================================================================
  
  showToast(config: ToastConfig): string {
    const id = config.id || `toast_${++this.toastCounter}`;
    const duration = config.duration ?? this.defaultToastDuration;
    const position = config.position ?? this.defaultToastPosition;
    
    const toast = {
      ...config,
      id,
      position,
      createdAt: Date.now(),
    };
    
    this.toasts.set(id, toast);
    this.emit('toastAdded', { toast });
    
    if (duration > 0) {
      setTimeout(() => {
        this.dismissToast(id);
      }, duration);
    }
    
    return id;
  }
  
  dismissToast(id: string): void {
    const toast = this.toasts.get(id);
    if (toast) {
      this.toasts.delete(id);
      this.emit('toastRemoved', { toast });
    }
  }
  
  dismissAllToasts(): void {
    this.toasts.clear();
    this.emit('toastsCleared');
  }
  
  getToasts(): (ToastConfig & { createdAt: number })[] {
    return Array.from(this.toasts.values());
  }
  
  // Convenience methods
  info(message: string, duration?: number): string {
    return this.showToast({ message, type: 'info', duration });
  }
  
  success(message: string, duration?: number): string {
    return this.showToast({ message, type: 'success', duration });
  }
  
  warning(message: string, duration?: number): string {
    return this.showToast({ message, type: 'warning', duration });
  }
  
  error(message: string, duration?: number): string {
    return this.showToast({ message, type: 'error', duration });
  }
  
  // ============================================================================
  // MODALS
  // ============================================================================
  
  openModal(config: ModalConfig): void {
    this.modals.set(config.id, config);
    this.activeModalStack.push(config.id);
    
    // Save current focus
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      this.focusStack.push(document.activeElement);
    }
    
    this.emit('modalOpened', { modal: config });
  }
  
  closeModal(id?: string): void {
    const modalId = id || this.activeModalStack[this.activeModalStack.length - 1];
    if (!modalId) return;
    
    const modal = this.modals.get(modalId);
    if (!modal) return;
    
    this.modals.delete(modalId);
    
    const index = this.activeModalStack.indexOf(modalId);
    if (index >= 0) {
      this.activeModalStack.splice(index, 1);
    }
    
    modal.onClose?.();
    
    // Restore focus
    const previousFocus = this.focusStack.pop();
    if (previousFocus) {
      previousFocus.focus();
    }
    
    this.emit('modalClosed', { modal });
  }
  
  closeAllModals(): void {
    for (const id of [...this.activeModalStack]) {
      this.closeModal(id);
    }
  }
  
  getActiveModal(): ModalConfig | undefined {
    const topId = this.activeModalStack[this.activeModalStack.length - 1];
    return topId ? this.modals.get(topId) : undefined;
  }
  
  isModalOpen(id?: string): boolean {
    if (id) {
      return this.modals.has(id);
    }
    return this.activeModalStack.length > 0;
  }
  
  // ============================================================================
  // DRAG AND DROP
  // ============================================================================
  
  startDrag(type: string, data: unknown, sourceId: string): void {
    this.dragData = { type, data, sourceId };
    this.emit('dragStart', { dragData: this.dragData });
  }
  
  endDrag(): void {
    const data = this.dragData;
    this.dragData = null;
    this.emit('dragEnd', { dragData: data });
  }
  
  getDragData(): DragData | null {
    return this.dragData;
  }
  
  isDragging(): boolean {
    return this.dragData !== null;
  }
  
  canDrop(acceptedTypes: string[]): boolean {
    if (!this.dragData) return false;
    return acceptedTypes.includes(this.dragData.type);
  }
  
  drop(targetId: string): DropResult | null {
    if (!this.dragData) return null;
    
    const result: DropResult = {
      success: true,
      targetId,
      data: this.dragData,
    };
    
    this.emit('drop', { result });
    this.endDrag();
    
    return result;
  }
  
  // ============================================================================
  // FOCUS MANAGEMENT
  // ============================================================================
  
  trapFocus(container: HTMLElement): () => void {
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };
    
    container.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();
    
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }
  
  // ============================================================================
  // UTILITIES
  // ============================================================================
  
  dispose(): void {
    this.toasts.clear();
    this.modals.clear();
    this.activeModalStack = [];
    this.focusStack = [];
    this.dragData = null;
    this.removeAllListeners();
  }
}

