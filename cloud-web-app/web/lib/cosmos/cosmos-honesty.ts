/**
 * Letter cn — Aethel Cosmos honesty aggregate (soak-gated cosmosScaleReady).
 * Letter co — cosmosPlaytestSoakReady (multi-frame live soak; distinct from cn).
 * Letter cp — pbrSkyViewportReady (Rayleigh/Mie in visible frame; distinct from cn/co).
 * Letter cr — acousticAtmosphereReady (vacuum/hull/atmosphere → audio bus; distinct).
 * (Letter cq reserved — Ocean Mesh Bind + Explicit Buoyancy; do not reuse.)
 */

import { COSMOS_CAPABILITY_BUDGET_WIRED } from '@/lib/cosmos/cosmos-capability-budget'
import {
  COSMOS_LIVE_SOAK_LETTER,
  COSMOS_PLAYTEST_WIRE_LETTER,
  COSMOS_PLAYTEST_WIRE_WIRED,
  proveCosmosLivePlaytestSoak,
  proveCosmosPlaytestSoak,
  type CosmosLivePlaytestSoakResult,
  type CosmosPlaytestSoakResult,
} from '@/lib/cosmos/cosmos-playtest-wire'
import { COSMOS_RENDER_WIRE_WIRED } from '@/lib/cosmos/cosmos-render-wire'
import { COSMOS_SIM_WIRE_WIRED } from '@/lib/cosmos/cosmos-sim-wire'
import {
  COSMOS_ACOUSTIC_ATMOSPHERE_LETTER,
  COSMOS_ACOUSTIC_ATMOSPHERE_WIRE_WIRED,
  proveAcousticAtmosphereSoak,
  type AcousticAtmosphereSoakResult,
} from '@/lib/cosmos/acoustic-atmosphere-wire'
import {
  COSMOS_PBR_SKY_VIEWPORT_LETTER,
  COSMOS_PBR_SKY_VIEWPORT_WIRE_WIRED,
  provePbrSkyViewportSoak,
  type PbrSkyViewportSoakResult,
} from '@/lib/cosmos/pbr-sky-viewport-wire'
import { COSMOS_LETTER, COSMOS_WIRED, type CosmosGearStatus } from '@/lib/cosmos/types'

export const COSMOS_HONESTY_WIRED = true as const

let cachedScaleSoak: boolean | undefined
let lastScaleSoak: CosmosPlaytestSoakResult | null = null
let cachedLiveSoak: boolean | undefined
let lastLiveSoak: CosmosLivePlaytestSoakResult | null = null
let cachedPbrSkyViewportSoak: boolean | undefined
let lastPbrSkyViewportSoak: PbrSkyViewportSoakResult | null = null
let cachedAcousticAtmosphereSoak: boolean | undefined
let lastAcousticAtmosphereSoak: AcousticAtmosphereSoakResult | null = null

export interface CosmosHonestyReport {
  letter:
    | typeof COSMOS_LETTER
    | typeof COSMOS_LIVE_SOAK_LETTER
    | typeof COSMOS_PBR_SKY_VIEWPORT_LETTER
    | typeof COSMOS_ACOUSTIC_ATMOSPHERE_LETTER
  wired: boolean
  /** Letter cn — all Part1 + #1–9 interfaces proven. */
  cosmosScaleReady: boolean
  /**
   * Letter co — multi-frame live soak (floating-origin rebase + nested island +
   * CCD sweep + dual BVH query + CapScore). Distinct from cosmosScaleReady.
   */
  cosmosPlaytestSoakReady: boolean
  /**
   * Letter cp — Rayleigh/Mie applied to viewport background (visible frame).
   * Distinct from cn interface-only and co floating-origin/CCD soak.
   */
  pbrSkyViewportReady: boolean
  /**
   * Letter cr — vacuum/hull/atmosphere transmission applied to playtest audio bus.
   * Distinct from cn acoustic interface-only and cp sky viewport.
   */
  acousticAtmosphereReady: boolean
  gears: CosmosGearStatus[]
  starCitizenSolvedClaimAllowed: false
  mmoSpaceShippedClaimAllowed: false
  agonesFleetLiveAllowed: false
  naniteLiveAllowed: false
  coinsMarketingAllowed: false
  cloudImmortalUniverseMarketingAllowed: false
  /** Painted cubemap skybox must never be claimed as planetary sky. */
  paintedSkyboxClaimAllowed: false
  /** Full Bruneton LUT / UE atmosphere maturity HELD. */
  ueAtmosphereMaturityAllowed: false
  /** Full HRTF AAA / MetaSounds GPU acoustic field HELD. */
  hrtfAaaAllowed: false
  notes: string[]
}

