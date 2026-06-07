#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import jwt from 'jsonwebtoken'

const ROOT = process.cwd()
const BASE_URL =
  process.env.RUNTIME_FAILURE_SMOKE_BASE_URL ||
  process.env.AUTHENTICATED_UX_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'http://127.0.0.1:3000'
const OUTPUT_DIR = path.join(ROOT, 'output', 'playwright', 'v29-runtime-failure-smoke')
const NAVIGATION_TIMEOUT_MS = Number(process.env.RUNTIME_FAILURE_SMOKE_NAVIGATION_TIMEOUT_MS ?? 90000)
const RECEIPT_TIMEOUT_MS = Number(process.env.RUNTIME_FAILURE_SMOKE_RECEIPT_TIMEOUT_MS ?? 30000)
const SCREENSHOT_TIMEOUT_MS = Number(process.env.RUNTIME_FAILURE_SMOKE_SCREENSHOT_TIMEOUT_MS ?? 60000)
const JWT_SECRET = process.env.JWT_SECRET
const AUTHENTICATED_UX_TOKEN = process.env.AUTHENTICATED_UX_TOKEN

const HARNESSES = [
  {
    id: 'ide-modern-shell-region-boundary',
    route: '/ide?aethelRuntimeFailureSmoke=ide-region-crash-isolated',
    shellSelector: '[data-modern-ide-shell="true"]',
    receiptSelector: '[data-aethel-editor-error-boundary="active"]',
    expectedReceipt: 'error boundary receipt:ide-editor-region',
    blockedClaims: ['uninterrupted IDE execution', 'production ready'],
  },
  {
    id: 'preview-canonical-fallback-surface',
    route: '/ide?aethelRuntimeFailureSmoke=preview-render-fallback',
    shellSelector: '[data-modern-ide-shell="true"]',
    receiptSelector: '[data-aethel-panel-error-boundary]',
    expectedReceipt: 'error boundary receipt:preview-render-adapter',
    blockedClaims: ['native renderer ready', 'final render'],
  },
]

function commandFail(message) {
  console.error(`[v29-runtime-failure-smoke-runner] FAIL ${message}`)
  process.exit(1)
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
      commandFail('PLAYWRIGHT_MISSING: install playwright or @playwright/test before running browser smoke harnesses.')
    }
  }
}

function buildToken() {
  if (AUTHENTICATED_UX_TOKEN) return AUTHENTICATED_UX_TOKEN
  if (!JWT_SECRET) {
    commandFail('AUTH_TOKEN_MISSING: set JWT_SECRET or AUTHENTICATED_UX_TOKEN before running authenticated smoke harnesses.')
  }

  return jwt.sign(
    {
      userId: process.env.RUNTIME_FAILURE_SMOKE_USER_ID || 'runtime-smoke-user',
      email: process.env.RUNTIME_FAILURE_SMOKE_EMAIL || 'runtime-smoke@aethel.local',
      role: process.env.RUNTIME_FAILURE_SMOKE_ROLE || 'admin',
      plan: 'studio',
    },
    JWT_SECRET,
    { expiresIn: '45m' },
  )
}

function normalizeUrl(route) {
  return new URL(route, BASE_URL).toString()
}

