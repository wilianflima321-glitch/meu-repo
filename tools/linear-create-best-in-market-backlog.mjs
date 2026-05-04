#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const BACKLOG_PATH = 'docs/master/linear/AETHEL_BEST_IN_MARKET_2026_2027_BACKLOG.linear.json'
const REPORT_PATH = 'docs/master/linear/AETHEL_BEST_IN_MARKET_2026_2027_LINEAR_CREATE_PLAN.md'
const PAYLOAD_PATH = 'docs/master/linear/AETHEL_BEST_IN_MARKET_2026_2027_LINEAR_CREATE_PAYLOAD.jsonl'
const LINEAR_ENDPOINT = 'https://api.linear.app/graphql'

const args = new Set(process.argv.slice(2))
const execute = args.has('--execute')
const createLabels = args.has('--create-labels')
const help = args.has('--help') || args.has('-h')

if (help) {
  console.log(`
Aethel Linear backlog creator

Safe by default: without --execute this only writes a dry-run plan and JSONL payload.

Usage:
  node tools/linear-create-best-in-market-backlog.mjs
  LINEAR_API_KEY=lin_api_xxx LINEAR_TEAM_KEY=ENG node tools/linear-create-best-in-market-backlog.mjs --execute --create-labels
  LINEAR_ACCESS_TOKEN=oauth_token LINEAR_TEAM_ID=uuid LINEAR_PROJECT_ID=uuid node tools/linear-create-best-in-market-backlog.mjs --execute

Environment:
  LINEAR_API_KEY       Personal API key. Header is Authorization: <key>.
  LINEAR_ACCESS_TOKEN  OAuth token. Header is Authorization: Bearer <token>.
  LINEAR_TEAM_ID       Linear team UUID. Preferred for execution.
  LINEAR_TEAM_KEY      Linear team key. The script resolves it to team ID.
  LINEAR_PROJECT_ID    Optional existing project UUID. Issues are still created without it.

Flags:
  --execute        Mutate Linear. Omit for dry-run.
  --create-labels  Create missing labels before creating issues. Requires --execute.
`)
  process.exit(0)
}

function readJson(file) {
  return JSON.parse(readFileSync(path.join(ROOT, file), 'utf8'))
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function authHeader() {
  if (process.env.LINEAR_ACCESS_TOKEN) {
    return `Bearer ${process.env.LINEAR_ACCESS_TOKEN}`
  }
  if (process.env.LINEAR_API_KEY) {
    return process.env.LINEAR_API_KEY
  }
  return null
}

async function linear(query, variables = {}) {
  const authorization = authHeader()
  assert(authorization, 'Missing LINEAR_API_KEY or LINEAR_ACCESS_TOKEN.')

  const response = await fetch(LINEAR_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authorization,
    },
    body: JSON.stringify({ query, variables }),
  })

  const body = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(`Linear HTTP ${response.status}: ${JSON.stringify(body)}`)
  }
  if (body?.errors?.length) {
    throw new Error(`Linear GraphQL errors: ${body.errors.map((error) => error.message).join('; ')}`)
  }
  return body.data
}

function priorityToLinear(priority) {
  if (priority === 'P0') return 1
  if (priority === 'P1') return 2
  if (priority === 'P2') return 3
  return 0
}

function descriptionForEpic(epic, backlog) {
  return [
    `Source: ${BACKLOG_PATH}`,
    '',
    `Priority: ${epic.priority}`,
    `Labels: ${epic.labels.join(', ')}`,
    '',
    '## Rationale',
    epic.rationale,
    '',
    '## Acceptance Criteria',
    ...epic.acceptanceCriteria.map((item) => `- ${item}`),
    '',
    '## Red Lines',
    ...backlog.redLines.map((line) => `- ${line}`),
  ].join('\n')
}

function descriptionForIssue(issue, epic, backlog) {
  return [
    `Source: ${BACKLOG_PATH}`,
    `Epic: ${epic.key} - ${epic.title}`,
    `Priority: ${issue.priority}`,
    `Estimate: ${issue.estimate}`,
    `Labels: ${issue.labels.join(', ')}`,
    '',
    '## Acceptance Criteria',
    ...issue.acceptanceCriteria.map((item) => `- ${item}`),
    '',
    '## Product Guardrail',
    'This issue must preserve the V14 no-overclaim posture: copy experience patterns from market leaders, not unsupported technical claims.',
    '',
    '## Relevant Red Lines',
    ...backlog.redLines.map((line) => `- ${line}`),
  ].join('\n')
}

function buildPlan(backlog) {
  const operations = []

  for (const label of backlog.labels) {
    operations.push({
      type: 'label',
      key: label.name,
      title: label.name,
      input: label,
    })
  }

  for (const epic of backlog.epics) {
    operations.push({
      type: 'epic-issue',
      key: epic.key,
      title: epic.title,
      priority: epic.priority,
      labels: epic.labels,
      estimate: 8,
      description: descriptionForEpic(epic, backlog),
    })

    for (const issue of epic.issues) {
      operations.push({
        type: 'child-issue',
        key: issue.key,
        title: issue.title,
        priority: issue.priority,
        labels: issue.labels,
        estimate: issue.estimate,
        parentKey: epic.key,
        description: descriptionForIssue(issue, epic, backlog),
      })
    }
  }

  return operations
}

