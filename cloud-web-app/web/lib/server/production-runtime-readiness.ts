import fs from 'node:fs'
import path from 'node:path'

export interface ProductionRuntimeReadiness {
  envLocalPresent: boolean
  databaseConfigured: boolean
  jwtConfigured: boolean
  csrfConfigured: boolean
  authReady: boolean
  probeReady: boolean
  blockers: string[]
}

export function getProductionRuntimeReadiness(): ProductionRuntimeReadiness {
  const envLocalPath = path.join(process.cwd(), '.env.local')
  const envLocalPresent = fs.existsSync(envLocalPath)
  const databaseConfigured = Boolean(process.env.DATABASE_URL)
  const jwtConfigured = Boolean(process.env.JWT_SECRET) && process.env.JWT_SECRET !== 'aethel-secret-key'
  const csrfConfigured = Boolean(process.env.CSRF_SECRET || process.env.JWT_SECRET)
  const blockers: string[] = []

  if (!envLocalPresent) blockers.push('ENV_LOCAL_MISSING')
  if (!databaseConfigured) blockers.push('DATABASE_URL_MISSING')
  if (!jwtConfigured) blockers.push('JWT_SECRET_MISSING')
  if (!csrfConfigured) blockers.push('CSRF_SECRET_MISSING')

  return {
    envLocalPresent,
    databaseConfigured,
    jwtConfigured,
    csrfConfigured,
    authReady: databaseConfigured && jwtConfigured,
    probeReady: envLocalPresent && databaseConfigured && jwtConfigured,
    blockers,
  }
}
