import { TheiaApp } from './theia-app';
import { TheiaNotificationIndicator } from './theia-notification-indicator';
import { TheiaPageObject } from './theia-page-object';
export declare class TheiaNotificationOverlay extends TheiaPageObject {
    protected notificationIndicator: TheiaNotificationIndicator;
    protected readonly HEADER_NOTIFICATIONS = "NOTIFICATIONS";
    protected readonly HEADER_NO_NOTIFICATIONS = "NO NEW NOTIFICATIONS";
    constructor(app: TheiaApp, notificationIndicator: TheiaNotificationIndicator);
    protected get selector(): string;
    protected get containerSelector(): string;
    protected get titleSelector(): string;
    isVisible(): Promise<boolean>;
    waitForVisible(): Promise<void>;
    activate(): Promise<void>;
    toggle(): Promise<void>;
    protected entrySelector(entryText: string): string;
    waitForEntry(entryText: string): Promise<void>;
    waitForEntryDetached(entryText: string): Promise<void>;
    isEntryVisible(entryText: string): Promise<boolean>;
    protected get clearAllButtonSelector(): string;
    clearAllNotifications(): Promise<void>;
}
//# sourceMappingURL=theia-notification-overlay.d.ts.map