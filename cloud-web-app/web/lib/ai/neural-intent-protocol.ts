/**
 * Aethel Engine — Neural Intent Micro-Protocol (NIMP) v1.0
 *
 * PURPOSE: Ultra-dense, zero-JSON-bloat communication pipeline between Jarvis (Voice Interface)
 * and the Maestro Orchestrator (Apex Swarm / Adaptive MoA).
 *
 * DOCTRINE:
 * 1. Jarvis NEVER edits code or memory directly. It acts as the fast, conversational front-of-house.
 * 2. Jarvis expands human conversational intent with complete technical nuances (Zero-MVP).
 * 3. Inter-agent communication uses compact NIMP bytecode streams instead of verbose JSON.
 * 4. Human feedback is concise and elegant; internal instructions are deeply technical.
 */

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('neural-intent-protocol')

export type NimpDomain =
  | 'GEO' // Geometry / SDF Carving / Meshes
  | 'MAT' // PBR Materials / Shaders / WGSL
  | 'LGT' // Lighting / Color Temp / Attenuation / Shadows
  | 'VOL' // Volumetric Atmosphere / Fog / ACES Post-Processing
  | 'AUD' // Spatial Audio / MetaSounds / Acoustic RT60
  | 'PHY' // Rapier Physics / Colliders / Mass / Friction
  | 'AI'  // Behavior Trees / Navigation / Sensory Perception
  | 'CAM' // Cinematic Camera / Focal Length / Framing

export interface NimpInstruction {
  domain: NimpDomain
  action: string
  params: Record<string, string | number | boolean>
}

export interface NimpPacket {
  version: '1.0'
  sessionId: string
  contextId: string
  intentLabel: string
  humanSpeechSummary: string
  instructions: NimpInstruction[]
  requiresOrchestratorDebate: boolean
  estimatedExecutionMs: number
}

/**
 * Serializes a NIMP packet into a dense, token-efficient string stream.
 * Format: NIMP:1.0|CTX:ctxId#intent|HUM:speechText|DOMAIN:action[k=v;k=v]|...
 */
export function encodeNimpPacket(packet: NimpPacket): string {
  const parts: string[] = [
    `NIMP:${packet.version}`,
    `CTX:${packet.contextId}#${packet.intentLabel}`,
    `HUM:${packet.humanSpeechSummary.replace(/\|/g, '/')}`,
  ]

  for (const inst of packet.instructions) {
    const paramStr = Object.entries(inst.params)
      .map(([k, v]) => `${k}=${v}`)
      .join(';')
    parts.push(`${inst.domain}:${inst.action}[${paramStr}]`)
  }

  return parts.join('|')
}

/**
 * Parses a dense NIMP stream back into a structured packet in sub-millisecond time.
 */
export function decodeNimpPacket(stream: string): NimpPacket | null {
  if (!stream.startsWith('NIMP:1.0|')) {
    log.warn('Invalid NIMP stream header', { stream: stream.slice(0, 30) })
    return null
  }

  try {
    const tokens = stream.split('|')
    let contextId = 'main'
    let intentLabel = 'generic'
    let humanSpeechSummary = 'Processing request...'
    const instructions: NimpInstruction[] = []

    for (let i = 1; i < tokens.length; i++) {
      const token = tokens[i]
      if (token.startsWith('CTX:')) {
        const raw = token.slice(4)
        const [cId, iLabel] = raw.split('#')
        contextId = cId ?? 'main'
        intentLabel = iLabel ?? 'generic'
      } else if (token.startsWith('HUM:')) {
        humanSpeechSummary = token.slice(4)
      } else {
        // Domain instruction: DOMAIN:action[k=v;k=v]
        const match = token.match(/^([A-Z]{2,4}):([a-zA-Z0-9_-]+)\[(.*)\]$/)
        if (match) {
          const domain = match[1] as NimpDomain
          const action = match[2]
          const rawParams = match[3]
          const params: Record<string, string | number | boolean> = {}

          if (rawParams) {
            for (const pair of rawParams.split(';')) {
              const [k, v] = pair.split('=')
              if (k && v !== undefined) {
                if (v === 'true') params[k] = true
                else if (v === 'false') params[k] = false
                else if (!isNaN(Number(v))) params[k] = Number(v)
                else params[k] = v
              }
            }
          }

          instructions.push({ domain, action, params })
        }
      }
    }

    return {
      version: '1.0',
      sessionId: `nimp_${Date.now()}`,
      contextId,
      intentLabel,
      humanSpeechSummary,
      instructions,
      requiresOrchestratorDebate: instructions.length > 2,
      estimatedExecutionMs: instructions.length * 45,
    }
  } catch (error) {
    log.error('Failed to parse NIMP bytecode stream', { error })
    return null
  }
}

/**
 * Deep Intent Expander (The Jarvis Brain Core)
 * Analyzes conversational user speech, anticipates ALL technical sub-needs,
 * and formats the dual-track output:
 * 1. Conversational Speech String (for voice synthesis to user)
 * 2. Dense NIMP Stream (for Maestro orchestrator)
 */
