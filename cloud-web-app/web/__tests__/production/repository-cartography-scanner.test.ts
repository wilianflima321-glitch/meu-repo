import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { scanWorkspaceForRepositoryArtifacts } from '@/lib/production/repository-cartography-scanner'
import { buildRepositoryCartographyManifest } from '@/lib/production/repository-cartography'

let workspaceRoot: string

async function writeFile(relativePath: string, content: string | Buffer): Promise<void> {
  const target = path.join(workspaceRoot, relativePath)
  await fs.mkdir(path.dirname(target), { recursive: true })
  await fs.writeFile(target, content)
}

describe('repository cartography scanner', () => {
  beforeEach(async () => {
    workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-cartography-'))
  })

  afterEach(async () => {
    if (workspaceRoot.startsWith(os.tmpdir())) {
      await fs.rm(workspaceRoot, { recursive: true, force: true })
    }
  })

  it('scans workspace metadata without entering ignored heavy build folders', async () => {
    await writeFile('.aethelrules', 'rules')
    await writeFile('docs/story-bible.md', '# Story')
    await writeFile('src/game/combat/ComboSystem.ts', 'export const combo = true')
    await writeFile('assets/hero.glb', Buffer.alloc(1024))
    await writeFile('node_modules/ignored/index.js', 'module.exports = true')

    const scan = await scanWorkspaceForRepositoryArtifacts(workspaceRoot, { maxHashBytes: 2048 })
    const paths = scan.artifacts.map((artifact) => artifact.path)

    expect(paths).toEqual(
      expect.arrayContaining(['.aethelrules', 'docs/story-bible.md', 'src/game/combat/ComboSystem.ts', 'assets/hero.glb'])
    )
    expect(paths).not.toContain('node_modules/ignored/index.js')
    expect(scan.skipped).toContainEqual({ path: 'node_modules', reason: 'ignored-dir' })
    expect(scan.artifacts.find((artifact) => artifact.path === 'assets/hero.glb')?.hash).toMatch(/^sha256:/)
  })

  it('keeps huge assets as metadata when hashing would be unsafe', async () => {
    await writeFile('assets/city.glb', Buffer.alloc(4096))

    const scan = await scanWorkspaceForRepositoryArtifacts(workspaceRoot, { maxHashBytes: 128 })
    const asset = scan.artifacts.find((artifact) => artifact.path === 'assets/city.glb')

    expect(asset).toMatchObject({
      path: 'assets/city.glb',
      sourceKind: 'local-workspace',
      mimeType: 'model/gltf-binary',
    })
    expect(asset?.hash).toBeUndefined()
  })

  it('feeds scanned artifacts into the same no-invention cartography manifest', async () => {
    await writeFile('.aethelrules', 'rules')
    await writeFile('package.json', '{"scripts":{"test":"vitest"}}')
    await writeFile('docs/story-bible.md', '# Story')
    await writeFile('tests/playtest/loop.spec.ts', 'it("plays", () => {})')
    await writeFile('assets/hero.glb', Buffer.alloc(1024))

    const scan = await scanWorkspaceForRepositoryArtifacts(workspaceRoot)
    const manifest = buildRepositoryCartographyManifest({
      projectId: 'scanned-game',
      artifacts: scan.artifacts.map((artifact) =>
        artifact.path === 'assets/hero.glb' ? { ...artifact, license: 'internal' } : artifact
      ),
    })

    expect(manifest.totals.totalFiles).toBe(5)
    expect(manifest.contextPlan.mustReadFirst).toEqual(expect.arrayContaining(['.aethelrules', 'package.json']))
    expect(manifest.criticalGaps.map((gap) => gap.id)).not.toContain('gap-unknown-surfaces')
  })
})