export async function proveCosmosScaleReady(force = false): Promise<boolean> {
  if (!force && cachedScaleSoak === true) return true
  const r = await proveCosmosPlaytestSoak()
  lastScaleSoak = r
  cachedScaleSoak = r.passed
  return r.passed
}

/** Letter co — prove multi-frame live playtest soak. */
export function proveCosmosPlaytestSoakReady(force = false): boolean {
  if (!force && cachedLiveSoak === true) return true
  const r = proveCosmosLivePlaytestSoak()
  lastLiveSoak = r
  cachedLiveSoak = r.passed
  return r.passed
}

/** Letter cp — prove Rayleigh/Mie visible in viewport background. */
export function provePbrSkyViewportReady(force = false): boolean {
  if (!force && cachedPbrSkyViewportSoak === true) return true
  const r = provePbrSkyViewportSoak()
  lastPbrSkyViewportSoak = r
  cachedPbrSkyViewportSoak = r.passed
  return r.passed
}

/** Letter cr — prove vacuum/hull/atmosphere transmission on audio bus. */
export function proveAcousticAtmosphereReady(force = false): boolean {
  if (!force && cachedAcousticAtmosphereSoak === true) return true
  const r = proveAcousticAtmosphereSoak()
  lastAcousticAtmosphereSoak = r
  cachedAcousticAtmosphereSoak = r.passed
  return r.passed
}

