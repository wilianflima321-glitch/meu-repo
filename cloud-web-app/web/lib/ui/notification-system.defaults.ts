import type { NotificationConfig } from './notification-system.types';

export const DEFAULT_NOTIFICATION_SOUNDS: NotificationConfig['sounds'] = {
  success: 'ui/success.mp3',
  error: 'ui/error.mp3',
  warning: 'ui/warning.mp3',
  info: 'ui/info.mp3',
  achievement: 'ui/achievement.mp3',
  objective: 'ui/objective.mp3',
  item: 'ui/item.mp3',
  level_up: 'ui/level_up.mp3',
  message: 'ui/message.mp3',
  system: null,
  custom: null,
};

export function createDefaultNotificationConfig(
  config: Partial<NotificationConfig> = {},
): NotificationConfig {
  return {
    maxVisible: 5,
    defaultDuration: 3000,
    defaultPosition: 'top-right',
    defaultAnimation: 'slide-left',
    stackDirection: 'down',
    spacing: 10,
    sounds: DEFAULT_NOTIFICATION_SOUNDS,
    enableSounds: true,
    pauseOnWindowBlur: true,
    groupSimilar: true,
    ...config,
  };
}
