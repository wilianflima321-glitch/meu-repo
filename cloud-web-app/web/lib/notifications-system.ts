export type {
  Notification,
  NotificationChannel,
  NotificationListener,
  NotificationPreferences,
  NotificationPriority,
  NotificationType,
  Toast,
  ToastOptions,
} from '@/lib/notifications-system.types'
export { NotificationTemplates } from '@/lib/notifications-system.templates'
export { NotificationManager, notifications } from '@/lib/notifications-system.manager'
export { useNotifications, useToast } from '@/lib/notifications-system.hooks'

import { NotificationManager, notifications } from '@/lib/notifications-system.manager'
import { NotificationTemplates } from '@/lib/notifications-system.templates'
import { useNotifications, useToast } from '@/lib/notifications-system.hooks'

const notificationsSystem = {
  NotificationManager,
  NotificationTemplates,
  notifications,
  useNotifications,
  useToast,
}

export default notificationsSystem
