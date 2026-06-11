import type { MoonPhase, Season, TimeOfDay } from './day-night-contracts';

export type RgbColor = { r: number; g: number; b: number };

export function getSolarDeclination(dayOfYear: number): number {
  const dayAngle = (360 / 365) * (dayOfYear - 81) * Math.PI / 180;
  return 23.45 * Math.sin(dayAngle) * Math.PI / 180;
}

export function getMoonPhaseOffset(dayOfYear: number, year: number): number {
  const lunarDay = (dayOfYear + year * 365) % 29.5;
  return lunarDay / 29.5;
}

export function getTimeOfDay(time: number): TimeOfDay {
  if (time >= 5 && time < 6) return 'dawn';
  if (time >= 6 && time < 7.5) return 'sunrise';
  if (time >= 7.5 && time < 11) return 'morning';
  if (time >= 11 && time < 13) return 'noon';
  if (time >= 13 && time < 17) return 'afternoon';
  if (time >= 17 && time < 18.5) return 'sunset';
  if (time >= 18.5 && time < 20) return 'dusk';
  if (time >= 20 || time < 0.5) return 'night';
  if (time >= 0.5 && time < 4) return 'midnight';
  return 'night';
}

export function getSeasonForDay(day: number, enableSeasons: boolean): Season {
  if (!enableSeasons) return 'summer';
  if (day >= 79 && day < 172) return 'spring';
  if (day >= 172 && day < 266) return 'summer';
  if (day >= 266 && day < 355) return 'autumn';
  return 'winter';
}

export function getDayMonth(dayOfYear: number): [number, number] {
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let remaining = dayOfYear;
  let month = 0;

  while (remaining > daysInMonth[month]) {
    remaining -= daysInMonth[month];
    month++;
    if (month >= 12) month = 0;
  }

  return [month + 1, remaining];
}

export function getMoonPhase(offset: number, enableMoonPhases: boolean): MoonPhase {
  if (!enableMoonPhases) return 'full';
  if (offset < 0.0625) return 'new';
  if (offset < 0.1875) return 'waxing_crescent';
  if (offset < 0.3125) return 'first_quarter';
  if (offset < 0.4375) return 'waxing_gibbous';
  if (offset < 0.5625) return 'full';
  if (offset < 0.6875) return 'waning_gibbous';
  if (offset < 0.8125) return 'third_quarter';
  if (offset < 0.9375) return 'waning_crescent';
  return 'new';
}

export function getMoonIllumination(offset: number): number {
  return 0.5 - 0.5 * Math.cos(offset * 2 * Math.PI);
}

export function getNextTimeOfDay(current: TimeOfDay): TimeOfDay {
  const order: TimeOfDay[] = [
    'dawn', 'sunrise', 'morning', 'noon', 'afternoon',
    'sunset', 'dusk', 'night', 'midnight'
  ];

  const index = order.indexOf(current);
  return order[(index + 1) % order.length];
}

export function getTimeOfDayBlend(timeOfDay: TimeOfDay, time: number): number {
  const ranges: Record<TimeOfDay, [number, number]> = {
    dawn: [5, 6],
    sunrise: [6, 7.5],
    morning: [7.5, 11],
    noon: [11, 13],
    afternoon: [13, 17],
    sunset: [17, 18.5],
    dusk: [18.5, 20],
    night: [20, 24.5],
    midnight: [0.5, 4],
  };

  const [start, end] = ranges[timeOfDay];
  const adjustedHour = time < start && timeOfDay === 'night' ? time + 24 : time;
  return Math.max(0, Math.min(1, (adjustedHour - start) / (end - start)));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpColor(a: RgbColor, b: RgbColor, t: number): RgbColor {
  return {
    r: lerp(a.r, b.r, t),
    g: lerp(a.g, b.g, t),
    b: lerp(a.b, b.b, t),
  };
}
