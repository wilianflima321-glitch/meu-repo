#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const repoRoot = process.cwd()
const webRoot = path.join(repoRoot, 'cloud-web-app', 'web')
const envExamplePath = path.join(webRoot, '.env.local.example')
const envLocalPath = path.join(webRoot, '.env.local')
const rootEnvTemplatePath = path.join(repoRoot, '.env.template')
const rootEnvPath = path.join(repoRoot, '.env')

function randomSecret() {
  return crypto.randomBytes(32).toString('hex')
}

function randomPassword() {
  return crypto.randomBytes(18).toString('base64url')
}

function ensureLine(content, key, value) {
  const pattern = new RegExp(`^${key}=.*$`, 'm')
  const line = `${key}=${value}`
  if (pattern.test(content)) {
    return content.replace(pattern, line)
  }
  return `${content.trimEnd()}\n${line}\n`
}

function readEnvValue(content, key) {
  const match = content.match(new RegExp(`^${key}=(.*)$`, 'm'))
  if (!match) return null
  return match[1].trim().replace(/^['"]|['"]$/g, '')
}

if (!fs.existsSync(envExamplePath)) {
  console.error(JSON.stringify({ success: false, error: 'ENV_LOCAL_EXAMPLE_MISSING', path: envExamplePath }, null, 2))
  process.exit(1)
}

let rootEnvContent = fs.existsSync(rootEnvPath)
  ? fs.readFileSync(rootEnvPath, 'utf8')
  : fs.existsSync(rootEnvTemplatePath)
    ? fs.readFileSync(rootEnvTemplatePath, 'utf8')
    : ''

const postgresUser = readEnvValue(rootEnvContent, 'POSTGRES_USER') || 'aethel'
const postgresDb = readEnvValue(rootEnvContent, 'POSTGRES_DB') || 'aethel_db'
const postgresPassword = readEnvValue(rootEnvContent, 'POSTGRES_PASSWORD') || randomPassword()
const rootJwtSecret = readEnvValue(rootEnvContent, 'JWT_SECRET') || randomSecret()

rootEnvContent = ensureLine(rootEnvContent || '', 'POSTGRES_USER', postgresUser)
rootEnvContent = ensureLine(rootEnvContent, 'POSTGRES_PASSWORD', postgresPassword)
rootEnvContent = ensureLine(rootEnvContent, 'POSTGRES_DB', postgresDb)
rootEnvContent = ensureLine(rootEnvContent, 'JWT_SECRET', rootJwtSecret)

if (!fs.existsSync(rootEnvPath)) {
  fs.writeFileSync(rootEnvPath, rootEnvContent, 'utf8')
} else {
  fs.writeFileSync(rootEnvPath, rootEnvContent, 'utf8')
}

let content = fs.existsSync(envLocalPath)
  ? fs.readFileSync(envLocalPath, 'utf8')
  : fs.readFileSync(envExamplePath, 'utf8')

const localJwtSecret = readEnvValue(content, 'JWT_SECRET') || rootJwtSecret
const localCsrfSecret = readEnvValue(content, 'CSRF_SECRET') || randomSecret()
const databaseUrl = `postgresql://${postgresUser}:${postgresPassword}@localhost:5432/${postgresDb}?schema=public`

content = ensureLine(content, 'DATABASE_URL', `"${databaseUrl}"`)
content = ensureLine(content, 'JWT_SECRET', `"${localJwtSecret}"`)
content = ensureLine(content, 'CSRF_SECRET', `"${localCsrfSecret}"`)

if (!/^NEXT_PUBLIC_API_URL=/m.test(content)) {
  content = ensureLine(content, 'NEXT_PUBLIC_API_URL', '/api')
}
fs.writeFileSync(envLocalPath, content, 'utf8')

console.log(
  JSON.stringify(
    {
      success: true,
      action: fs.existsSync(envLocalPath) ? 'updated' : 'created',
      paths: {
        rootEnv: rootEnvPath,
        webEnvLocal: envLocalPath,
      },
      nextSteps: [
        'Start Docker daemon',
        'Run docker compose up -d postgres redis',
        'Run npm --prefix cloud-web-app/web run db:push',
        'Optionally add OPENROUTER_API_KEY or other AI provider keys',
        'Run npm run qa:production-runtime-readiness',
      ],
    },
    null,
    2
  )
)
