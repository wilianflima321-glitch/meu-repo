import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = path.resolve(__dirname, '..')

// Directories to check
const TARGET_DIRS = ['app', 'components', 'lib', 'packages']
// Sibling package (outside web/): ide-ui is a primary UI surface
const EXTRA_TARGET_DIRS = [path.resolve(WEB_ROOT, '../packages/ide-ui')]

// Excluded directories (Canvas/WebGL often need raw hex for THREE.Color)
const EXCLUDED_DIRS = ['canvas', 'engine', 'three', 'webgpu', 'destruction', 'simulation', 'world-forge']

// Excluded files:
// - globals.css / DesignTokenSync.ts = token sources of truth (hex allowed)
// - design-tokens.ts = legacy JS token table SoT (do not circular-map into CSS vars)
const EXCLUDED_FILES = [
  'globals.css',
  'DesignTokenSync.ts',
  'design-tokens.ts',
  'check-hardcoded-colors.mjs',
]

// The strict regex for hardcoded CSS colors:
// Looks for hex (#FFFFFF) or rgb() or rgba()
// Negative lookbehind ensures it's not a URL hash or a normal ID selector.
const COLOR_REGEX = /(?<=[:=\[,\s'"`])(#([a-fA-F0-9]{3,4}|[a-fA-F0-9]{6}|[a-fA-F0-9]{8})\b|rgba?\([\d\s,.]+\))/g

let hasErrors = false

function walkDir(dir) {
  const files = fs.readdirSync(dir)
  
  for (const file of files) {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)
    
    if (stat.isDirectory()) {
      if (EXCLUDED_DIRS.includes(file) || file === 'node_modules' || file === '.next') {
        continue
      }
      walkDir(fullPath)
    } else {
      if (!EXCLUDED_FILES.includes(file) && /\.(tsx|ts|css|scss)$/.test(file)) {
        checkFile(fullPath)
      }
    }
  }
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // Skip comment lines and SVG paths/fill
    if (line.trim().startsWith('//') || line.trim().startsWith('/*') || line.includes('fill=') || line.includes('stroke=')) {
      continue
    }

    const matches = line.match(COLOR_REGEX)
    if (matches) {
      // Filter out common false positives (like IDs in TSX fragments)
      const validMatches = matches.filter(m => {
        if (m.startsWith('#') && m.length > 7 && !m.match(/^#[0-9a-fA-F]{8}$/)) return false // e.g. #__next
        if (line.includes(`href="${m}"`)) return false
        return true
      })

      if (validMatches.length > 0) {
        hasErrors = true
        console.error(`\x1b[31m[L.10 QA Gate Error]\x1b[0m Hardcoded color found in \x1b[33m${path.relative(WEB_ROOT, filePath)}:${i + 1}\x1b[0m`)
        console.error(`  Line: ${line.trim()}`)
        console.error(`  Matches: ${validMatches.join(', ')}`)
        console.error(`  Fix: Use Aethel Design Tokens (var(--aethel-*)) instead of hardcoded colors.\n`)
      }
    }
  }
}

console.log('Running L.10 QA Gate: check-hardcoded-colors...')
for (const dir of TARGET_DIRS) {
  const fullDirPath = path.join(WEB_ROOT, dir)
  if (fs.existsSync(fullDirPath)) {
    walkDir(fullDirPath)
  }
}
for (const fullDirPath of EXTRA_TARGET_DIRS) {
  if (fs.existsSync(fullDirPath)) {
    walkDir(fullDirPath)
  }
}

if (hasErrors) {
  console.error('\x1b[31mQA FAILED:\x1b[0m Hardcoded colors detected outside of globals.css. The agent must use DesignTokenSync to normalize UI patches.')
  process.exit(1)
} else {
  console.log('\x1b[32mQA PASSED:\x1b[0m No hardcoded UI colors found. Aethel design tokens are strictly enforced.')
  process.exit(0)
}