function sanitizeFilename(value) {
  return value.replace(/[^a-z0-9-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase()
}

function unique(values) {
  return Array.from(new Set(values.map((value) => String(value).trim()).filter(Boolean)))
}

function buildResultEvidenceRefs(result) {
  return unique([
    `runtime-failure-smoke-browser:${result.id}`,
    `runtime-failure-smoke-browser-screenshot:${result.screenshot}`,
    result.receipt ? `runtime-failure-smoke-browser-receipt:${result.receipt}` : '',
  ])
}

async function addAuth(context, token) {
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

async function runHarness(browser, harness, token) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  await addAuth(context, token)
  const page = await context.newPage()
  const consoleErrors = []
  const networkErrors = []

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('requestfailed', (request) => {
    networkErrors.push(`${request.method()} ${request.url()} ${request.failure()?.errorText ?? 'failed'}`)
  })

  const url = normalizeUrl(harness.route)
  const screenshot = path.join(OUTPUT_DIR, `${sanitizeFilename(harness.id)}.png`)

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT_MS })
    const finalUrl = page.url()
    const finalPath = new URL(finalUrl).pathname
    if (finalPath !== '/ide') {
      throw new Error(`expected /ide, got ${finalUrl}`)
    }

    await page.locator(harness.shellSelector).waitFor({ state: 'attached', timeout: RECEIPT_TIMEOUT_MS })
    const receipt = page.locator(harness.receiptSelector).first()
    await receipt.waitFor({ state: 'attached', timeout: RECEIPT_TIMEOUT_MS })
    const receiptValue = await receipt.getAttribute('data-aethel-runtime-failure-smoke-receipt')
    await page.screenshot({ path: screenshot, fullPage: true, timeout: SCREENSHOT_TIMEOUT_MS })

    const result = {
      id: harness.id,
      route: harness.route,
      finalUrl,
      recoveredWithBoundary: Boolean(receiptValue),
      receipt: receiptValue,
      expectedReceipt: harness.expectedReceipt,
      screenshot: path.relative(ROOT, screenshot).replace(/\\/g, '/'),
      blockedClaims: harness.blockedClaims,
      marketClaimAllowed: false,
      releaseReady: false,
      strictReceiptMatch: receiptValue === harness.expectedReceipt,
      evidenceRefs: [],
      consoleErrors: consoleErrors.filter((error) => !error.includes('AETHEL_RUNTIME_FAILURE_SMOKE')),
      networkErrors,
    }

    return {
      ...result,
      evidenceRefs: buildResultEvidenceRefs(result),
    }
  } finally {
    await page.close().catch(() => {})
    await context.close().catch(() => {})
  }
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true })

const token = buildToken()
const chromium = await loadChromium()
const browser = await chromium.launch({ headless: true })

try {
  const results = []
  for (const harness of HARNESSES) {
    results.push(await runHarness(browser, harness, token))
  }

  const failures = results.flatMap((result) => [
    ...(result.recoveredWithBoundary ? [] : [`${result.id}: missing error-boundary receipt`]),
    ...(result.receipt ? [] : [`${result.id}: missing receipt value`]),
    ...(result.receipt === result.expectedReceipt ? [] : [`${result.id}: receipt mismatch expected=${result.expectedReceipt} actual=${result.receipt ?? 'none'}`]),
    ...(result.marketClaimAllowed === false ? [] : [`${result.id}: market claim allowed`]),
    ...(result.releaseReady === false ? [] : [`${result.id}: releaseReady must remain false`]),
  ])

  const report = {
    version: 1,
    capability: 'AETHEL_RUNTIME_FAILURE_SMOKE_BROWSER_RUNNER',
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    harnessCount: results.length,
    passedCount: results.length - failures.length,
    strictReceiptMatchCount: results.filter((result) => result.strictReceiptMatch).length,
    marketClaimAllowed: false,
    releaseReady: false,
    results,
    failures,
    evidenceRefs: unique(results.flatMap((result) => result.evidenceRefs)),
    nextAction: 'Persist these browser receipts into the runtime evidence package after human review.',
  }

  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.json'), `${JSON.stringify(report, null, 2)}\n`)

  if (failures.length) {
    console.error('[v29-runtime-failure-smoke-runner] FAIL')
    for (const failure of failures) console.error(`- ${failure}`)
    process.exit(1)
  }

  console.log(`[v29-runtime-failure-smoke-runner] PASS harnesses=${results.length} output=${path.relative(ROOT, OUTPUT_DIR)}`)
} finally {
  await browser.close().catch(() => {})
}
