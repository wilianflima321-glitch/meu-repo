// Notification contracts and templates shared by the notification runtime and hooks.

export type NotificationType =
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'achievement'
  | 'objective'
  | 'item'
  | 'level_up'
  | 'message'
  | 'system'
  | 'custom';

export type NotificationPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
  | 'center';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';

export type NotificationAnimation =
  | 'fade'
  | 'slide-left'
  | 'slide-right'
  | 'slide-up'
  | 'slide-down'
  | 'scale'
  | 'bounce'
  | 'none';

export interface NotificationAction {
  id: string;
  label: string;
  icon?: string;
  style?: 'primary' | 'secondary' | 'danger';
  callback?: () => void;
}

export interface NotificationOptions {
  id?: string;
  type?: NotificationType;
  title: string;
  message?: string;
  icon?: string;
  image?: string;
  duration?: number; // ms, 0 = persistent
  priority?: NotificationPriority;
  position?: NotificationPosition;
  animation?: NotificationAnimation;
  sound?: string;
  actions?: NotificationAction[];
  progress?: number; // 0-100
  closable?: boolean;
  pauseOnHover?: boolean;
  group?: string;
  data?: Record<string, unknown>;
  onShow?: () => void;
  onClose?: () => void;
  onClick?: () => void;
}

export interface Notification extends Required<Omit<NotificationOptions, 'onShow' | 'onClose' | 'onClick'>> {
  createdAt: number;
  expiresAt: number | null;
  visible: boolean;
  paused: boolean;
  remainingTime: number;
  onShow?: () => void;
  onClose?: () => void;
  onClick?: () => void;
}

export interface NotificationConfig {
  maxVisible: number;
  defaultDuration: number;
  defaultPosition: NotificationPosition;
  defaultAnimation: NotificationAnimation;
  stackDirection: 'up' | 'down';
  spacing: number;
  sounds: Record<NotificationType, string | null>;
  enableSounds: boolean;
  pauseOnWindowBlur: boolean;
  groupSimilar: boolean;
}

// ============================================================================
// NOTIFICATION TEMPLATES
// ============================================================================

export interface NotificationTemplate {
  type: NotificationType;
  icon: string;
  defaultTitle: string;
  defaultDuration: number;
  sound?: string;
  position?: NotificationPosition;
}

export const NOTIFICATION_TEMPLATES: Record<NotificationType, NotificationTemplate> = {
  success: {
    type: 'success',
    icon: 'OK',
    defaultTitle: 'Success',
    defaultDuration: 3000,
    sound: 'success',
  },
  error: {
    type: 'error',
    icon: 'Error',
    defaultTitle: 'Error',
    defaultDuration: 5000,
    sound: 'error',
  },
  warning: {
    type: 'warning',
    icon: 'Warn',
    defaultTitle: 'Warning',
    defaultDuration: 4000,
    sound: 'warning',
  },
  info: {
    type: 'info',
    icon: 'Info',
    defaultTitle: 'Info',
    defaultDuration: 3000,
    sound: 'info',
  },
  achievement: {
    type: 'achievement',
    icon: 'Trophy',
    defaultTitle: 'Achievement Unlocked',
    defaultDuration: 5000,
    sound: 'achievement',
    position: 'top-center',
  },
  objective: {
    type: 'objective',
    icon: 'Goal',
    defaultTitle: 'New Objective',
    defaultDuration: 4000,
    sound: 'objective',
    position: 'top-left',
  },
  item: {
    type: 'item',
    icon: 'Item',
    defaultTitle: 'Item Received',
    defaultDuration: 3000,
    sound: 'item_pickup',
  },
  level_up: {
    type: 'level_up',
    icon: 'Up',
    defaultTitle: 'Level Up!',
    defaultDuration: 5000,
    sound: 'level_up',
    position: 'center',
  },
  message: {
    type: 'message',
    icon: 'Msg',
    defaultTitle: 'New Message',
    defaultDuration: 4000,
    sound: 'message',
  },
  system: {
    type: 'system',
    icon: 'System',
    defaultTitle: 'System',
    defaultDuration: 3000,
  },
  custom: {
    type: 'custom',
    icon: 'Note',
    defaultTitle: 'Notification',
    defaultDuration: 3000,
  },
};
