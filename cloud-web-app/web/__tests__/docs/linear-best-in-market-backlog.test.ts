import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = join(__dirname, '..', '..', '..', '..')

function read(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('Linear Best-In-Market backlog', () => {
  const rawBacklog = read('docs/master/linear/AETHEL_BEST_IN_MARKET_2026_2027_BACKLOG.linear.json')
  const backlog = JSON.parse(rawBacklog) as {
    schemaVersion: string
    status: string
    project: { name: string; successMetrics: string[] }
    labels: Array<{ name: string }>
    epics: Array<{
      key: string
      title: string
      priority: string
      labels: string[]
      acceptanceCriteria: string[]
      issues: Array<{
        key: string
        title: string
        priority: string
        estimate: number
        acceptanceCriteria: string[]
        epicKey: string
      }>
    }>
    redLines: string[]
  }
  const creatorScript = read('tools/linear-create-best-in-market-backlog.mjs')
  const createPlan = read('docs/master/linear/AETHEL_BEST_IN_MARKET_2026_2027_LINEAR_CREATE_PLAN.md')
  const createPayload = read('docs/master/linear/AETHEL_BEST_IN_MARKET_2026_2027_LINEAR_CREATE_PAYLOAD.jsonl')
  const syncReport = read('docs/master/linear/AETHEL_BEST_IN_MARKET_2026_2027_LINEAR_SYNC_REPORT.md')

  it('is ready for later Linear creation without pretending tools were available', () => {
    expect(backlog.schemaVersion).toBe('aethel-linear-backlog/v1')
    expect(backlog.status).toBe('ready_for_linear_creation')
    expect(backlog.project.name).toBe('Aethel Best-In-Market 2026-2027')
    expect(rawBacklog).toContain('callable Linear project/issue tools were not exposed')
  })

  it('contains canonical labels and epics from the V14 plan', () => {
    const labels = backlog.labels.map((label) => label.name)
    for (const label of [
      'benchmark',
      'studio-home',
      'agent-fleet',
      'repository-cartography',
      'game-film',
      'viewport',
      'browser-operator',
      'enterprise',
      'performance',
      'mobile',
      'design-system',
    ]) {
      expect(labels).toContain(label)
    }

    const titles = backlog.epics.map((epic) => epic.title)
    for (const epic of [
      'Benchmark V14 Canonical Audit',
      'Agent Fleet + Repository Cartography',
      'Studio Home Mission-First Experience',
      'Game/Film Viewport Authority',
      'Design Canvas + Figma MCP Parity',
      'Browser Operator Manus-Style Approvals',
      'Realtime Collaboration + Versioning',
      'Adobe-Style Creative Media Pipeline',
      'Enterprise Trust/Billing Readiness',
      'Performance, Monorepo, Local Runtime Scale',
    ]) {
      expect(titles).toContain(epic)
    }
  })

  it('turns every epic into concrete issues with acceptance criteria', () => {
    expect(backlog.epics).toHaveLength(10)
    const issues = backlog.epics.flatMap((epic) => epic.issues)
    expect(issues.length).toBeGreaterThanOrEqual(30)

    for (const epic of backlog.epics) {
      expect(epic.key).toMatch(/^BIM-EPIC-/)
      expect(['P0', 'P1', 'P2']).toContain(epic.priority)
      expect(epic.acceptanceCriteria.length).toBeGreaterThanOrEqual(3)
      expect(epic.issues.length).toBeGreaterThanOrEqual(2)
    }

    for (const issue of issues) {
      expect(issue.key).toMatch(/^BIM-\d{3}$/)
      expect(['P0', 'P1', 'P2']).toContain(issue.priority)
      expect(issue.estimate).toBeGreaterThan(0)
      expect(issue.acceptanceCriteria.length).toBeGreaterThan(0)
      expect(issue.epicKey).toMatch(/^BIM-EPIC-/)
    }
  })

  it('keeps the no-overclaim red lines attached to delivery work', () => {
    expect(backlog.redLines.join('\n')).toContain('Nanite, Lumen, Unreal parity')
    expect(backlog.redLines.join('\n')).toContain('chat become the product spine')
    expect(backlog.redLines.join('\n')).toContain('logged-in browser actions')
    expect(backlog.redLines.join('\n')).toContain('external assets as safe')
  })

  it('ships a safe Linear API creation bridge with dry-run artifacts', () => {
    expect(creatorScript).toContain('Safe by default')
    expect(creatorScript).toContain('LINEAR_API_KEY')
    expect(creatorScript).toContain('LINEAR_ACCESS_TOKEN')
    expect(creatorScript).toContain('LINEAR_TEAM_ID')
    expect(creatorScript).toContain('LINEAR_TEAM_KEY')
    expect(creatorScript).toContain('--execute')
    expect(creatorScript).toContain('IssueCreateInput')
    expect(creatorScript).toContain('IssueLabelCreateInput')

    expect(createPlan).toContain('Status: DRY_RUN_READY')
    expect(createPlan).toContain('Planned Operations')
    expect(createPayload.split('\n').filter(Boolean).length).toBeGreaterThanOrEqual(50)
  })

  it('records the completed Linear sync after remote project creation', () => {
    expect(syncReport).toContain('Status: SYNCED_TO_LINEAR')
    expect(syncReport).toContain('Project URL: https://linear.app/aethel-meu-repo/project/aethel-best-in-market-2026-2027-640e25cb2dd1')
    expect(syncReport).toContain('Epic parent issues: 10')
    expect(syncReport).toContain('Child issues: 35')
    expect(syncReport).toContain('Total project issues created: 45')
    expect(syncReport).toContain('AET-49')
    expect(syncReport).toContain('AET-93')
  })
})
