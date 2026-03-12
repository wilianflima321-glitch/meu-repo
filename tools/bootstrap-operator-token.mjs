#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import crypto from 'node:crypto'
import { createRequire } from 'node:module'

const repoRoot = process.cwd()
const webRoot = path.join(repoRoot, 'cloud-web-app', 'web')
const envLocalPath = path.join(webRoot, '.env.local')

function parseArgs(argv) {
  const out = {
    email: '',
    projectId: 'default',
  }
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--email' && argv[i + 1]) {
      out.email = String(argv[i + 1]).trim().toLowerCase()
      i += 1
      continue
    }
    if (arg === '--project-id' && argv[i + 1]) {
      out.projectId = String(argv[i + 1]).trim() || 'default'
      i += 1
      continue
    }
  }
  return out
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {}
  const content = fs.readFileSync(filePath, 'utf8')
  const env = {}
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const separatorIndex = line.indexOf('=')
    if (separatorIndex <= 0) continue
    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '')
    env[key] = value
  }
  return env
}

function sanitizeSegment(input, fallback) {
  const value = String(input || '').trim()
  if (!value) return fallback
  const sanitized = value.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)
  return sanitized || fallback
}

function getWorkspaceRoot(userId, projectId) {
  return path.join(
    webRoot,
    '.aethel',
    'workspaces',
    sanitizeSegment(userId, 'anonymous'),
    sanitizeSegment(projectId, 'default')
  )
}

async function ensureProbeFile(userId, projectId) {
  const workspaceRoot = getWorkspaceRoot(userId, projectId)
  await fs.promises.mkdir(workspaceRoot, { recursive: true })
  const probePath = path.join(workspaceRoot, 'probe.ts')
  if (!fs.existsSync(probePath)) {
    const content = [
      'export function operatorProbe(): string {',
      "  return 'aethel-core-loop-production-probe';",
      '}',
      '',
    ].join('\n')
    await fs.promises.writeFile(probePath, content, 'utf8')
  }
  return probePath
}

async function main() {
  if (!fs.existsSync(envLocalPath)) {
    console.error('Missing cloud-web-app/web/.env.local')
    process.exit(1)
  }

  const parsed = parseArgs(process.argv)
  const fileEnv = parseEnvFile(envLocalPath)
  for (const [key, value] of Object.entries(fileEnv)) {
    if (!(key in process.env)) process.env[key] = value
  }

  const jwtSecret = String(process.env.JWT_SECRET || '').trim()
  if (!jwtSecret) {
    console.error('JWT_SECRET missing in .env.local')
    process.exit(1)
  }
  const databaseUrl = String(process.env.DATABASE_URL || '').trim()
  if (!databaseUrl) {
    console.error('DATABASE_URL missing in .env.local')
    process.exit(1)
  }

  const requireFromWeb = createRequire(path.join(webRoot, 'package.json'))
  const { PrismaClient } = requireFromWeb('@prisma/client')
  const jwt = requireFromWeb('jsonwebtoken')
  const prisma = new PrismaClient()

  try {
    let user = null
    if (parsed.email) {
      user = await prisma.user.findUnique({
        where: { email: parsed.email },
        select: { id: true, email: true, role: true, adminRole: true },
      })
    }
    if (!user) {
      user = await prisma.user.findFirst({
        orderBy: { createdAt: 'asc' },
        select: { id: true, email: true, role: true, adminRole: true },
      })
    }
    if (!user) {
      const bootstrapEmail = `ops.bootstrap.${Date.now()}@aethel.local`
      user = await prisma.user.create({
        data: {
          email: bootstrapEmail,
          password: crypto.randomBytes(32).toString('hex'),
          role: 'admin',
          adminRole: 'owner',
          emailVerified: true,
        },
        select: { id: true, email: true, role: true, adminRole: true },
      })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        role: 'admin',
        adminRole: 'owner',
        plan: 'pro',
      },
    })

    const nextBillingWindow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    const probePriceId = String(process.env.STRIPE_PRICE_PRO_MONTHLY || 'price_probe_pro_monthly').trim()
    const existingSubscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
      select: { id: true, stripeSubscriptionId: true },
    })
    if (existingSubscription) {
      await prisma.subscription.update({
        where: { userId: user.id },
        data: {
          status: 'active',
          stripePriceId: probePriceId,
          currentPeriodEnd: nextBillingWindow,
        },
      })
    } else {
      const probeSubscriptionId = `sub_probe_${Date.now()}_${user.id.slice(-8)}`
      await prisma.subscription.create({
        data: {
          userId: user.id,
          stripeSubscriptionId: probeSubscriptionId,
          stripePriceId: probePriceId,
          status: 'active',
          currentPeriodEnd: nextBillingWindow,
        },
      })
    }

    const token = jwt.sign(
      {
        sub: user.id,
        userId: user.id,
        email: user.email,
        role: 'owner',
      },
      jwtSecret,
      { expiresIn: '7d' }
    )

    const probeFilePath = await ensureProbeFile(user.id, parsed.projectId)

    console.log(
      JSON.stringify(
        {
          success: true,
          user: {
            id: user.id,
            email: user.email,
            role: 'owner',
          },
          projectId: parsed.projectId,
          probeFilePath,
          token,
        },
        null,
        2
      )
    )
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