function writeDryRun(backlog, operations) {
  const report = [
    '# AETHEL_BEST_IN_MARKET_2026_2027_LINEAR_CREATE_PLAN',
    'Status: DRY_RUN_READY',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Project',
    backlog.project.name,
    '',
    '## Execution Safety',
    '- This report was generated without mutating Linear.',
    '- Remote creation requires `--execute` plus Linear credentials.',
    '- Label creation requires both `--execute` and `--create-labels`.',
    '- Project association requires `LINEAR_PROJECT_ID`; otherwise issues can still be created at team level.',
    '',
    '## Required Environment',
    '- `LINEAR_API_KEY` or `LINEAR_ACCESS_TOKEN`',
    '- `LINEAR_TEAM_ID` or `LINEAR_TEAM_KEY`',
    '- optional `LINEAR_PROJECT_ID`',
    '',
    '## Planned Operations',
    ...operations.map((operation) => {
      const bits = [operation.type, operation.key, operation.title]
      if (operation.parentKey) bits.push(`parent=${operation.parentKey}`)
      if (operation.priority) bits.push(`priority=${operation.priority}`)
      return `- ${bits.join(' | ')}`
    }),
  ].join('\n')

  mkdirSync(path.dirname(path.join(ROOT, REPORT_PATH)), { recursive: true })
  writeFileSync(path.join(ROOT, REPORT_PATH), `${report}\n`)
  writeFileSync(
    path.join(ROOT, PAYLOAD_PATH),
    operations.map((operation) => JSON.stringify(operation)).join('\n') + '\n'
  )
}

async function resolveTeamId() {
  if (process.env.LINEAR_TEAM_ID) return process.env.LINEAR_TEAM_ID

  const teamKey = process.env.LINEAR_TEAM_KEY
  assert(teamKey, 'Missing LINEAR_TEAM_ID or LINEAR_TEAM_KEY.')

  const data = await linear(`
    query TeamsForAethelBacklog {
      teams {
        nodes {
          id
          key
          name
        }
      }
    }
  `)
  const team = data.teams.nodes.find((candidate) => candidate.key === teamKey || candidate.name === teamKey)
  assert(team, `Could not find Linear team with key or name: ${teamKey}`)
  return team.id
}

async function loadLabelsByName() {
  const data = await linear(`
    query IssueLabelsForAethelBacklog {
      issueLabels(first: 250) {
        nodes {
          id
          name
        }
      }
    }
  `)
  return new Map(data.issueLabels.nodes.map((label) => [label.name, label.id]))
}

async function createLabel(label, teamId) {
  const data = await linear(
    `
      mutation AethelIssueLabelCreate($input: IssueLabelCreateInput!) {
        issueLabelCreate(input: $input) {
          success
          issueLabel {
            id
            name
          }
        }
      }
    `,
    {
      input: {
        name: label.name,
        color: label.color,
        description: label.description,
        teamId,
      },
    }
  )
  assert(data.issueLabelCreate.success, `Linear did not create label ${label.name}`)
  return data.issueLabelCreate.issueLabel.id
}

async function createIssue(input) {
  const data = await linear(
    `
      mutation AethelIssueCreate($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue {
            id
            identifier
            title
            url
          }
        }
      }
    `,
    { input }
  )
  assert(data.issueCreate.success, `Linear did not create issue ${input.title}`)
  return data.issueCreate.issue
}

async function executePlan(backlog, operations) {
  const teamId = await resolveTeamId()
  const projectId = process.env.LINEAR_PROJECT_ID || undefined
  const existingLabels = await loadLabelsByName()
  const labelIdsByName = new Map(existingLabels)

  for (const label of backlog.labels) {
    if (labelIdsByName.has(label.name)) continue
    if (!createLabels) {
      throw new Error(`Missing Linear label "${label.name}". Re-run with --create-labels to create it.`)
    }
    const createdId = await createLabel(label, teamId)
    labelIdsByName.set(label.name, createdId)
  }

  const createdByKey = new Map()
  for (const operation of operations.filter((entry) => entry.type !== 'label')) {
    const labelIds = operation.labels.map((label) => labelIdsByName.get(label)).filter(Boolean)
    const input = {
      teamId,
      title: `${operation.key}: ${operation.title}`,
      description: operation.description,
      priority: priorityToLinear(operation.priority),
      estimate: operation.estimate,
      labelIds,
    }

    if (projectId) input.projectId = projectId
    if (operation.parentKey) {
      const parent = createdByKey.get(operation.parentKey)
      assert(parent, `Missing created parent issue for ${operation.key}: ${operation.parentKey}`)
      input.parentId = parent.id
    }

    const created = await createIssue(input)
    createdByKey.set(operation.key, created)
    console.log(`Created ${created.identifier}: ${created.title}`)
  }

  return createdByKey
}

async function main() {
  assert(existsSync(path.join(ROOT, BACKLOG_PATH)), `Missing ${BACKLOG_PATH}`)
  const backlog = readJson(BACKLOG_PATH)
  const operations = buildPlan(backlog)
  writeDryRun(backlog, operations)

  if (!execute) {
    console.log(`Dry-run only. Planned ${operations.length} Linear operations.`)
    console.log(`Wrote ${REPORT_PATH}`)
    console.log(`Wrote ${PAYLOAD_PATH}`)
    console.log('Re-run with --execute after setting LINEAR_API_KEY/LINEAR_ACCESS_TOKEN and LINEAR_TEAM_ID/LINEAR_TEAM_KEY.')
    return
  }

  await executePlan(backlog, operations)
  console.log('Linear backlog creation completed.')
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
