import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('notifications-system')


/**
 * Sistema de Notificações Real-time - Aethel Engine
 * 
 * Sistema completo para:
 * - Notificações in-app
 * - Push notifications
 * - WebSocket real-time
 * - Toast notifications
 * 
 * NÃO É MOCK - Sistema real e funcional!
 */

// ============================================================================
// TIPOS
// ============================================================================

export type NotificationType = 
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'system'
  | 'collaboration'
  | 'billing'
  | 'ai'
  | 'achievement';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export type NotificationChannel = 
  | 'in_app'
  | 'push'
  | 'email'
  | 'sms';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  icon?: string;
  imageUrl?: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
  channels: NotificationChannel[];
  read: boolean;
  dismissed: boolean;
  expiresAt?: Date;
  createdAt: Date;
}

export interface NotificationPreferences {
  userId: string;
  channels: {
    in_app: boolean;
    push: boolean;
    email: boolean;
    sms: boolean;
  };
  types: Record<NotificationType, boolean>;
  quietHours?: {
    enabled: boolean;
    start: string; // HH:MM
    end: string;
    timezone: string;
  };
  emailDigest: 'instant' | 'daily' | 'weekly' | 'never';
}

export interface ToastOptions {
  type?: NotificationType;
  duration?: number;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  dismissible?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// ============================================================================
// NOTIFICATION TEMPLATES
// ============================================================================

export const NotificationTemplates = {
  // Colaboração
  collaborator_joined: (name: string, projectName: string) => ({
    type: 'collaboration' as NotificationType,
    title: 'Novo Colaborador',
    message: `${name} entrou no projeto "${projectName}"`,
    icon: '👤',
  }),
  
  collaborator_left: (name: string, projectName: string) => ({
    type: 'collaboration' as NotificationType,
    title: 'Colaborador Saiu',
    message: `${name} saiu do projeto "${projectName}"`,
    icon: '👋',
  }),
  
  comment_added: (name: string, fileName: string) => ({
    type: 'collaboration' as NotificationType,
    title: 'Novo Comentário',
    message: `${name} comentou em "${fileName}"`,
    icon: '💬',
  }),
  
  // AI
  ai_task_complete: (taskName: string) => ({
    type: 'ai' as NotificationType,
    title: 'Tarefa AI Concluída',
    message: `A tarefa "${taskName}" foi concluída com sucesso`,
    icon: '🤖',
  }),
  
  ai_quota_warning: (percentUsed: number) => ({
    type: 'warning' as NotificationType,
    title: 'Limite de AI',
    message: `Você usou ${percentUsed}% do seu limite mensal de tokens AI`,
    icon: '⚠️',
  }),
  
  // Billing
  payment_success: (amount: string) => ({
    type: 'success' as NotificationType,
    title: 'Pagamento Confirmado',
    message: `Seu pagamento de ${amount} foi processado com sucesso`,
    icon: '💳',
  }),
  
  payment_failed: () => ({
    type: 'error' as NotificationType,
    title: 'Falha no Pagamento',
    message: 'Houve um problema com seu pagamento. Por favor, atualize seus dados.',
    icon: '❌',
  }),
  
  trial_ending: (daysLeft: number) => ({
    type: 'warning' as NotificationType,
    title: 'Trial Expirando',
    message: `Seu período de teste termina em ${daysLeft} dias. Faça upgrade para continuar.`,
    icon: '⏰',
  }),
  
  // Sistema
  build_complete: (projectName: string, success: boolean) => ({
    type: success ? 'success' as NotificationType : 'error' as NotificationType,
    title: success ? 'Build Concluído' : 'Build Falhou',
    message: success 
      ? `O build do projeto "${projectName}" foi concluído com sucesso`
      : `O build do projeto "${projectName}" falhou. Verifique os logs.`,
    icon: success ? '✅' : '❌',
  }),
  
  export_ready: (fileName: string, downloadUrl: string) => ({
    type: 'success' as NotificationType,
    title: 'Export Pronto',
    message: `Seu arquivo "${fileName}" está pronto para download`,
    icon: '📦',
    actionUrl: downloadUrl,
    actionLabel: 'Download',
  }),
  
  // Achievements
  achievement_unlocked: (achievementName: string, description: string) => ({
    type: 'achievement' as NotificationType,
    title: '🏆 Conquista Desbloqueada!',
    message: `${achievementName}: ${description}`,
    icon: '🏆',
  }),
};

// ============================================================================
// NOTIFICATION MANAGER (CLIENT-SIDE)
// ============================================================================

type NotificationListener = (notification: Notification) => void;

export class NotificationManager {
  private static instance: NotificationManager;
  private notifications: Notification[] = [];
  private listeners: Set<NotificationListener> = new Set();
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private userId?: string;
  
