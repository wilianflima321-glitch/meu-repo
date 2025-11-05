import { TheiaStatusIndicator } from './theia-status-indicator';
export declare class TheiaNotificationIndicator extends TheiaStatusIndicator {
    id: string;
    hasNotifications(): Promise<boolean>;
    waitForVisible(expectNotifications?: boolean): Promise<void>;
    toggleOverlay(): Promise<void>;
}
//# sourceMappingURL=theia-notification-indicator.d.ts.map