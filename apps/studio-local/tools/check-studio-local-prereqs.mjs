import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'

const modeArg = process.argv.find((arg) => arg.startsWith('--mode='))
const mode = modeArg?.split('=')[1] ?? 'dev'

function hasCommand(command, args = ['--version']) {
  const result = spawnSync(command, args, { stdio: 'ignore', shell: process.platform === 'win32' })
  return result.status === 0
}

function requireFile(path) {
  if (!existsSync(path)) {
    console.error(`[studio-local] Missing required file: ${path}`)
    process.exit(1)
  }
}

for (const path of [
  'src-tauri/Cargo.toml',
  'src-tauri/src/main.rs',
  'src-tauri/src/lib.rs',
  'src-tauri/tauri.conf.json',
  '../../packages/runtime-contracts/src/index.ts',
]) {
  requireFile(path)
}

if (!hasCommand('cargo')) {
  console.error('[studio-local] Rust cargo is required. Install Rust via rustup before running Studio Local runtime commands.')
  process.exit(1)
}

if (!hasCommand('rustc')) {
  console.error('[studio-local] rustc is required. Install Rust via rustup before running Studio Local runtime commands.')
  process.exit(1)
}

if ((mode === 'dev' || mode === 'build') && !hasCommand('npx', ['tauri', '--version'])) {
  console.error('[studio-local] Tauri CLI is required. Install @tauri-apps/cli or run through npx with network access.')
  process.exit(1)
}

console.log(`[studio-local] prerequisites ok for ${mode}`)
