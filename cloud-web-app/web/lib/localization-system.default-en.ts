import type { LocalizationData } from './localization-system'

// ============================================================================
// DEFAULT TRANSLATIONS (English)
// ============================================================================

export const defaultEnglishTranslations: LocalizationData = {
  locale: 'en-US',
  translations: {
    // Common
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.ok': 'OK',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.load': 'Load',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.create': 'Create',
    'common.search': 'Search',
    'common.close': 'Close',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.previous': 'Previous',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.warning': 'Warning',
    'common.info': 'Information',

    // Time
    'time.seconds_ago': {
      value: {
        one: '{count} second ago',
        other: '{count} seconds ago'
      }
    },
    'time.minutes_ago': {
      value: {
        one: '{count} minute ago',
        other: '{count} minutes ago'
      }
    },
    'time.hours_ago': {
      value: {
        one: '{count} hour ago',
        other: '{count} hours ago'
      }
    },
    'time.days_ago': {
      value: {
        one: '{count} day ago',
        other: '{count} days ago'
      }
    },
    'time.weeks_ago': {
      value: {
        one: '{count} week ago',
        other: '{count} weeks ago'
      }
    },
    'time.months_ago': {
      value: {
        one: '{count} month ago',
        other: '{count} months ago'
      }
    },
    'time.years_ago': {
      value: {
        one: '{count} year ago',
        other: '{count} years ago'
      }
    },

    // Game UI
    'game.pause': 'Pause',
    'game.resume': 'Resume',
    'game.restart': 'Restart',
    'game.quit': 'Quit',
    'game.settings': 'Settings',
    'game.new_game': 'New Game',
    'game.continue': 'Continue',
    'game.load_game': 'Load Game',
    'game.save_game': 'Save Game',

    // Settings
    'settings.audio': 'Audio',
    'settings.video': 'Video',
    'settings.controls': 'Controls',
    'settings.language': 'Language',
    'settings.master_volume': 'Master Volume',
    'settings.music_volume': 'Music Volume',
    'settings.sfx_volume': 'SFX Volume',
    'settings.fullscreen': 'Fullscreen',
    'settings.resolution': 'Resolution',
    'settings.vsync': 'V-Sync',
    'settings.quality': 'Quality',
    'settings.quality_low': 'Low',
    'settings.quality_medium': 'Medium',
    'settings.quality_high': 'High',
    'settings.quality_ultra': 'Ultra',

    // Inventory
    'inventory.items': {
      value: {
        one: '{count} item',
        other: '{count} items'
      }
    },
    'inventory.weight': 'Weight: {current}/{max}',
    'inventory.empty': 'Inventory is empty',

    // Quest
    'quest.new': 'New Quest',
    'quest.completed': 'Quest Completed',
    'quest.failed': 'Quest Failed',
    'quest.objectives': 'Objectives',

    // Combat
    'combat.damage': '{value} Damage',
    'combat.heal': '+{value} HP',
    'combat.miss': 'Miss!',
    'combat.critical': 'Critical!'
  }
};
