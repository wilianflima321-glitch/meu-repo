import { describe, it, expect, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
  AETHEL_DEVCONTAINER_RELATIVE_PATH,
  parseDevContainerManifest,
  persistDevContainerManifestToDisk,
  readDevContainerManifestFromDisk,
  resolveDevContainerTemplate,
  DevContainerManifestSchema,
  type SupportedDevContainerTemplate
} from '../../lib/production/devcontainer-manifest'

describe('L.2 - DevContainerManifest (Onda L)', () => {
  describe('parseDevContainerManifest & Schema', () => {
    it('should parse a valid devcontainer JSON successfully', () => {
      const raw = JSON.stringify({
        name: 'Test Container',
        image: 'mcr.microsoft.com/devcontainers/typescript-node:1-20-bullseye',
        features: {
          'ghcr.io/devcontainers/features/node:1': {}
        },
        forwardPorts: [3000],
        remoteUser: 'node'
      })

      const manifest = parseDevContainerManifest(raw)
      expect(manifest.name).toBe('Test Container')
      expect(manifest.image).toBe('mcr.microsoft.com/devcontainers/typescript-node:1-20-bullseye')
      expect(manifest.forwardPorts).toEqual([3000])
      expect(manifest.remoteUser).toBe('node')
    })

    it('should throw Zod error for invalid manifest missing name or image/build', () => {
      const rawMissingName = JSON.stringify({
        image: 'ubuntu:latest'
      })
      expect(() => parseDevContainerManifest(rawMissingName)).toThrow()

      const rawMissingImageOrBuild = JSON.stringify({
        name: 'No Source Container'
      })
      expect(() => parseDevContainerManifest(rawMissingImageOrBuild)).toThrow('DevContainer manifest must specify either \'image\' or \'build\'.')
    })

    it('should accept build-based manifest instead of image', () => {
      const rawBuild = JSON.stringify({
        name: 'Build Container',
        build: {
          dockerfile: 'Dockerfile',
          context: '..'
        }
      })
      const manifest = parseDevContainerManifest(rawBuild)
      expect(manifest.build?.dockerfile).toBe('Dockerfile')
    })
  })

  describe('resolveDevContainerTemplate (Registry)', () => {
    it('should resolve all officially supported templates correctly', () => {
      const supported: SupportedDevContainerTemplate[] = [
        'node-typescript',
        'python-ml',
        'rust-aethel',
        'nextjs-14',
        'vite-react'
      ]

      for (const type of supported) {
        const template = resolveDevContainerTemplate(type)
        expect(template).toBeDefined()
        expect(template.id).toBe(type)
        expect(template.manifest.name).toBeDefined()
        // Ensure registry manifest passes strict schema validation
        expect(() => DevContainerManifestSchema.parse(template.manifest)).not.toThrow()
      }
    })

    it('should throw an error for unsupported template identifiers', () => {
      expect(() => resolveDevContainerTemplate('unknown-template' as SupportedDevContainerTemplate)).toThrow('Unsupported DevContainer template: unknown-template')
    })

    it('should properly configure the rust-aethel template', () => {
      const rustTemplate = resolveDevContainerTemplate('rust-aethel')
      expect(rustTemplate.manifest.customizations?.vscode?.extensions).toContain('rust-lang.rust-analyzer')
      expect(rustTemplate.manifest.postCreateCommand).toBe('cargo build')
    })

    it('should properly forward ports for web templates', () => {
      const nextTemplate = resolveDevContainerTemplate('nextjs-14')
      expect(nextTemplate.manifest.forwardPorts).toContain(3000)
      expect(nextTemplate.defaultPort).toBe(3000)

      const viteTemplate = resolveDevContainerTemplate('vite-react')
      expect(viteTemplate.manifest.forwardPorts).toContain(5173)
      expect(viteTemplate.defaultPort).toBe(5173)
    })
  })

  describe('on-disk .aethel/devcontainer.json persist (L.2)', () => {
    let tmpRoot: string | undefined

    afterEach(async () => {
      if (tmpRoot) {
        await fs.rm(tmpRoot, { recursive: true, force: true })
        tmpRoot = undefined
      }
    })

    it('writes canonical path, re-reads Zod-valid manifest, and fails closed on missing root', async () => {
      tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-l2-devcontainer-'))

      const written = await persistDevContainerManifestToDisk({
        projectRootPath: tmpRoot,
        templateId: 'nextjs-14',
      })
      expect(written.ok).toBe(true)
      if (!written.ok) return

      expect(written.relativePath).toBe(AETHEL_DEVCONTAINER_RELATIVE_PATH)
      const raw = await fs.readFile(written.absolutePath, 'utf8')
      expect(JSON.parse(raw).name).toBe('Next.js 14')

      const readBack = await readDevContainerManifestFromDisk(tmpRoot)
      expect(readBack.ok).toBe(true)
      if (readBack.ok) {
        expect(readBack.manifest.forwardPorts).toContain(3000)
      }

      const missingRoot = await persistDevContainerManifestToDisk({
        projectRootPath: path.join(tmpRoot, 'does-not-exist'),
        templateId: 'vite-react',
      })
      expect(missingRoot.ok).toBe(false)
      if (!missingRoot.ok) {
        expect(missingRoot.code).toBe('ROOT_INVALID')
      }
    })
  })
})
