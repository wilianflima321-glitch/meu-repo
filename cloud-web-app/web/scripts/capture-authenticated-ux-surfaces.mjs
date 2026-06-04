#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import jwt from 'jsonwebtoken'

const ROOT = process.cwd()
const JWT_SECRET = process.env.JWT_SECRET
const AUTHENTICATED_UX_TOKEN = process.env.AUTHENTICATED_UX_TOKEN
const BASE_URL = process.env.AUTHENTICATED_UX_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const OUTPUT_DIR = path.join(ROOT, 'output', 'playwright', 'v22-authenticated')
const DOC_PATH = path.join(ROOT, 'docs', 'AUTHENTICATED_UX_SURFACE_AUDIT.md')
const NAVIGATION_TIMEOUT_MS = Number(process.env.AUTHENTICATED_UX_NAVIGATION_TIMEOUT_MS ?? 90000)
const SCREENSHOT_TIMEOUT_MS = Number(process.env.AUTHENTICATED_UX_SCREENSHOT_TIMEOUT_MS ?? 90000)
const NETWORK_IDLE_TIMEOUT_MS = Number(process.env.AUTHENTICATED_UX_NETWORK_IDLE_TIMEOUT_MS ?? 5000)
const POST_LOAD_SETTLE_MS = Number(process.env.AUTHENTICATED_UX_POST_LOAD_SETTLE_MS ?? 500)
const ROUTE_SIGNAL_WAIT_MS = Number(process.env.AUTHENTICATED_UX_ROUTE_SIGNAL_WAIT_MS ?? 20000)
const MAX_CONSOLE_ERRORS = Number(process.env.AUTHENTICATED_UX_MAX_CONSOLE_ERRORS ?? 0)
const MAX_NETWORK_ERRORS = Number(process.env.AUTHENTICATED_UX_MAX_NETWORK_ERRORS ?? 0)
const SHOULD_SEED_LOCAL_USER =
  process.env.AUTHENTICATED_UX_SEED_USER !== 'false' &&
  /https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?/.test(BASE_URL)

const ROUTES = [
  '/dashboard',
  '/ide',
  '/studio',
  '/studio/level',
  '/studio/level?tool=scene',
  '/studio/film',
  '/admin',
  '/billing',
  '/settings',
  '/evidence',
]

const AUTH_FORBIDDEN_SIGNALS = [
  'Sign in to Aethel',
  'Create your account',
  'Continue with GitHub',
  'Continue with Google',
]

const ROUTE_EXPECTATIONS = {
  '/dashboard': ['Studio Home', 'Mission control', 'Primary flow'],
  '/ide': ['Files', 'Editor', 'AI Console'],
  '/studio': ['Studio', 'Mission', 'Creative'],
  '/studio/level': ['Level Studio', 'World Outliner', 'Inspector'],
  '/studio/level?tool=scene': ['World Studio', 'Scene', 'Hierarchy'],
  '/studio/film': ['Film', 'Director', 'timeline'],
  '/admin': ['Admin', 'Operator', 'Platform'],
  '/billing': ['Billing', 'Plan', 'Usage'],
  '/settings': ['Settings', 'Workspace', 'Account'],
  '/evidence': ['Evidence', 'Receipts', 'Review'],
}

const VIEWPORTS = [
  { id: 'desktop', width: 1440, height: 1000 },
  { id: 'mobile', width: 390, height: 844 },
]

if (!JWT_SECRET && !AUTHENTICATED_UX_TOKEN) {
  console.error('AUTH_QA_SECRET_MISSING: set JWT_SECRET or AUTHENTICATED_UX_TOKEN before running authenticated UX capture.')
  process.exit(1)
}

