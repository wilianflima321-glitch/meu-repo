/**
 * Compatibility barrel for the integration suite and a few legacy entry points.
 * We keep this intentionally small so dead-code cleanup can continue without
 * recreating the old mega-index surface.
 */

export {
  WeatherSystem,
  WeatherProvider,
  useWeather,
} from './environment/weather-system';
export {
  DayNightCycle,
  DayNightProvider,
  useDayNightCycle,
} from './environment/day-night-cycle';
export {
  SaveManager as AdvancedSaveManager,
  SaveProvider,
  useSaveManager,
} from './save/save-manager';
export {
  SettingsManager,
} from './settings/settings-manager';
export {
  SettingsProvider,
  useSettings,
} from './settings/settings-system';
export {
  NotificationManager,
} from './notifications-system';
export {
  NotificationProvider,
  useNotifications,
} from '@/components/NotificationSystem';
export {
  TooltipManager,
  TooltipProvider,
  useTooltip,
} from './ui/tooltip-system';
export {
  HapticsSystem,
  HapticsProvider,
  useHaptics,
} from './input/haptics-system';
export {
  ControllerMapper,
  ControllerProvider,
  useControllerMapper,
} from './input/controller-mapper';
export {
  CaptureSystem,
  CaptureProvider,
  useCaptureSystem,
} from './capture/capture-system';
export {
  WorldStreamingSystem,
  WorldStreamingProvider,
  useWorldStreaming,
  Octree,
} from './world/world-streaming';

export const AETHEL_VERSION = '1.1.0';
export const ENGINE_NAME = 'Aethel Engine';