export async function probeCosmosHonesty(input?: {
  soakPassed?: boolean
  liveSoakPassed?: boolean
  pbrSkyViewportSoakPassed?: boolean
  acousticAtmosphereSoakPassed?: boolean
}): Promise<CosmosHonestyReport> {
  const cosmosScaleReady =
    input?.soakPassed ??
    (cachedScaleSoak === undefined ? await proveCosmosScaleReady() : cachedScaleSoak)
  const cosmosPlaytestSoakReady =
    input?.liveSoakPassed ??
    (cachedLiveSoak === undefined
      ? proveCosmosPlaytestSoakReady()
      : cachedLiveSoak)
  const pbrSkyViewportReady =
    input?.pbrSkyViewportSoakPassed ??
    (cachedPbrSkyViewportSoak === undefined
      ? provePbrSkyViewportReady()
      : cachedPbrSkyViewportSoak)
  const acousticAtmosphereReady =
    input?.acousticAtmosphereSoakPassed ??
    (cachedAcousticAtmosphereSoak === undefined
      ? proveAcousticAtmosphereReady()
      : cachedAcousticAtmosphereSoak)

  const gears: CosmosGearStatus[] = [
    { id: 'part1-lwc', closed: true },
    { id: 'part1-gravity-volumes', closed: true },
    { id: 'part1-volumetric-streaming', closed: true },
    { id: 'part1-planetary-sdf', closed: true },
    { id: '1-nested-physics-grids', closed: true },
    { id: '2-dual-space-bvh', closed: true },
    { id: '3-reversed-z', closed: true },
    { id: '4-ccd-sweep', closed: true },
    {
      id: '5-interest-management',
      closed: true,
      heldReason: 'Agones fleet / live 5k replication HELD',
    },
    { id: '6-acoustic-atmosphere', closed: true },
    { id: '7-pbr-sky-atmosphere', closed: true },
    { id: '8-floating-origin', closed: true },
    {
      id: '9-actor-persistence',
      closed: true,
      heldReason: 'Cloud immortal-universe marketing HELD without proven DB',
    },
    {
      id: 'co-live-playtest-soak',
      closed: cosmosPlaytestSoakReady,
      heldReason: cosmosPlaytestSoakReady
        ? undefined
        : 'Pending multi-frame floating-origin/nested/CCD/dual-BVH soak',
    },
    {
      id: 'cp-pbr-sky-viewport',
      closed: pbrSkyViewportReady,
      heldReason: pbrSkyViewportReady
        ? undefined
        : 'Pending Rayleigh/Mie visible-frame viewport soak',
    },
    {
      id: 'cr-acoustic-atmosphere-wire',
      closed: acousticAtmosphereReady,
      heldReason: acousticAtmosphereReady
        ? undefined
        : 'Pending vacuum/hull/atmosphere audio-bus soak',
    },
  ]

  const letter = acousticAtmosphereReady
    ? COSMOS_ACOUSTIC_ATMOSPHERE_LETTER
    : pbrSkyViewportReady
      ? COSMOS_PBR_SKY_VIEWPORT_LETTER
      : cosmosPlaytestSoakReady
        ? COSMOS_LIVE_SOAK_LETTER
        : COSMOS_LETTER

  return {
    letter,
    wired:
      COSMOS_WIRED &&
      COSMOS_CAPABILITY_BUDGET_WIRED &&
      COSMOS_RENDER_WIRE_WIRED &&
      COSMOS_SIM_WIRE_WIRED &&
      COSMOS_PLAYTEST_WIRE_WIRED &&
      COSMOS_PBR_SKY_VIEWPORT_WIRE_WIRED &&
      COSMOS_ACOUSTIC_ATMOSPHERE_WIRE_WIRED &&
      COSMOS_HONESTY_WIRED,
    cosmosScaleReady,
    cosmosPlaytestSoakReady,
    pbrSkyViewportReady,
    acousticAtmosphereReady,
    gears,
    starCitizenSolvedClaimAllowed: false,
    mmoSpaceShippedClaimAllowed: false,
    agonesFleetLiveAllowed: false,
    naniteLiveAllowed: false,
    coinsMarketingAllowed: false,
    cloudImmortalUniverseMarketingAllowed: false,
    paintedSkyboxClaimAllowed: false,
    ueAtmosphereMaturityAllowed: false,
    hrtfAaaAllowed: false,
    notes: [
      ...(lastScaleSoak?.notes ?? []),
      ...(lastLiveSoak?.notes ?? []),
      ...(lastPbrSkyViewportSoak?.notes ?? []),
      ...(lastAcousticAtmosphereSoak?.notes ?? []),
      cosmosScaleReady
        ? `cosmosScaleReady CLOSED (letter ${COSMOS_PLAYTEST_WIRE_LETTER}) — interfaces`
        : 'cosmosScaleReady pending soak',
      cosmosPlaytestSoakReady
        ? `cosmosPlaytestSoakReady CLOSED (letter ${COSMOS_LIVE_SOAK_LETTER}) — multi-frame live soak`
        : 'cosmosPlaytestSoakReady pending live soak',
      pbrSkyViewportReady
        ? `pbrSkyViewportReady CLOSED (letter ${COSMOS_PBR_SKY_VIEWPORT_LETTER}) — Rayleigh/Mie visible frame`
        : 'pbrSkyViewportReady pending viewport soak',
      acousticAtmosphereReady
        ? `acousticAtmosphereReady CLOSED (letter ${COSMOS_ACOUSTIC_ATMOSPHERE_LETTER}) — vacuum/hull/atmosphere audio bus`
        : 'acousticAtmosphereReady pending audio-bus soak',
      'Honest competitor: Unreal/Unity also choke at true planetary MMO scale',
      'Do NOT claim MMO space / Star Citizen solved / painted skybox as planetary sky',
      'UE atmosphere / Bruneton LUT maturity HELD',
      'Full HRTF AAA / MetaSounds GPU acoustic field HELD',
    ],
  }
}
