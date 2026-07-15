/**
 * Letter cy — combined playtest wires (hot-path, not lib-only).
 */

export {
  FRACTURE_MASS_PLAYTEST_LETTER,
  FRACTURE_MASS_PLAYTEST_WIRED,
  FRACTURE_MASS_PLAYTEST_AGENT_COUNT,
  FRACTURE_MASS_PLAYTEST_DEBRIS_LEVELS,
  createFractureMassPlaytestSession,
  tickFractureMassPlaytest,
  proveFractureMassPlaytestSoak,
  type FractureMassPlaytestSession,
  type FractureMassTickResult,
  type FractureMassPlaytestSoakResult,
} from '@/lib/playtest/fracture-mass-playtest-wire'

export {
  FRACTURE_MASS_PLAYTEST_HONESTY_LETTER,
  FRACTURE_MASS_PLAYTEST_HONESTY_WIRED,
  proveFractureMassPlaytestWire,
  proveFractureMassPlaytestReady,
  probeFractureMassPlaytestHonesty,
  resetFractureMassPlaytestHonestyCache,
  type FractureMassPlaytestHonestyInput,
  type FractureMassPlaytestHonestyReport,
} from '@/lib/playtest/fracture-mass-playtest-honesty'
