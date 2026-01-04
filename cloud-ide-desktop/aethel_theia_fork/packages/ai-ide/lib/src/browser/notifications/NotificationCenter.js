"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var NotificationCenterWidget_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationCenterWidget = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const inversify_1 = require("inversify");
const react_widget_1 = require("@theia/core/lib/browser/widgets/react-widget");
const notification_service_1 = require("./notification-service");
const lucide_react_1 = require("lucide-react");
/**
 * Notification Center Widget
 */
let NotificationCenterWidget = class NotificationCenterWidget extends react_widget_1.ReactWidget {
    constructor() {
        super(...arguments);
        this.notifications = [];
        this.unreadCount = 0;
    }
    static { NotificationCenterWidget_1 = this; }
    static { this.ID = 'notification-center-widget'; }
    static { this.LABEL = 'Notifications'; }
    init() {
        this.id = NotificationCenterWidget_1.ID;
        this.title.label = NotificationCenterWidget_1.LABEL;
        this.title.caption = NotificationCenterWidget_1.LABEL;
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
    onActivateRequest(msg) {
        super.onActivateRequest(msg);
        this.update();
    }
    render() {
        return ((0, jsx_runtime_1.jsxs)("div", { className: "notification-center", children: [(0, jsx_runtime_1.jsxs)("div", { className: "notification-header", children: [(0, jsx_runtime_1.jsxs)("div", { className: "notification-header-title", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Bell, { size: 20 }), (0, jsx_runtime_1.jsx)("h2", { children: "Notifications" }), this.unreadCount > 0 && ((0, jsx_runtime_1.jsx)("span", { className: "notification-badge", children: this.unreadCount }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "notification-header-actions", children: [this.unreadCount > 0 && ((0, jsx_runtime_1.jsxs)("button", { className: "notification-action-button", onClick: () => this.notificationService.markAllAsRead(), title: "Mark all as read", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Check, { size: 16 }), "Mark all read"] })), (0, jsx_runtime_1.jsxs)("button", { className: "notification-action-button", onClick: () => this.notificationService.clearRead(), title: "Clear read notifications", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.X, { size: 16 }), "Clear read"] })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "notification-list", children: this.notifications.length === 0 ? ((0, jsx_runtime_1.jsxs)("div", { className: "notification-empty", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Bell, { size: 48 }), (0, jsx_runtime_1.jsx)("p", { children: "No notifications" })] })) : (this.notifications.map(notification => this.renderNotification(notification))) }), (0, jsx_runtime_1.jsx)("style", { children: `
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
                ` })] }));
    }
    renderNotification(notification) {
        const icon = this.getNotificationIcon(notification.type);
        const timestamp = this.formatTimestamp(notification.timestamp);
        return ((0, jsx_runtime_1.jsx)("div", { className: `notification-item ${notification.type} ${!notification.read ? 'unread' : ''}`, onClick: () => this.notificationService.markAsRead(notification.id), children: (0, jsx_runtime_1.jsxs)("div", { className: "notification-item-header", children: [(0, jsx_runtime_1.jsx)("div", { className: "notification-item-icon", children: icon }), (0, jsx_runtime_1.jsxs)("div", { className: "notification-item-content", children: [(0, jsx_runtime_1.jsx)("div", { className: "notification-item-title", children: notification.title }), (0, jsx_runtime_1.jsx)("div", { className: "notification-item-message", children: notification.message }), (0, jsx_runtime_1.jsxs)("div", { className: "notification-item-meta", children: [(0, jsx_runtime_1.jsx)("span", { children: timestamp }), (notification.priority === 'high' || notification.priority === 'critical') && ((0, jsx_runtime_1.jsx)("span", { className: `notification-item-priority ${notification.priority}`, children: notification.priority }))] }), notification.actions && notification.actions.length > 0 && ((0, jsx_runtime_1.jsx)("div", { className: "notification-item-actions", children: notification.actions.map((action, index) => ((0, jsx_runtime_1.jsx)("button", { className: `notification-item-action ${action.primary ? '' : 'secondary'}`, onClick: (e) => {
                                        e.stopPropagation();
                                        action.action();
                                    }, children: action.label }, index))) }))] }), (0, jsx_runtime_1.jsx)("button", { className: "notification-item-close", onClick: (e) => {
                            e.stopPropagation();
                            this.notificationService.remove(notification.id);
                        }, children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { size: 16 }) })] }) }, notification.id));
    }
    getNotificationIcon(type) {
        switch (type) {
            case 'info':
                return (0, jsx_runtime_1.jsx)(lucide_react_1.Info, { size: 20, color: "var(--theia-notificationsInfoIcon-foreground)" });
            case 'success':
                return (0, jsx_runtime_1.jsx)(lucide_react_1.CheckCircle, { size: 20, color: "#10b981" });
            case 'warning':
                return (0, jsx_runtime_1.jsx)(lucide_react_1.AlertTriangle, { size: 20, color: "var(--theia-notificationsWarningIcon-foreground)" });
            case 'error':
                return (0, jsx_runtime_1.jsx)(lucide_react_1.AlertCircle, { size: 20, color: "var(--theia-notificationsErrorIcon-foreground)" });
        }
    }
    formatTimestamp(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        if (days > 0)
            return `${days}d ago`;
        if (hours > 0)
            return `${hours}h ago`;
        if (minutes > 0)
            return `${minutes}m ago`;
        return 'Just now';
    }
};
exports.NotificationCenterWidget = NotificationCenterWidget;
__decorate([
    (0, inversify_1.inject)(notification_service_1.NotificationService),
    __metadata("design:type", notification_service_1.NotificationService)
], NotificationCenterWidget.prototype, "notificationService", void 0);
__decorate([
    (0, inversify_1.postConstruct)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], NotificationCenterWidget.prototype, "init", null);
exports.NotificationCenterWidget = NotificationCenterWidget = NotificationCenterWidget_1 = __decorate([
    (0, inversify_1.injectable)()
], NotificationCenterWidget);
