#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

process.noDeprecation = true

const ROOT = process.cwd()
const TOOLCHAIN_BIN = path.join(os.homedir(), 'AppData', 'Local', 'Aethel', 'toolchain', 'bin')

function findRepoRoot(start) {
  let current = start
  for (;;) {
    if (fs.existsSync(path.join(current, '.git'))) return current
    const parent = path.dirname(current)
    if (parent === current) return start
    current = parent
  }
}

const REPORT_DIR = process.env.AETHEL_TOOLCHAIN_REPORT_DIR || path.join(findRepoRoot(ROOT), '.aethel', 'toolchain')
const REPORT_PATH = path.join(REPORT_DIR, 'RUNTIME_TOOLCHAIN_LOCAL_INSTALL_REPORT.md')
const JSON_PATH = path.join(REPORT_DIR, 'runtime-toolchain-local-report.json')

function readPersistedWindowsPath() {
  if (process.platform !== 'win32') return ''
  const result = spawnSync('powershell.exe', [
    '-NoProfile',
    '-Command',
    "[Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')",
  ], {
    encoding: 'utf8',
    shell: false,
    timeout: 5_000,
  })
  return result.status === 0 ? result.stdout.trim() : ''
}

process.env.PATH = [TOOLCHAIN_BIN, readPersistedWindowsPath(), process.env.PATH].filter(Boolean).join(path.delimiter)

const TOOLS = [
  { id: 'ffmpeg', command: 'ffmpeg', args: ['-version'], lane: 'media' },
  { id: 'ffprobe', command: 'ffprobe', args: ['-version'], lane: 'media' },
  { id: 'blender-headless', command: 'blender', args: ['--version'], lane: 'dcc-render' },
  { id: 'gltf-transform', command: 'gltf-transform', args: ['--version'], lane: 'asset' },
  { id: 'meshoptimizer', command: 'meshopt', args: ['--version'], lane: 'asset' },
  { id: 'ktx-software-basisu', command: 'toktx', args: ['--version'], lane: 'texture' },
  { id: 'openusd-tools', command: 'usdcat', args: ['--help'], lane: 'scene-interchange' },
  { id: 'godot-export-bridge', command: 'godot', args: ['--version'], lane: 'external-engine' },
  { id: 'cmake', command: 'cmake', args: ['--version'], lane: 'native-build' },
  { id: 'ninja', command: 'ninja', args: ['--version'], lane: 'native-build' },
  { id: 'zig-toolchain', command: 'zig', args: ['version'], lane: 'native-build' },
  { id: 'zig-c-compiler', command: 'zig-cc', args: ['--version'], lane: 'native-build' },
  { id: 'rust-cargo', command: 'cargo', args: ['--version'], lane: 'native-sidecar' },
  { id: 'rustc', command: 'rustc', args: ['--version'], lane: 'native-sidecar' },
  { id: 'recast-detour', command: 'recast-cli', args: ['--version'], lane: 'navmesh' },
  { id: 'rapier-physics', command: 'rapier', args: ['--version'], lane: 'physics' },
  { id: 'ozz-animation', command: 'ozz-animation-adapter', args: ['--version'], lane: 'animation-runtime', optionalSourceOnly: true },
  { id: 'unreal-export-bridge', command: 'aethel-unreal-bridge', args: ['--version'], lane: 'external-engine', humanHeld: true },
  { id: 'unity-export-bridge', command: 'aethel-unity-bridge', args: ['--version'], lane: 'external-engine', humanHeld: true },
]

function commandPath(command) {
  const result = spawnSync(process.platform === 'win32' ? 'where' : 'which', [command], {
    encoding: 'utf8',
    shell: false,
  })
  if (result.status !== 0) return null
  const candidates = result.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  return candidates.find((entry) => /\.(exe|cmd|bat|ps1)$/i.test(entry)) ?? candidates[0] ?? null
}

function digestIfFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null
  const stat = fs.statSync(filePath)
  if (!stat.isFile()) return null
  const hash = createHash('sha256')
  hash.update(fs.readFileSync(filePath))
  return `sha256:${hash.digest('hex')}`
}

function runProbe(resolvedPath, args) {
  const lower = resolvedPath.toLowerCase()
  if (process.platform === 'win32' && lower.endsWith('.ps1')) {
    return spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', resolvedPath, ...args], {
      encoding: 'utf8',
      shell: false,
      timeout: 15_000,
    })
  }
  if (process.platform === 'win32' && (lower.endsWith('.cmd') || lower.endsWith('.bat'))) {
    return spawnSync(resolvedPath, args, {
      encoding: 'utf8',
      shell: true,
      timeout: 15_000,
    })
  }
  return spawnSync(resolvedPath, args, {
    encoding: 'utf8',
    shell: false,
    timeout: 15_000,
  })
}

function probe(tool) {
  const resolvedPath = commandPath(tool.command)
  if (!resolvedPath) {
    return {
      ...tool,
      status: tool.humanHeld ? 'held' : tool.optionalSourceOnly ? 'source-only' : 'missing',
      path: null,
      version: null,
      digest: null,
      note: tool.humanHeld
        ? 'Requires target-engine install, license acceptance, and user-selected bridge.'
        : tool.optionalSourceOnly
          ? 'Source package downloaded; native adapter build is intentionally deferred.'
          : 'Command not found on PATH.',
    }
  }

  const result = runProbe(resolvedPath, tool.args)
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(' | ')

  return {
    ...tool,
    status: result.status === 0 ? 'ready' : 'review',
    path: resolvedPath,
    version: output || null,
    digest: digestIfFile(resolvedPath),
    note: result.status === 0 ? 'Ready for governed runtime use.' : `Probe returned exit ${result.status}.`,
  }
}

const generatedAt = new Date().toISOString()
const probes = TOOLS.map(probe)
const ready = probes.filter((entry) => entry.status === 'ready').length
const held = probes.filter((entry) => entry.status === 'held' || entry.status === 'source-only').length
const missing = probes.filter((entry) => entry.status === 'missing').length

fs.mkdirSync(REPORT_DIR, { recursive: true })
fs.writeFileSync(JSON_PATH, JSON.stringify({ generatedAt, ready, held, missing, tools: probes }, null, 2))

const rows = probes.map((entry) => {
  const version = (entry.version ?? '-').replace(/\|/g, '\\|')
  const note = entry.note.replace(/\|/g, '\\|')
  return `| \`${entry.id}\` | \`${entry.status}\` | \`${entry.command}\` | ${version} | ${note} |`
})

fs.writeFileSync(REPORT_PATH, `# Runtime Toolchain Local Install Report

- Generated at: \`${generatedAt}\`
- Toolchain bin: \`${TOOLCHAIN_BIN}\`
- Ready: \`${ready}\`
- Held/source-only: \`${held}\`
- Missing: \`${missing}\`

| Tool | Status | Command | Version/probe | Note |
| --- | --- | --- | --- | --- |
${rows.join('\n')}

## Policy

- No external engine bridge is considered ready until the user installs the target engine and accepts its license.
- Heavy render, asset processing, shader compile, indexing, and browser automation must remain sidecar/cloud/held, never browser main-thread.
- Tool downloads must remain consented and checksum-governed before production execution.
`)

console.log(`[local-runtime-toolchain] ready=${ready} held=${held} missing=${missing}`)
console.log(`[local-runtime-toolchain] report=${REPORT_PATH}`)
