/**
 * Notification Toast Component
 * Displays toast notifications with actions
 */

import React, { useEffect, useState } from 'react';
import { getNotificationManager, Notification } from '../../lib/notifications/notification-manager';

export const NotificationToast: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notificationManager = getNotificationManager();

  useEffect(() => {
    const updateNotifications = () => {
      setNotifications(notificationManager.getNotifications());
    };

    updateNotifications();

    const unsubscribe = notificationManager.onChange(updateNotifications);
    return unsubscribe;
  }, [notificationManager]);

  const handleDismiss = (id: string) => {
    notificationManager.dismiss(id);
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'success': return '✅';
      case 'info': return 'ℹ️';
      default: return 'ℹ️';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return '#f14c4c';
      case 'warning': return '#cca700';
      case 'success': return '#89d185';
      case 'info': return '#3794ff';
      default: return '#3794ff';
    }
  };

  return (
    <div className="notification-container">
      {notifications.slice(0, 5).map((notification) => (
        <div
          key={notification.id}
          className="notification-toast"
          style={{ borderLeftColor: getSeverityColor(notification.severity) }}
        >
          <div className="notification-icon">
            {getSeverityIcon(notification.severity)}
          </div>

          <div className="notification-content">
            <div className="notification-message">{notification.message}</div>

            {notification.actions && notification.actions.length > 0 && (
              <div className="notification-actions">
                {notification.actions.map((action, index) => (
                  <button
                    key={index}
                    className="notification-action-button"
                    onClick={() => {
                      action.callback();
                      handleDismiss(notification.id);
                    }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            className="notification-close"
            onClick={() => handleDismiss(notification.id)}
          >
            ×
          </button>
        </div>
      ))}

      <style jsx>{`
        .notification-container {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 10000;
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-width: 400px;
        }

        .notification-toast {
          display: flex;
          align-items: flex-start;
          background: var(--panel-bg);
          border: 1px solid var(--panel-border);
          border-left: 4px solid;
          border-radius: 4px;
          padding: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .notification-icon {
          font-size: 20px;
          margin-right: 12px;
        }

        .notification-content {
          flex: 1;
          min-width: 0;
        }

        .notification-message {
          font-size: 13px;
          color: var(--editor-fg);
          margin-bottom: 8px;
          word-wrap: break-word;
        }

        .notification-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .notification-action-button {
          padding: 4px 12px;
          background: var(--activitybar-activeBorder);
          border: none;
          color: white;
          font-size: 12px;
          cursor: pointer;
          border-radius: 3px;
        }

        .notification-action-button:hover {
          opacity: 0.9;
        }

        .notification-close {
          background: none;
          border: none;
          color: var(--editor-fg);
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.6;
        }

        .notification-close:hover {
          opacity: 1;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
      `}</style>
    </div>
  );
};
