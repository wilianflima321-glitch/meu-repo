import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const DASHBOARD_FILE = path.join(ROOT, 'components', 'AethelDashboard.tsx')
const MAX_LINES = 1200

function fail(message) {
  console.error(`[qa:dashboard-shell] ${message}`)
  process.exit(1)
}

if (!fs.existsSync(DASHBOARD_FILE)) {
  fail(`missing dashboard shell file: ${DASHBOARD_FILE}`)
}

const content = fs.readFileSync(DASHBOARD_FILE, 'utf8')
const lines = content.split(/\r?\n/).length

if (lines > MAX_LINES) {
  fail(`AethelDashboard.tsx regression: ${lines} lines (max ${MAX_LINES})`)
}

if (content.includes("@xyflow/react")) {
  fail('AethelDashboard.tsx should not import @xyflow/react directly (keep canvas runtime isolated)')
}

console.log(`[qa:dashboard-shell] OK - AethelDashboard.tsx=${lines} lines`)
