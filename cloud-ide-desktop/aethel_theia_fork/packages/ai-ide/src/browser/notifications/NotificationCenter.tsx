import * as React from 'react';
import { injectable, inject, postConstruct } from 'inversify';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { Message } from '@theia/core/lib/browser';
import { NotificationService, Notification, NotificationType } from './notification-service';
import { Bell, X, Check, AlertCircle, Info, AlertTriangle, CheckCircle } from 'lucide-react';

/**
 * Notification Center Widget
 */
@injectable()
export class NotificationCenterWidget extends ReactWidget {
    static readonly ID = 'notification-center-widget';
    static readonly LABEL = 'Notifications';

    private notifications: Notification[] = [];
    private unreadCount = 0;

    @inject(NotificationService)
    protected readonly notificationService!: NotificationService;

    @postConstruct()
    protected init(): void {
        this.id = NotificationCenterWidget.ID;
        this.title.label = NotificationCenterWidget.LABEL;
        this.title.caption = NotificationCenterWidget.LABEL;
        this.title.closable = true;
        this.title.iconClass = 'fa fa-bell';

        // Subscribe to notification events
        this.notificationService.onNotificationAdded(notification => {
            this.notifications = this.notificationService.getAll();
            this.unreadCount = this.notificationService.getUnreadCount();
            this.update();
        });

        this.notificationService.onNotificationRemoved(() => {
            this.notifications = this.notificationService.getAll();
            this.unreadCount = this.notificationService.getUnreadCount();
            this.update();
        });

        this.notificationService.onNotificationUpdated(() => {
            this.notifications = this.notificationService.getAll();
            this.unreadCount = this.notificationService.getUnreadCount();
            this.update();
        });

        // Initial load
        this.notifications = this.notificationService.getAll();
        this.unreadCount = this.notificationService.getUnreadCount();
        this.update();

        // Cleanup expired notifications periodically
        setInterval(() => {
            this.notificationService.cleanupExpired();
        }, 60000); // Every minute
    }

    protected onActivateRequest(msg: Message): void {
        super.onActivateRequest(msg);
        this.update();
    }

