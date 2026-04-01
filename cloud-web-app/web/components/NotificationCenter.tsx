'use client';

import { useCallback, useEffect, useState } from 'react';

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  timestamp: Date;
  read: boolean;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
  source?: string;
}

export default function NotificationCenter({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | NotificationSeverity>('all');

  const saveNotifications = useCallback((notifs: Notification[]) => {
    localStorage.setItem('notifications', JSON.stringify(notifs));
  }, []);

  const loadNotifications = useCallback(() => {
    const stored = localStorage.getItem('notifications');
    if (stored) {
      const parsed = JSON.parse(stored);
      setNotifications(parsed.map((n: any) => ({
        ...n,
        timestamp: new Date(n.timestamp)
      })));
    }
  }, []);

  const addNotification = useCallback((notification: Notification) => {
    setNotifications(prev => {
      const next = [notification, ...prev];
      saveNotifications(next);
      return next;
    });
  }, [saveNotifications]);

  useEffect(() => {
    loadNotifications();
    
    // Listen for new notifications
    const handleNotification = (event: CustomEvent<Notification>) => {
      addNotification(event.detail);
    };
    
    window.addEventListener('notification' as any, handleNotification);
    return () => window.removeEventListener('notification' as any, handleNotification);
  }, [addNotification, loadNotifications]);

  const markAsRead = (id: string) => {
    const updated = notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    );
    setNotifications(updated);
    saveNotifications(updated);
  };

  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    saveNotifications(updated);
  };

  const deleteNotification = (id: string) => {
    const updated = notifications.filter(n => n.id !== id);
    setNotifications(updated);
    saveNotifications(updated);
  };

  const clearAll = () => {
    setNotifications([]);
    saveNotifications([]);
  };

  const getSeverityIcon = (severity: NotificationSeverity): string => {
    switch (severity) {
      case 'info': return 'INFO';
      case 'success': return 'OK';
      case 'warning': return 'WARN';
      case 'error': return 'ERR';
    }
  };

  const getSeverityColor = (severity: NotificationSeverity): string => {
    switch (severity) {
      case 'info': return 'text-blue-400 bg-blue-900/20 border-blue-500';
      case 'success': return 'text-green-400 bg-green-900/20 border-green-500';
      case 'warning': return 'text-yellow-400 bg-yellow-900/20 border-yellow-500';
      case 'error': return 'text-red-400 bg-red-900/20 border-red-500';
    }
  };

  const filteredNotifications = notifications.filter(n => 
    filter === 'all' || n.severity === filter
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-[var(--aethel-surface-secondary)] border-l border-[var(--aethel-border-primary)] shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[var(--aethel-border-primary)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white">Notifications</h2>
            {unreadCount > 0 && (
              <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {(['all', 'info', 'success', 'warning', 'error'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)]'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      {notifications.length > 0 && (
        <div className="p-3 border-b border-[var(--aethel-border-primary)] flex gap-2">
          <button
            onClick={markAllAsRead}
            className="flex-1 px-3 py-2 bg-[var(--aethel-surface-quaternary)] hover:bg-[var(--aethel-surface-tertiary)] text-white text-sm rounded transition-colors"
          >
            Mark All Read
          </button>
          <button
            onClick={clearAll}
            className="flex-1 px-3 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 text-sm rounded transition-colors"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto">
        {filteredNotifications.length === 0 ? (
          <div className="p-8 text-center text-[var(--aethel-text-tertiary)]">
            <div className="text-4xl mb-2">🔔</div>
            <p>No notifications</p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {filteredNotifications.map(notification => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg border transition-colors ${
                  notification.read
                    ? 'bg-[color-mix(in_srgb,var(--aethel-surface-primary)_50%,transparent)] border-[var(--aethel-border-primary)]'
                    : 'bg-[var(--aethel-surface-primary)] border-[var(--aethel-border-secondary)]'
                } ${getSeverityColor(notification.severity)}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">
                    {getSeverityIcon(notification.severity)}
                  </span>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-white">
                        {notification.title}
                      </h3>
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)] transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                    
                    <p className="text-sm text-[var(--aethel-text-secondary)] mb-2">
                      {notification.message}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[var(--aethel-text-tertiary)]">
                        {notification.timestamp.toLocaleTimeString()}
                      </span>
                      
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="text-xs text-blue-400 hover:text-blue-300"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                    
                    {notification.actions && notification.actions.length > 0 && (
                      <div className="mt-3 flex gap-2">
                        {notification.actions.map((action, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              action.action();
                              markAsRead(notification.id);
                            }}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {notification.source && (
                      <div className="mt-2 text-xs text-[var(--aethel-text-tertiary)]">
                        Source: {notification.source}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to show notifications
export function showNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) {
  const event = new CustomEvent('notification', {
    detail: {
      ...notification,
      id: `notif_${Date.now()}_${Math.random()}`,
      timestamp: new Date(),
      read: false
    }
  });
  window.dispatchEvent(event);
}
