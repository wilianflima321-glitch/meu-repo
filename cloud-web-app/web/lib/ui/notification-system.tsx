export { NotificationManager } from './notification-system.manager';
export {
  NotificationProvider,
  useGameNotifications,
  useNotificationProgress,
  useNotifications,
  useNotificationsByPosition,
  useToast,
  useVisibleNotifications,
} from './notification-system.hooks';
export { createDefaultNotificationConfig, DEFAULT_NOTIFICATION_SOUNDS } from './notification-system.defaults';
export {
  NOTIFICATION_TEMPLATES,
  type Notification,
  type NotificationAction,
  type NotificationAnimation,
  type NotificationConfig,
  type NotificationOptions,
  type NotificationPosition,
  type NotificationPriority,
  type NotificationTemplate,
  type NotificationType,
} from './notification-system.types';

import { NotificationManager } from './notification-system.manager';
import { NOTIFICATION_TEMPLATES } from './notification-system.types';
import {
  NotificationProvider,
  useGameNotifications,
  useNotificationProgress,
  useNotifications,
  useNotificationsByPosition,
  useToast,
  useVisibleNotifications,
} from './notification-system.hooks';

const notificationSystem = {
  NotificationManager,
  NOTIFICATION_TEMPLATES,
  NotificationProvider,
  useNotifications,
  useVisibleNotifications,
  useNotificationsByPosition,
  useToast,
  useGameNotifications,
  useNotificationProgress,
};

export default notificationSystem;