    protected render(): React.ReactNode {
        return (
            <div className="notification-center">
                <div className="notification-header">
                    <div className="notification-header-title">
                        <Bell size={20} />
                        <h2>Notifications</h2>
                        {this.unreadCount > 0 && (
                            <span className="notification-badge">{this.unreadCount}</span>
                        )}
                    </div>
                    <div className="notification-header-actions">
                        {this.unreadCount > 0 && (
                            <button
                                className="notification-action-button"
                                onClick={() => this.notificationService.markAllAsRead()}
                                title="Mark all as read"
                            >
                                <Check size={16} />
                                Mark all read
                            </button>
                        )}
                        <button
                            className="notification-action-button"
                            onClick={() => this.notificationService.clearRead()}
                            title="Clear read notifications"
                        >
                            <X size={16} />
                            Clear read
                        </button>
                    </div>
                </div>

                <div className="notification-list">
                    {this.notifications.length === 0 ? (
                        <div className="notification-empty">
                            <Bell size={48} />
                            <p>No notifications</p>
                        </div>
                    ) : (
                        this.notifications.map(notification => this.renderNotification(notification))
                    )}
                </div>

                <style>{`
                    .notification-center {
                        display: flex;
                        flex-direction: column;
                        height: 100%;
                        background: var(--theia-editor-background);
                        color: var(--theia-editor-foreground);
                    }

                    .notification-header {
                        padding: 1rem;
                        border-bottom: 1px solid var(--theia-panel-border);
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        gap: 1rem;
                    }

                    .notification-header-title {
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                    }

                    .notification-header-title h2 {
                        margin: 0;
                        font-size: 1.25rem;
                        font-weight: 600;
                    }

                    .notification-badge {
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        min-width: 1.5rem;
                        height: 1.5rem;
                        padding: 0 0.5rem;
                        background: var(--theia-badge-background);
                        color: var(--theia-badge-foreground);
                        border-radius: 0.75rem;
                        font-size: 0.75rem;
                        font-weight: 600;
                    }

                    .notification-header-actions {
                        display: flex;
                        gap: 0.5rem;
                    }

                    .notification-action-button {
                        display: flex;
                        align-items: center;
                        gap: 0.25rem;
                        padding: 0.5rem 0.75rem;
                        background: var(--theia-button-secondaryBackground);
                        color: var(--theia-button-secondaryForeground);
                        border: none;
                        border-radius: 4px;
                        font-size: 0.875rem;
                        cursor: pointer;
                        transition: background 0.2s;
                    }

                    .notification-action-button:hover {
                        background: var(--theia-button-secondaryHoverBackground);
                    }

                    .notification-list {
                        flex: 1;
                        overflow-y: auto;
                        padding: 0.5rem;
                    }

                    .notification-empty {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        height: 100%;
                        color: var(--theia-descriptionForeground);
                        gap: 1rem;
                    }

                    .notification-empty p {
                        font-size: 1.125rem;
                    }

                    .notification-item {
                        padding: 1rem;
                        margin-bottom: 0.5rem;
                        background: var(--theia-editor-background);
                        border: 1px solid var(--theia-panel-border);
                        border-radius: 4px;
                        transition: all 0.2s;
                    }

                    .notification-item:hover {
                        border-color: var(--theia-focusBorder);
                    }

                    .notification-item.unread {
                        background: var(--theia-list-hoverBackground);
                        border-left: 3px solid var(--theia-badge-background);
                    }

                    .notification-item.info {
                        border-left-color: var(--theia-notificationsInfoIcon-foreground);
                    }

                    .notification-item.success {
                        border-left-color: #10b981;
                    }

                    .notification-item.warning {
                        border-left-color: var(--theia-notificationsWarningIcon-foreground);
                    }

                    .notification-item.error {
                        border-left-color: var(--theia-notificationsErrorIcon-foreground);
                    }

                    .notification-item-header {
                        display: flex;
                        align-items: flex-start;
                        gap: 0.75rem;
                        margin-bottom: 0.5rem;
                    }

                    .notification-item-icon {
                        flex-shrink: 0;
                        margin-top: 0.125rem;
                    }

                    .notification-item-content {
                        flex: 1;
                        min-width: 0;
                    }

                    .notification-item-title {
                        font-weight: 600;
                        margin-bottom: 0.25rem;
                    }

                    .notification-item-message {
                        font-size: 0.875rem;
                        color: var(--theia-descriptionForeground);
                        line-height: 1.5;
                    }

                    .notification-item-meta {
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        margin-top: 0.5rem;
                        font-size: 0.75rem;
                        color: var(--theia-descriptionForeground);
                    }

                    .notification-item-priority {
                        padding: 0.125rem 0.5rem;
                        border-radius: 4px;
                        font-weight: 600;
                        text-transform: uppercase;
                    }

                    .notification-item-priority.critical {
                        background: var(--theia-notificationsErrorIcon-foreground);
                        color: white;
                    }

                    .notification-item-priority.high {
                        background: var(--theia-notificationsWarningIcon-foreground);
                        color: white;
                    }

                    .notification-item-actions {
                        display: flex;
                        gap: 0.5rem;
                        margin-top: 0.75rem;
                    }

                    .notification-item-action {
                        padding: 0.5rem 1rem;
                        background: var(--theia-button-background);
                        color: var(--theia-button-foreground);
                        border: none;
                        border-radius: 4px;
                        font-size: 0.875rem;
                        cursor: pointer;
                        transition: background 0.2s;
                    }

                    .notification-item-action:hover {
                        background: var(--theia-button-hoverBackground);
                    }

                    .notification-item-action.secondary {
                        background: var(--theia-button-secondaryBackground);
                        color: var(--theia-button-secondaryForeground);
                    }

                    .notification-item-action.secondary:hover {
                        background: var(--theia-button-secondaryHoverBackground);
                    }

                    .notification-item-close {
                        flex-shrink: 0;
                        padding: 0.25rem;
                        background: transparent;
                        border: none;
                        color: var(--theia-descriptionForeground);
                        cursor: pointer;
                        border-radius: 4px;
                        transition: all 0.2s;
                    }

                    .notification-item-close:hover {
                        background: var(--theia-list-hoverBackground);
                        color: var(--theia-editor-foreground);
                    }
                `}</style>
            </div>
        );
    }

    private renderNotification(notification: Notification): React.ReactNode {
        const icon = this.getNotificationIcon(notification.type);
        const timestamp = this.formatTimestamp(notification.timestamp);

        return (
            <div
                key={notification.id}
                className={`notification-item ${notification.type} ${!notification.read ? 'unread' : ''}`}
                onClick={() => this.notificationService.markAsRead(notification.id)}
            >
                <div className="notification-item-header">
                    <div className="notification-item-icon">{icon}</div>
                    <div className="notification-item-content">
                        <div className="notification-item-title">{notification.title}</div>
                        <div className="notification-item-message">{notification.message}</div>
                        <div className="notification-item-meta">
                            <span>{timestamp}</span>
                            {(notification.priority === 'high' || notification.priority === 'critical') && (
                                <span className={`notification-item-priority ${notification.priority}`}>
                                    {notification.priority}
                                </span>
                            )}
                        </div>
                        {notification.actions && notification.actions.length > 0 && (
                            <div className="notification-item-actions">
                                {notification.actions.map((action, index) => (
                                    <button
                                        key={index}
                                        className={`notification-item-action ${action.primary ? '' : 'secondary'}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            action.action();
                                        }}
                                    >
                                        {action.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <button
                        className="notification-item-close"
                        onClick={(e) => {
                            e.stopPropagation();
                            this.notificationService.remove(notification.id);
                        }}
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>
        );
    }

    private getNotificationIcon(type: NotificationType): React.ReactNode {
        switch (type) {
            case 'info':
                return <Info size={20} color="var(--theia-notificationsInfoIcon-foreground)" />;
            case 'success':
                return <CheckCircle size={20} color="#10b981" />;
            case 'warning':
                return <AlertTriangle size={20} color="var(--theia-notificationsWarningIcon-foreground)" />;
            case 'error':
                return <AlertCircle size={20} color="var(--theia-notificationsErrorIcon-foreground)" />;
        }
    }

    private formatTimestamp(timestamp: number): string {
        const now = Date.now();
        const diff = now - timestamp;

        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'Just now';
    }
}
