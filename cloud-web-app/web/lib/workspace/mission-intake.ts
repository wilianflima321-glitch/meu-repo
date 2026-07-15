import type { Prisma } from '@prisma/client'

export type MissionIntakeInput = {
  mission?: unknown
  source?: unknown
  template?: unknown
}

export type MissionIntake = {
  mission: string
  source: string
  template: string | null
}

const MAX_MISSION_LENGTH = 500
const MAX_NAME_LENGTH = 72
const MAX_SOURCE_LENGTH = 120
const MAX_TEMPLATE_LENGTH = 80
const DEFAULT_SOURCE = 'web-entry'

function readOptionalString(value: unknown): string | null {
  return typeof value === 'string' ? value.trim() : null
}

function compactWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export function parseMissionIntake(input: MissionIntakeInput): MissionIntake | null {
  const mission = compactWhitespace(readOptionalString(input.mission) || '')
  if (!mission) return null

  const source = compactWhitespace(readOptionalString(input.source) || DEFAULT_SOURCE)
  const template = compactWhitespace(readOptionalString(input.template) || '')

  return {
    mission: mission.slice(0, MAX_MISSION_LENGTH),
    source: (source || DEFAULT_SOURCE).slice(0, MAX_SOURCE_LENGTH),
    template: template ? template.slice(0, MAX_TEMPLATE_LENGTH) : null,
  }
}

export function buildMissionWorkspaceName(mission: string): string {
  const normalized = compactWhitespace(mission)
    .replace(/[^\p{L}\p{N}\s._-]/gu, '')
    .slice(0, MAX_NAME_LENGTH)
    .trim()

  return normalized || 'Aethel mission workspace'
}

export function buildMissionHandoffUrl(input: MissionIntake): string {
  const params = new URLSearchParams()
  params.set('mission', input.mission)
  params.set('onboarding', '1')
  params.set('source', input.source)
  params.set('auth', 'required')
  if (input.template) {
    params.set('template', input.template)
  }
  return `/dashboard?${params.toString()}`
}

export function buildMissionProjectSettings(input: MissionIntake): Prisma.InputJsonObject {
  return {
    entry: {
      mission: input.mission,
      source: input.source,
      template: input.template,
      createdFrom: 'web-entry',
      handoff: 'studio-home',
    },
    studio: {
      initialSurface: 'studio-home',
      depthModel: 'web-light-to-studio-cloud',
    },
  }
}
