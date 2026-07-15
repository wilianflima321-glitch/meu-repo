#!/usr/bin/env node

import fs from 'fs'
import path from 'path'

const repoRoot = process.cwd()
const metricsPath = path.join(repoRoot, 'metrics', 'latest_run-production.json')
const dossierPath = path.join(repoRoot, 'metrics', 'l4-readiness-dossier.json')

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required file not found: ${filePath}`)
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function asPercent(value) {
  if (typeof value !== 'number') return 'n/a'
  return `${(value * 100).toFixed(1)}%`
}

try {
  const metrics = readJson(metricsPath)
  const dossier = readJson(dossierPath)

  const totals = metrics?.totals ?? {}
  const productionMetrics = metrics?.metrics ?? {}
  const dossierCriteria = dossier?.exitCriteria ?? {}

  const blockers = []

  if ((metrics?.sampleSize ?? 0) < 100) {
    blockers.push('Production sample size is below 100.')
  }

  if ((totals.rollbackSuccess ?? 0) <= 0) {
    blockers.push('Rollback success evidence is still zero.')
  }

  if ((productionMetrics.workspace_coverage ?? 0) <= 0) {
    blockers.push('Workspace coverage evidence is still zero.')
  }

  if (dossierCriteria?.previewManagedHMR?.met !== true) {
    blockers.push('Managed preview + HMR is not yet validated end-to-end.')
  }

  if (dossierCriteria?.billingCheckoutWebhook?.met !== true) {
    blockers.push('Billing checkout + webhook is not yet validated end-to-end.')
  }

  if (dossierCriteria?.onboardingP50Under90s?.met !== true) {
    blockers.push('Onboarding P50 under 90 seconds is not yet measured/proven.')
  }

  if (dossierCriteria?.costVariance?.met === false || dossier?.targets?.costVariance?.met === false) {
    blockers.push('Cost variance is not yet measured.')
  }

  console.log('Aethel production evidence summary')
  console.log(`- sampleSize: ${metrics?.sampleSize ?? 0}`)
  console.log(`- applySuccessRate: ${asPercent(productionMetrics.apply_success_rate)}`)
  console.log(`- feedbackCoverage: ${asPercent(productionMetrics.feedback_coverage)}`)
  console.log(`- rollbackSuccess: ${totals.rollbackSuccess ?? 0}`)
  console.log(`- workspaceCoverage: ${asPercent(productionMetrics.workspace_coverage)}`)
  console.log(`- sandboxCoverage: ${asPercent(productionMetrics.sandbox_coverage)}`)

  if (blockers.length === 0) {
    console.log('No evidence blockers detected in the current metrics files.')
    process.exit(0)
  }

  console.log('')
  console.log('Remaining evidence blockers:')
  for (const blocker of blockers) {
    console.log(`- ${blocker}`)
  }

  process.exit(0)
} catch (error) {
  console.error('[qa:production-evidence] Failed to validate metrics:', error instanceof Error ? error.message : String(error))
  process.exit(1)
}