async function ensureLocalVisualQaUser() {
  const fallback = {
    userId: process.env.AUTHENTICATED_UX_USER_ID || 'visual-qa-user',
    email: process.env.AUTHENTICATED_UX_EMAIL || 'visual-qa@aethel.local',
    role: process.env.AUTHENTICATED_UX_ROLE || 'admin',
    plan: 'studio',
  }

  if (!SHOULD_SEED_LOCAL_USER) return fallback

  try {
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ id: fallback.userId }, { email: fallback.email }],
      },
      select: { id: true, email: true },
    })

    const user = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: {
            email: fallback.email,
            name: 'Aethel Visual QA',
            role: fallback.role,
            adminRole: 'owner',
            plan: fallback.plan,
            emailVerified: true,
            trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          },
          select: { id: true, email: true, role: true, plan: true },
        })
      : await prisma.user.create({
          data: {
            id: fallback.userId,
            email: fallback.email,
            password: 'visual-qa-disabled-password',
            name: 'Aethel Visual QA',
            role: fallback.role,
            adminRole: 'owner',
            plan: fallback.plan,
            emailVerified: true,
            trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          },
          select: { id: true, email: true, role: true, plan: true },
        })

    await prisma.subscription.upsert({
      where: { userId: user.id },
      update: {
        stripeSubscriptionId: `sub_visual_qa_${user.id}`,
        stripePriceId: 'price_visual_qa_studio',
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      create: {
        userId: user.id,
        stripeSubscriptionId: `sub_visual_qa_${user.id}`,
        stripePriceId: 'price_visual_qa_studio',
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })

    await prisma.$disconnect()
    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      plan: user.plan,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[authenticated-ux-capture] local QA user seed skipped: ${message}`)
    return fallback
  }
}

async function loadChromium() {
  try {
    const playwright = await import('playwright')
    return playwright.chromium
  } catch {
    try {
      const test = await import('@playwright/test')
      return test.chromium
    } catch {
      console.error('PLAYWRIGHT_MISSING: install playwright or @playwright/test to capture authenticated surfaces.')
      process.exit(1)
    }
  }
}

function normalizeText(value) {
  return value.replace(/\s+/g, ' ').trim()
}

const qaUser = await ensureLocalVisualQaUser()

const token =
  AUTHENTICATED_UX_TOKEN ||
  jwt.sign(
    {
      userId: qaUser.userId,
      email: qaUser.email,
      role: qaUser.role,
      plan: qaUser.plan,
    },
    JWT_SECRET,
    { expiresIn: '2h' },
  )

fs.mkdirSync(OUTPUT_DIR, { recursive: true })

const chromium = await loadChromium()
const browser = await chromium.launch({ headless: true })
const results = []

async function addAuthToContext(context) {
  await context.addCookies([
    {
      name: 'token',
      value: token,
      url: BASE_URL,
      httpOnly: true,
      sameSite: 'Lax',
    },
  ])
  await context.addInitScript((value) => {
    window.localStorage.setItem('aethel-token', value)
  }, token)
}

async function assertAuthPreflight() {
  const context = await browser.newContext({ viewport: VIEWPORTS[0] })
  await addAuthToContext(context)
  const page = await context.newPage()
  const route = ROUTES[0]
  const url = new URL(route, BASE_URL).toString()

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT_MS })
    await page.waitForTimeout(POST_LOAD_SETTLE_MS)
    const finalUrl = page.url()
    const finalPath = new URL(finalUrl).pathname
    const bodySample = await page
      .locator('body')
      .innerText({ timeout: ROUTE_SIGNAL_WAIT_MS })
      .then((text) => normalizeText(text).slice(0, 600))
      .catch(() => '')
    const forbiddenSignals = AUTH_FORBIDDEN_SIGNALS.filter((signal) => bodySample.toLowerCase().includes(signal.toLowerCase()))

    if (finalPath !== route || forbiddenSignals.length > 0) {
      console.error(
        `[authenticated-ux-capture] AUTH_QA_TOKEN_REJECTED route=${route} finalUrl=${finalUrl} forbidden=${
          forbiddenSignals.join(',') || 'none'
        }`,
      )
      console.error(
        '[authenticated-ux-capture] Make sure the running Next.js server was started with the same JWT_SECRET, or pass a server-accepted AUTHENTICATED_UX_TOKEN.',
      )
      process.exit(1)
    }
  } finally {
    await page.close().catch(() => {})
    await context.close().catch(() => {})
  }
}

await assertAuthPreflight()

for (const viewport of VIEWPORTS) {
  const context = await browser.newContext({ viewport })
  await addAuthToContext(context)

  for (const route of ROUTES) {
    const page = await context.newPage()
    const consoleErrors = []
    const networkErrors = []
    const networkErrorBodies = []
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })
    page.on('response', (response) => {
      const status = response.status()
      if (status < 400) return
      const entry = {
        status,
        url: response.url().replace(BASE_URL, ''),
        method: response.request().method(),
        resourceType: response.request().resourceType(),
        requestBody: response.request().postData()?.replace(/\s+/g, ' ').slice(0, 220) ?? '',
        body: '',
      }
      networkErrors.push(entry)
      networkErrorBodies.push(
        response
          .text()
          .then((body) => {
            entry.body = body.replace(/\s+/g, ' ').slice(0, 220)
          })
          .catch(() => {
            entry.body = 'unavailable'
          }),
      )
    })
    const url = new URL(route, BASE_URL).toString()
    const filename = `${viewport.id}-${route.replace(/^\//, '').replace(/[/?=&]/g, '-') || 'home'}.png`
    const outputPath = path.join(OUTPUT_DIR, filename)
    let status = null
    let finalUrl = url
    let error = null
    let stabilization = 'networkidle'
    let finalPathOk = false
    let pageTitle = ''
    let bodySample = ''
    let matchedSignals = []
    let missingSignals = []
    let forbiddenSignals = []
    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT_MS })
      status = response?.status() ?? null
      finalUrl = page.url()
      finalPathOk = new URL(finalUrl).pathname === route
      try {
        await page.waitForLoadState('networkidle', { timeout: NETWORK_IDLE_TIMEOUT_MS })
      } catch {
        stabilization = `domcontentloaded+settle(${POST_LOAD_SETTLE_MS}ms)`
        await page.waitForTimeout(POST_LOAD_SETTLE_MS)
      }
      if (networkErrorBodies.length) {
        await Promise.allSettled(networkErrorBodies)
      }
      const expectedSignals = ROUTE_EXPECTATIONS[route] ?? []
      if (expectedSignals.length > 0) {
        await page
          .waitForFunction(
            (signals) => {
              const text = document.body?.innerText?.replace(/\s+/g, ' ').trim().toLowerCase() ?? ''
              return signals.some((signal) => text.includes(String(signal).toLowerCase())) || text.length > 160
            },
            expectedSignals,
            { timeout: ROUTE_SIGNAL_WAIT_MS },
          )
          .catch(() => {})
      }
      pageTitle = await page.title().catch(() => '')
      bodySample = await page
        .locator('body')
        .innerText({ timeout: ROUTE_SIGNAL_WAIT_MS })
        .then((text) => normalizeText(text).slice(0, 1600))
        .catch(() => '')
      matchedSignals = expectedSignals.filter((signal) => bodySample.toLowerCase().includes(signal.toLowerCase()))
      missingSignals = expectedSignals.filter((signal) => !bodySample.toLowerCase().includes(signal.toLowerCase()))
      forbiddenSignals = AUTH_FORBIDDEN_SIGNALS.filter((signal) => bodySample.toLowerCase().includes(signal.toLowerCase()))
      await page.screenshot({ path: outputPath, fullPage: true, timeout: SCREENSHOT_TIMEOUT_MS })
    } catch (captureError) {
      error = captureError instanceof Error ? captureError.message : String(captureError)
    } finally {
      await page.close()
    }
    results.push({
      viewport: viewport.id,
      route,
      status,
      finalUrl,
      screenshot: error ? null : path.relative(ROOT, outputPath).replace(/\\/g, '/'),
      consoleErrors,
      networkErrors,
      error,
      stabilization,
      finalPathOk,
      pageTitle,
      bodySample,
      matchedSignals,
      missingSignals,
      forbiddenSignals,
    })
  }
  await context.close()
}

