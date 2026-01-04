import * as React from 'react';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { Message } from '@theia/core/lib/browser';
import { NotificationService } from './notification-service';
/**
 * Notification Center Widget
 */
export declare class NotificationCenterWidget extends ReactWidget {
    static readonly ID = "notification-center-widget";
    static readonly LABEL = "Notifications";
    private notifications;
    private unreadCount;
    protected readonly notificationService: NotificationService;
    protected init(): void;
    protected onActivateRequest(msg: Message): void;
    protected render(): React.ReactNode;
    private renderNotification;
    private getNotificationIcon;
    private formatTimestamp;
}