export function expandJarvisIntent(
  userSpeech: string,
  sceneContext?: { selectedActorId?: string; mapName?: string; cameraPos?: [number, number, number] }
): { humanResponse: string; nimpStream: string; packet: NimpPacket } {
  const speech = userSpeech.trim().toLowerCase()
  const map = sceneContext?.mapName ?? 'World_01'
  const instructions: NimpInstruction[] = []
  let humanResponse = 'Entendido, senhor. Processando sua solicitação com os especialistas.'
  let intentLabel = 'custom_direction'

  // Scenario 1: Cavern / Dungeon / Dark Environment
  if (speech.includes('caverna') || speech.includes('cave') || speech.includes('escuro') || speech.includes('dark')) {
    intentLabel = 'sculpt_dark_cavern'
    humanResponse =
      'Entendido, senhor. Analisando a topologia do terreno e ajustando a iluminação volumétrica e a acústica para o clima sombrio.'

    instructions.push(
      { domain: 'GEO', action: 'sdf_carve', params: { x: 0, y: 0, z: 20, radius: 8.5, roughness: 0.85 } },
      { domain: 'MAT', action: 'set_pbr', params: { type: 'wet_rock', roughness: 0.92, metallic: 0.05, normalStrength: 1.5 } },
      { domain: 'LGT', action: 'spawn_torch_cluster', params: { tempK: 2200, lumens: 650, flicker: 0.15, count: 2 } },
      { domain: 'VOL', action: 'adjust_atmosphere', params: { fogDensity: 0.05, evExposure: -2.0, tint: '#0d1117' } },
      { domain: 'AUD', action: 'meta_reverb_preset', params: { preset: 'stone_cavern', rt60: 2.8, damping: 0.45 } },
      { domain: 'PHY', action: 'set_collider_material', params: { friction: 0.85, restitution: 0.1 } }
    )
  }
  // Scenario 2: Forest / Nature / Foliage
  else if (speech.includes('floresta') || speech.includes('forest') || speech.includes('árvore') || speech.includes('tree')) {
    intentLabel = 'generate_dense_forest'
    humanResponse =
      'Coordenando o esquadrão de ambiente. Gerando distribuição de vegetação PBR com curvatura de vento e acústica de folhagem.'

    instructions.push(
      { domain: 'GEO', action: 'scatter_foliage', params: { biome: 'temperate_forest', density: 0.75, radiusMeters: 60 } },
      { domain: 'MAT', action: 'set_foliage_wind', params: { windStrength: 0.4, gustFrequency: 0.25 } },
      { domain: 'LGT', action: 'godray_scattering', params: { sunAngleDeg: 35, rayleigh: 0.08, mie: 0.04 } },
      { domain: 'AUD', action: 'ambient_wind_loop', params: { baseGainDb: -14.0, leafRustle: true } }
    )
  }
  // Scenario 3: Lighting / Shading / Post-Processing
  else if (speech.includes('luz') || speech.includes('light') || speech.includes('cor') || speech.includes('grade')) {
    intentLabel = 'rebalance_lighting'
    humanResponse =
      'Ajustando os parâmetros de iluminação da cena e atualizando a matriz de cor ACES 1.3 em tempo real.'

    instructions.push(
      { domain: 'LGT', action: 'rebalance_exposure', params: { targetLux: 1200, smoothTransitionMs: 800 } },
      { domain: 'VOL', action: 'aces_tonemap_profile', params: { contrast: 1.08, saturation: 1.1, tempK: 5800 } }
    )
  }
  // Scenario 4: Physics & Simulation
  else if (speech.includes('física') || speech.includes('physics') || speech.includes('gravidade') || speech.includes('ragdoll')) {
    intentLabel = 'calibrate_physics_simulation'
    humanResponse =
      'Configurando a autoridade de corpos rígidos no Rapier e ativando o equilíbrio muscular do active ragdoll.'

    instructions.push(
      { domain: 'PHY', action: 'rapier_muscle_equilibrium', params: { stiffness: 1200.0, damping: 45.0, balanceGain: 1.2 } },
      { domain: 'PHY', action: 'zero_copy_sab_sync', params: { targetHz: 60, linearFrameAlloc: true } }
    )
  }
  // Fallback: General Direction Intent
  else {
    humanResponse = `Comando recebido: "${userSpeech}". Encaminhando as instruções técnicas detalhadas ao Maestro.`
    instructions.push(
      { domain: 'AI', action: 'maestro_dispatch_general', params: { rawPrompt: userSpeech, confidence: 0.95 } }
    )
  }

  const packet: NimpPacket = {
    version: '1.0',
    sessionId: `jarvis_${Date.now()}`,
    contextId: map,
    intentLabel,
    humanSpeechSummary: humanResponse,
    instructions,
    requiresOrchestratorDebate: instructions.length > 2,
    estimatedExecutionMs: instructions.length * 50,
  }

  const nimpStream = encodeNimpPacket(packet)

  log.info('Jarvis intent expanded successfully', {
    intentLabel,
    instructionCount: instructions.length,
    estimatedMs: packet.estimatedExecutionMs,
  })

  return { humanResponse, nimpStream, packet }
}