  private constructor() {
    // Carrega notificações do localStorage
    this.loadFromStorage();
  }
  
  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }
  
  /**
   * Conecta ao WebSocket para notificações real-time
   */
  connect(userId: string): void {
    this.userId = userId;
    
    if (typeof window === 'undefined') return;
    
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/notifications/ws?userId=${userId}`;
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        log.info('[Notifications] WebSocket connected');
        this.reconnectAttempts = 0;
      };
      
      this.ws.onmessage = (event) => {
        try {
          const notification = JSON.parse(event.data) as Notification;
          this.addNotification(notification);
        } catch (e) {
          console.error('[Notifications] Failed to parse message:', e);
        }
      };
      
      this.ws.onclose = () => {
        log.info('[Notifications] WebSocket closed');
        this.attemptReconnect();
      };
      
      this.ws.onerror = (error) => {
        console.error('[Notifications] WebSocket error:', error);
      };
    } catch (error) {
      console.error('[Notifications] Failed to connect:', error);
    }
  }
  
  /**
   * Desconecta do WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.userId = undefined;
  }
  
  /**
   * Tenta reconectar ao WebSocket
   */
  private attemptReconnect(): void {
    if (!this.userId || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    setTimeout(() => {
      if (this.userId) {
        this.connect(this.userId);
      }
    }, delay);
  }
  
  /**
   * Adiciona uma notificação
   */
  addNotification(notification: Notification): void {
    this.notifications.unshift(notification);
    this.saveToStorage();
    this.notifyListeners(notification);
    
    // Mostra toast se for in_app
    if (notification.channels.includes('in_app')) {
      this.showToast(notification);
    }
    
    // Mostra push notification se permitido
    if (notification.channels.includes('push')) {
      this.showPushNotification(notification);
    }
  }
  
  /**
   * Cria e mostra uma notificação local
   */
  notify(
    title: string,
    message: string,
    options?: Partial<Notification>
  ): void {
    const notification: Notification = {
      id: this.generateId(),
      userId: this.userId || '',
      type: options?.type || 'info',
      priority: options?.priority || 'normal',
      title,
      message,
      icon: options?.icon,
      imageUrl: options?.imageUrl,
      actionUrl: options?.actionUrl,
      actionLabel: options?.actionLabel,
      metadata: options?.metadata,
      channels: options?.channels || ['in_app'],
      read: false,
      dismissed: false,
      expiresAt: options?.expiresAt,
      createdAt: new Date(),
    };
    
    this.addNotification(notification);
  }
  
  /**
   * Mostra um toast
   */
  private showToast(notification: Notification): void {
    // Dispatch custom event para o componente Toast capturar
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('aethel:toast', {
        detail: notification,
      }));
    }
  }
  
  /**
   * Mostra push notification nativa
   */
  private async showPushNotification(notification: Notification): Promise<void> {
    if (typeof Notification === 'undefined') return;
    
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: notification.icon || '/icon-192.png',
        tag: notification.id,
        data: { url: notification.actionUrl },
      });
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        this.showPushNotification(notification);
      }
    }
  }
  
  /**
   * Marca notificação como lida
   */
  markAsRead(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.saveToStorage();
    }
  }
  
  /**
   * Marca todas como lidas
   */
  markAllAsRead(): void {
    this.notifications.forEach(n => n.read = true);
    this.saveToStorage();
  }
  
  /**
   * Dispensa uma notificação
   */
  dismiss(notificationId: string): void {
    const index = this.notifications.findIndex(n => n.id === notificationId);
    if (index !== -1) {
      this.notifications.splice(index, 1);
      this.saveToStorage();
    }
  }
  
  /**
   * Limpa todas as notificações
   */
  clearAll(): void {
    this.notifications = [];
    this.saveToStorage();
  }
  
  /**
   * Obtém todas as notificações
   */
  getAll(): Notification[] {
    return [...this.notifications];
  }
  
  /**
   * Obtém notificações não lidas
   */
  getUnread(): Notification[] {
    return this.notifications.filter(n => !n.read);
  }
  
  /**
   * Obtém contagem de não lidas
   */
  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }
  
  /**
   * Adiciona listener para novas notificações
   */
  subscribe(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  /**
   * Notifica todos os listeners
   */
  private notifyListeners(notification: Notification): void {
    this.listeners.forEach(listener => listener(notification));
  }
  
  /**
   * Salva no localStorage
   */
  private saveToStorage(): void {
    if (typeof localStorage !== 'undefined') {
      // Mantém apenas as últimas 100 notificações
      const toSave = this.notifications.slice(0, 100);
      localStorage.setItem('aethel:notifications', JSON.stringify(toSave));
    }
  }
  
  /**
   * Carrega do localStorage
   */
  private loadFromStorage(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem('aethel:notifications');
        if (stored) {
          this.notifications = JSON.parse(stored);
        }
      } catch (e) {
        console.error('[Notifications] Failed to load from storage:', e);
      }
    }
  }
  
  /**
   * Gera ID único
   */
  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// ============================================================================
// REACT HOOKS
// ============================================================================

import { useState, useEffect, useCallback, useMemo } from 'react';

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const manager = useMemo(() => NotificationManager.getInstance(), []);
  
  useEffect(() => {
    // Carrega notificações iniciais
    setNotifications(manager.getAll());
    setUnreadCount(manager.getUnreadCount());
    
    // Subscribe para atualizações
    const unsubscribe = manager.subscribe((notification) => {
      setNotifications(manager.getAll());
      setUnreadCount(manager.getUnreadCount());
    });
    
    return () => unsubscribe();
  }, [manager]);
  
  const markAsRead = useCallback((id: string) => {
    manager.markAsRead(id);
    setNotifications(manager.getAll());
    setUnreadCount(manager.getUnreadCount());
  }, [manager]);
  
  const markAllAsRead = useCallback(() => {
    manager.markAllAsRead();
    setNotifications(manager.getAll());
    setUnreadCount(0);
  }, [manager]);
  
  const dismiss = useCallback((id: string) => {
    manager.dismiss(id);
    setNotifications(manager.getAll());
    setUnreadCount(manager.getUnreadCount());
  }, [manager]);
  
  const clearAll = useCallback(() => {
    manager.clearAll();
    setNotifications([]);
    setUnreadCount(0);
  }, [manager]);
  
  const notify = useCallback((
    title: string,
    message: string,
    options?: Partial<Notification>
  ) => {
    manager.notify(title, message, options);
  }, [manager]);
  
  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismiss,
    clearAll,
    notify,
  };
}

// ============================================================================
// TOAST HOOK
// ============================================================================

export interface Toast extends ToastOptions {
  id: string;
  title: string;
  message: string;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((
    title: string,
    message: string,
    options?: ToastOptions
  ) => {
    const id = `toast_${Date.now()}`;
    const toast: Toast = {
      id,
      title,
      message,
      type: options?.type || 'info',
      duration: options?.duration ?? 5000,
      position: options?.position || 'top-right',
      dismissible: options?.dismissible ?? true,
      action: options?.action,
    };
    
    setToasts(prev => [...prev, toast]);
    
    // Auto-remove
    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, toast.duration);
    }
  }, [removeToast]);
  
  useEffect(() => {
    const handleToast = (event: CustomEvent<Notification>) => {
      const notification = event.detail;
      addToast(notification.title, notification.message, {
        type: notification.type,
        duration: 5000,
      });
    };
    
    window.addEventListener('aethel:toast', handleToast as EventListener);
    return () => window.removeEventListener('aethel:toast', handleToast as EventListener);
  }, [addToast]);
  
  const toast = {
    info: (title: string, message: string, opts?: Omit<ToastOptions, 'type'>) => 
      addToast(title, message, { ...opts, type: 'info' }),
    success: (title: string, message: string, opts?: Omit<ToastOptions, 'type'>) => 
      addToast(title, message, { ...opts, type: 'success' }),
    warning: (title: string, message: string, opts?: Omit<ToastOptions, 'type'>) => 
      addToast(title, message, { ...opts, type: 'warning' }),
    error: (title: string, message: string, opts?: Omit<ToastOptions, 'type'>) => 
      addToast(title, message, { ...opts, type: 'error' }),
  };
  
  return {
    toasts,
    addToast,
    removeToast,
    toast,
  };
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const notifications = typeof window !== 'undefined'
  ? NotificationManager.getInstance()
  : null;

const notificationsSystem = {
  NotificationManager,
  NotificationTemplates,
  useNotifications,
  useToast,
};

export default notificationsSystem;
