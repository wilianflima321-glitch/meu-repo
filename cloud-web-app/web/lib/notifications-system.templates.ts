import type { NotificationType } from '@/lib/notifications-system.types'

export const NotificationTemplates = {
  collaborator_joined: (name: string, projectName: string) => ({
    type: 'collaboration' as NotificationType,
    title: 'Collaborator joined',
    message: `${name} joined "${projectName}".`,
    icon: 'person',
  }),

  collaborator_left: (name: string, projectName: string) => ({
    type: 'collaboration' as NotificationType,
    title: 'Collaborator left',
    message: `${name} left "${projectName}".`,
    icon: 'person',
  }),

  comment_added: (name: string, fileName: string) => ({
    type: 'collaboration' as NotificationType,
    title: 'New comment',
    message: `${name} commented on "${fileName}".`,
    icon: 'comment',
  }),

  ai_task_complete: (taskName: string) => ({
    type: 'ai' as NotificationType,
    title: 'Agent task complete',
    message: `"${taskName}" completed successfully.`,
    icon: 'agent',
  }),

  ai_quota_warning: (percentUsed: number) => ({
    type: 'warning' as NotificationType,
    title: 'AI usage warning',
    message: `${percentUsed}% of the monthly AI token limit has been used.`,
    icon: 'warning',
  }),

  payment_success: (amount: string) => ({
    type: 'success' as NotificationType,
    title: 'Payment confirmed',
    message: `Your ${amount} payment was processed successfully.`,
    icon: 'card',
  }),

  payment_failed: () => ({
    type: 'error' as NotificationType,
    title: 'Payment failed',
    message: 'Update the payment method to keep the workspace active.',
    icon: 'error',
  }),

  trial_ending: (daysLeft: number) => ({
    type: 'warning' as NotificationType,
    title: 'Trial ending',
    message: `The trial ends in ${daysLeft} days.`,
    icon: 'clock',
  }),

  build_complete: (projectName: string, success: boolean) => ({
    type: success ? 'success' as NotificationType : 'error' as NotificationType,
    title: success ? 'Build complete' : 'Build failed',
    message: success
      ? `"${projectName}" finished building.`
      : `"${projectName}" failed to build. Check the logs.`,
    icon: success ? 'check' : 'error',
  }),

  export_ready: (fileName: string, downloadUrl: string) => ({
    type: 'success' as NotificationType,
    title: 'Export ready',
    message: `"${fileName}" is ready to download.`,
    icon: 'package',
    actionUrl: downloadUrl,
    actionLabel: 'Download',
  }),

  achievement_unlocked: (achievementName: string, description: string) => ({
    type: 'achievement' as NotificationType,
    title: 'Achievement unlocked',
    message: `${achievementName}: ${description}`,
    icon: 'trophy',
  }),
}
