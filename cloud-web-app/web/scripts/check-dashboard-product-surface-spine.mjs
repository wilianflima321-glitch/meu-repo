#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = process.cwd()
const read = (relativePath) => readFileSync(resolve(ROOT, relativePath), 'utf8')
const fail = (message) => {
  console.error(`dashboard-product-surface-spine failed: ${message}`)
  process.exit(1)
}
const requireToken = (content, token, label) => {
  if (!content.includes(token)) fail(`${label} is missing required token: ${token}`)
}
const forbidToken = (content, token, label) => {
  if (content.includes(token)) fail(`${label} still contains forbidden token: ${token}`)
}
const requireLineBudget = (content, maxLines, label) => {
  const lines = content.split(/\r?\n/).length
  if (lines > maxLines) fail(`${label} has ${lines} lines, expected <= ${maxLines}`)
}
const extractBetween = (content, startToken, endToken, label) => {
  const start = content.indexOf(startToken)
  if (start === -1) fail(`${label} is missing ${startToken}`)
  const end = content.indexOf(endToken, start + startToken.length)
  if (end === -1) fail(`${label} is missing ${endToken} after ${startToken}`)
  return content.slice(start, end)
}

const sidebar = read('components/dashboard/AethelDashboardSidebar.tsx')
const model = read('components/dashboard/aethel-dashboard-model.ts')
const overview = read('components/dashboard/DashboardOverviewTab.tsx')
const mainContent = read('components/dashboard/DashboardMainContent.tsx')
const shell = read('components/dashboard/DashboardShell.tsx')
const dashboardActions = read('components/dashboard/useDashboardActions.ts')
const workspaceActions = read('components/dashboard/useDashboardWorkspaceActions.ts')
const chatActions = read('components/dashboard/useDashboardChatActions.ts')
const billingActions = read('components/dashboard/useDashboardBillingActions.ts')

const primaryItems = extractBetween(sidebar, 'const PRIMARY_ITEMS', 'const NAV_SECTIONS', 'AethelDashboardSidebar')
const navSections = extractBetween(sidebar, 'const NAV_SECTIONS', 'function buildSidebarItemClass', 'AethelDashboardSidebar')

for (const tab of ['overview', 'projects', 'activity']) {
  requireToken(primaryItems, `tab: '${tab}'`, 'Primary dashboard navigation')
}
for (const tab of ['ai-chat', 'billing', 'wallet', 'connectivity', 'templates', 'content-creation', 'unreal']) {
  forbidToken(primaryItems, `tab: '${tab}'`, 'Primary dashboard navigation')
  forbidToken(navSections, `tab: '${tab}'`, 'Secondary dashboard navigation')
}
for (const token of [
  'data-dashboard-sidebar-density="three-primary-tabs"',
  'data-dashboard-primary-tabs="3"',
  'data-dashboard-secondary-tools="drawer-links"',
  'Three paths. Depth on demand.',
  'Open IDE',
  'Evidence',
  "href: '/ide?panel=agents'",
  "href: '/billing'",
  "href: '/settings?tab=integrations'",
]) requireToken(sidebar, token, 'Dashboard sidebar product surface')

for (const token of [
  "export type DashboardPrimaryTab = 'overview' | 'projects' | 'activity'",
  "export const MISSION_CONTROL_TABS = ['overview', 'projects', 'activity']",
  'LEGACY_DASHBOARD_TABS',
  'resolvePrimaryDashboardTab',
]) requireToken(model, token, 'Dashboard tab model')

for (const token of [
  'DashboardWorkspaceLaunch',
  'CanonicalPreviewSurface',
  'Budget',
  'Service status',
]) requireToken(overview, token, 'Dashboard overview')

for (const forbidden of [
  'DashboardEvidenceDisclosure',
  'DashboardFlowRail',
  'DashboardProjectBrainCard',
  'DashboardRepositoryCartographyCard',
]) forbidToken(overview, forbidden, 'Dashboard overview')

for (const token of [
  'DashboardActivitySurface',
  'data-dashboard-primary-surface',
  "primaryActiveTab === 'overview'",
  "primaryActiveTab === 'projects'",
  "primaryActiveTab === 'activity'",
  'Path compressed',
  "href=\"/evidence\"",
  "href=\"/studio\"",
]) requireToken(mainContent, token, 'Dashboard primary surfaces')

for (const forbidden of [
  'DashboardAIChatTab',
  'DashboardWalletTab',
  'DashboardConnectivityTab',
  'DashboardContentCreationTab',
  'DashboardUnrealTab',
  'BillingTab',
  'TemplatesTab',
  "activeTab === 'ai-chat'",
  "activeTab === 'billing'",
  "activeTab === 'wallet'",
  "activeTab === 'connectivity'",
  "activeTab === 'content-creation'",
  "activeTab === 'unreal'",
  "activeTab === 'templates'",
]) forbidToken(mainContent, forbidden, 'Dashboard main content')

for (const token of [
  "href: '/ide?panel=agents'",
  "label: 'Agents'",
]) requireToken(shell, 'Agents', 'Dashboard mobile nav')

requireToken(dashboardActions, 'resolvePrimaryDashboardTab(tab)', 'Dashboard action tab coercion')
requireToken(workspaceActions, "navigateToIdeWithContext('dashboard-agent-handoff', 'agents')", 'Dashboard agent handoff')
requireToken(chatActions, "setActiveTab('activity')", 'Dashboard chat action compression')
requireToken(billingActions, "window.location.assign('/billing')", 'Dashboard billing route handoff')

requireLineBudget(mainContent, 340, 'DashboardMainContent')
requireLineBudget(sidebar, 360, 'AethelDashboardSidebar')
requireLineBudget(dashboardActions, 390, 'useDashboardActions')
requireLineBudget(workspaceActions, 230, 'useDashboardWorkspaceActions')
requireLineBudget(chatActions, 305, 'useDashboardChatActions')

console.log('dashboard-product-surface-spine: ok')
