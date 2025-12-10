'use client';

import { useState, useEffect } from 'react';

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

  useEffect(() => {
    loadNotifications();
    
    // Listen for new notifications
    const handleNotification = (event: CustomEvent<Notification>) => {
      addNotification(event.detail);
    };
    
    window.addEventListener('notification' as any, handleNotification);
    return () => window.removeEventListener('notification' as any, handleNotification);
  }, []);

  const loadNotifications = () => {
    // Load from localStorage
    const stored = localStorage.getItem('notifications');
    if (stored) {
      const parsed = JSON.parse(stored);
      setNotifications(parsed.map((n: any) => ({
        ...n,
        timestamp: new Date(n.timestamp)
      })));
    }
  };

  const saveNotifications = (notifs: Notification[]) => {
    localStorage.setItem('notifications', JSON.stringify(notifs));
  };

  const addNotification = (notification: Notification) => {
    const newNotifications = [notification, ...notifications];
    setNotifications(newNotifications);
    saveNotifications(newNotifications);
  };

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
      case 'info': return 'ℹ️';
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
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
    <div className="fixed inset-y-0 right-0 w-96 bg-slate-800 border-l border-slate-700 shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white">Notifications</h2>
            {unreadCount > 0 && (
              <span className="px-2 py-1 bg-purple-600 text-white text-xs rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
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
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      {notifications.length > 0 && (
        <div className="p-3 border-b border-slate-700 flex gap-2">
          <button
            onClick={markAllAsRead}
            className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
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
          <div className="p-8 text-center text-slate-400">
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
                    ? 'bg-slate-900/50 border-slate-700'
                    : 'bg-slate-900 border-slate-600'
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
                        className="text-slate-500 hover:text-white transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                    
                    <p className="text-sm text-slate-300 mb-2">
                      {notification.message}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        {notification.timestamp.toLocaleTimeString()}
                      </span>
                      
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="text-xs text-purple-400 hover:text-purple-300"
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
                            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded transition-colors"
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {notification.source && (
                      <div className="mt-2 text-xs text-slate-500">
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