await browser.close()

const doc = `# Authenticated UX Surface Audit

- Base URL: ${BASE_URL}
- Viewports: ${VIEWPORTS.map((viewport) => `${viewport.id} ${viewport.width}x${viewport.height}`).join(', ')}
- Auth method: signed JWT injected through cookie \`token\` and localStorage \`aethel-token\`
- Error budgets: console <= ${MAX_CONSOLE_ERRORS}, network <= ${MAX_NETWORK_ERRORS}
- Note: screenshots live under \`output/playwright/v22-authenticated/\` and are intentionally not versioned.

| Viewport | Route | Status | Final URL | Route match | Screenshot | Stabilization | Signals | Auth chrome | Console errors | Network errors |
| --- | --- | ---: | --- | --- | --- | --- | --- | --- | ---: | ---: |
${results
  .map((result) => `| ${result.viewport} | ${result.route} | ${result.status ?? 'n/a'} | ${result.finalUrl} | ${result.finalPathOk ? 'yes' : 'no'} | ${result.screenshot ?? result.error ?? 'n/a'} | ${result.stabilization} | ${result.missingSignals.length === 0 ? 'ok' : `missing: ${result.missingSignals.join(', ')}`} | ${result.forbiddenSignals.length === 0 ? 'clean' : `forbidden: ${result.forbiddenSignals.join(', ')}`} | ${result.consoleErrors.length} | ${result.networkErrors.length} |`)
  .join('\n')}

## Network Error Evidence

${results
  .filter((result) => result.networkErrors.length > 0)
  .map((result) => {
    const items = result.networkErrors
      .slice(0, 8)
      .map((item) => `  - ${item.method} ${item.status} ${item.url} (${item.resourceType})${item.requestBody ? ` request=${item.requestBody}` : ''}${item.body ? ` - ${item.body}` : ''}`)
      .join('\n')
    return `### ${result.viewport} ${result.route}\n${items}`
  })
  .join('\n\n') || '- none'}
