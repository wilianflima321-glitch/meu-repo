import * as fs from 'fs/promises'
import * as path from 'path'

import type { BuildTool } from './build-runtime.types'

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

export async function detectBuildTool(projectPath: string): Promise<BuildTool> {
  if (await fileExists(path.join(projectPath, 'Cargo.toml'))) {
    return 'cargo'
  }

  if (await fileExists(path.join(projectPath, 'go.mod'))) {
    return 'go'
  }

  for (const config of ['vite.config.ts', 'vite.config.js', 'vite.config.mjs']) {
    if (await fileExists(path.join(projectPath, config))) {
      return 'vite'
    }
  }

  for (const config of ['webpack.config.js', 'webpack.config.ts']) {
    if (await fileExists(path.join(projectPath, config))) {
      return 'webpack'
    }
  }

  try {
    const pkgJson = JSON.parse(await fs.readFile(path.join(projectPath, 'package.json'), 'utf-8'))
    const buildScript = String(pkgJson.scripts?.build || '')

    if (buildScript.includes('esbuild')) return 'esbuild'
    if (buildScript.includes('tsc')) return 'tsc'
    if (buildScript.includes('vite')) return 'vite'
    if (buildScript.includes('webpack')) return 'webpack'

    if (await fileExists(path.join(projectPath, 'tsconfig.json'))) {
      return 'tsc'
    }
  } catch {
    // No package.json or unreadable package metadata; fall through to the safest browser build default.
  }

  return 'esbuild'
}
