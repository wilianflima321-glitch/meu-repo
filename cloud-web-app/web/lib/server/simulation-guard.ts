import { NextResponse } from 'next/server'

const SIMULATION_DISABLED = process.env.AETHEL_DISABLE_SIMULATION !== 'false'
const ALLOW_PARTIAL = process.env.AETHEL_ALLOW_PARTIAL === 'true'

type SimulationBlockParams = {
  capability: string
  reason: string
  message: string
  missingEnv?: string[]
  status?: number
}

export function blockIfSimulationDisabled(params: SimulationBlockParams): NextResponse | null {
  if (!SIMULATION_DISABLED || ALLOW_PARTIAL) return null
  const { capability, reason, message, missingEnv = [], status = 501 } = params
  return NextResponse.json(
    {
      error: reason,
      message,
      capability,
      capabilityStatus: 'BLOCKED',
      missingEnv,
    },
    {
      status,
      headers: {
        'x-aethel-capability-status': 'BLOCKED',
      },
    }
  )
}