`

fs.writeFileSync(path.join(OUTPUT_DIR, 'index.json'), JSON.stringify(results, null, 2))
fs.writeFileSync(DOC_PATH, doc)

const failed = results.filter((result) => result.error)
if (failed.length) {
  console.error(`[authenticated-ux-capture] FAIL captured=${results.length - failed.length} failed=${failed.length}`)
  for (const result of failed) console.error(`- ${result.viewport} ${result.route}: ${result.error}`)
  process.exit(1)
}

const redirectFailures = results.filter((result) => !result.finalPathOk)
if (redirectFailures.length) {
  console.error(`[authenticated-ux-capture] FAIL authenticated routes redirected=${redirectFailures.length}`)
  for (const result of redirectFailures) {
    console.error(`- ${result.viewport} ${result.route}: finalUrl=${result.finalUrl}`)
  }
  process.exit(1)
}

const signalFailures = results.filter((result) => result.missingSignals.length > 0 || result.forbiddenSignals.length > 0)
if (signalFailures.length) {
  console.error(`[authenticated-ux-capture] FAIL route-signal-mismatch=${signalFailures.length}`)
  for (const result of signalFailures) {
    console.error(`- ${result.viewport} ${result.route}: missing=${result.missingSignals.join(',') || 'none'} forbidden=${result.forbiddenSignals.join(',') || 'none'}`)
  }
  process.exit(1)
}

const totalConsoleErrors = results.reduce((sum, result) => sum + result.consoleErrors.length, 0)
const totalNetworkErrors = results.reduce((sum, result) => sum + result.networkErrors.length, 0)
const budgetFailures = []
if (totalConsoleErrors > MAX_CONSOLE_ERRORS) {
  budgetFailures.push(`consoleErrors=${totalConsoleErrors} above max=${MAX_CONSOLE_ERRORS}`)
}
if (totalNetworkErrors > MAX_NETWORK_ERRORS) {
  budgetFailures.push(`networkErrors=${totalNetworkErrors} above max=${MAX_NETWORK_ERRORS}`)
}
if (budgetFailures.length > 0) {
  console.error(`[authenticated-ux-capture] FAIL ${budgetFailures.join(' ')}`)
  process.exit(1)
}

console.log(`[authenticated-ux-capture] PASS captures=${results.length}`)
