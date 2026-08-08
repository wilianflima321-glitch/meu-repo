/**
 * L.2 — DevContainerManifest (Onda L / Aethel Forge)
 * Binding contract from `AETHEL_UNIVERSAL_IDE_FORGE_SPEC.md` §Contracts / §Onda L delivery map L.2.
 * 
 * Provides the schema and template registry for provisioning sandbox environments
 * (Node, Python, Rust, Next, Vite) inside ForgeSandboxExecutor (L.1).
 * This bridges the gap between raw VM provision (L.1) and FullStackScaffoldEngine (L.9).
 *
 * Canonical on-disk path: `.aethel/devcontainer.json` (fail-closed persist + re-read verify).
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'
import { createComponentLogger } from '@/lib/observability/logger'
import { confinePathToProjectRoot } from '@/lib/production/forge-sandbox-path-guard'
import type { SupportedDevContainerTemplate } from '@/lib/production/devcontainer-template-catalog'

export type { SupportedDevContainerTemplate } from '@/lib/production/devcontainer-template-catalog'
export {
  DEVCONTAINER_TEMPLATE_CATALOG,
  SUPPORTED_DEVCONTAINER_TEMPLATES,
  findDevContainerTemplateCatalogEntry,
  isSupportedDevContainerTemplate,
  listDevContainerTemplateCatalog,
} from '@/lib/production/devcontainer-template-catalog'

const log = createComponentLogger('devcontainer-manifest')

/** Canonical relative path for L.2 project workspace authority. */
export const AETHEL_DEVCONTAINER_RELATIVE_PATH = '.aethel/devcontainer.json'

export const DevContainerFeatureSchema = z.record(z.string(), z.record(z.string(), z.any()))

export const DevContainerManifestSchema = z.object({
  name: z.string(),
  image: z.string().optional(),
  build: z.object({
    dockerfile: z.string().optional(),
    context: z.string().optional(),
    args: z.record(z.string(), z.string()).optional()
  }).optional(),
  features: DevContainerFeatureSchema.optional(),
  customizations: z.record(z.string(), z.any()).optional(),
  forwardPorts: z.array(z.number()).optional(),
  postCreateCommand: z.union([z.string(), z.array(z.string())]).optional(),
  remoteEnv: z.record(z.string(), z.string()).optional(),
  remoteUser: z.string().optional()
}).refine(data => data.image || data.build, {
  message: "DevContainer manifest must specify either 'image' or 'build'."
})

export type DevContainerManifest = z.infer<typeof DevContainerManifestSchema>

export interface DevContainerTemplateDefinition {
  id: SupportedDevContainerTemplate
  manifest: DevContainerManifest
  description: string
  defaultPort?: number
}

export const TEMPLATE_REGISTRY: Record<SupportedDevContainerTemplate, DevContainerTemplateDefinition> = {
  'node-typescript': {
    id: 'node-typescript',
    description: 'Standard Node.js + TypeScript environment',
    manifest: {
      name: 'Node.js & TypeScript',
      image: 'mcr.microsoft.com/devcontainers/typescript-node:1-20-bullseye',
      features: {
        'ghcr.io/devcontainers/features/node:1': {}
      },
      postCreateCommand: 'npm install',
      remoteUser: 'node'
    }
  },
  'python-ml': {
    id: 'python-ml',
    description: 'Python environment optimized for Machine Learning',
    manifest: {
      name: 'Python 3',
      image: 'mcr.microsoft.com/devcontainers/python:1-3.11-bullseye',
      features: {
        'ghcr.io/devcontainers/features/python:1': {
          installTools: true
        }
      },
      postCreateCommand: 'pip install -r requirements.txt',
      remoteUser: 'vscode'
    }
  },
  'rust-aethel': {
    id: 'rust-aethel',
    description: 'Rust environment tailored for Aethel Engine (includes wgpu deps)',
    manifest: {
      name: 'Rust (Aethel Engine)',
      image: 'mcr.microsoft.com/devcontainers/rust:1-1-bullseye',
      features: {
        'ghcr.io/devcontainers/features/rust:1': {}
      },
      customizations: {
        vscode: {
          extensions: ['rust-lang.rust-analyzer', 'tamasfe.even-better-toml']
        }
      },
      postCreateCommand: 'cargo build',
      remoteUser: 'vscode'
    }
  },
  'nextjs-14': {
    id: 'nextjs-14',
    description: 'Next.js 14 App Router template',
    defaultPort: 3000,
    manifest: {
      name: 'Next.js 14',
      image: 'mcr.microsoft.com/devcontainers/typescript-node:1-20-bullseye',
      forwardPorts: [3000],
      postCreateCommand: 'npm install',
      remoteUser: 'node'
    }
  },
  'vite-react': {
    id: 'vite-react',
    description: 'Vite + React + TypeScript template',
    defaultPort: 5173,
    manifest: {
      name: 'Vite React TS',
      image: 'mcr.microsoft.com/devcontainers/typescript-node:1-20-bullseye',
      forwardPorts: [5173],
      postCreateCommand: 'npm install',
      remoteUser: 'node'
    }
  }
}

/**
 * Resolves a supported devcontainer template by its identifier.
 * This is the exact bridge used by L.9 (FullStackScaffoldEngine) to provision a project.
 */
export function resolveDevContainerTemplate(type: SupportedDevContainerTemplate): DevContainerTemplateDefinition {
  const template = TEMPLATE_REGISTRY[type]
  if (!template) {
    log.error('devcontainer_template_not_found', { requestedType: type })
    throw new Error(`Unsupported DevContainer template: ${type}`)
  }
  return template
}

/**
 * Parses and validates a raw devcontainer.json string.
 */
export function parseDevContainerManifest(rawJson: string): DevContainerManifest {
  try {
    const parsed = JSON.parse(rawJson)
    return DevContainerManifestSchema.parse(parsed)
  } catch (error) {
    log.error('devcontainer_manifest_parse_failed', { error })
    throw error
  }
}

export type PersistDevContainerResult =
  | {
      ok: true
      absolutePath: string
      relativePath: typeof AETHEL_DEVCONTAINER_RELATIVE_PATH
      manifest: DevContainerManifest
    }
  | {
      ok: false
      code: 'ROOT_INVALID' | 'PATH_ESCAPE' | 'WRITE_FAILED' | 'VERIFY_FAILED'
      message: string
    }

/**
 * Persist a validated DevContainer manifest to `.aethel/devcontainer.json`
 * under the project workspace. Fail-closed: path confinement + write + re-read Zod verify.
 */
export async function persistDevContainerManifestToDisk(input: {
  projectRootPath: string
  templateId?: SupportedDevContainerTemplate
  manifest?: DevContainerManifest
}): Promise<PersistDevContainerResult> {
  let manifest: DevContainerManifest
  try {
    if (input.manifest) {
      manifest = DevContainerManifestSchema.parse(input.manifest)
    } else if (input.templateId) {
      manifest = resolveDevContainerTemplate(input.templateId).manifest
    } else {
      return {
        ok: false,
        code: 'WRITE_FAILED',
        message: 'persistDevContainerManifestToDisk requires templateId or manifest',
      }
    }
  } catch (error) {
    return {
      ok: false,
      code: 'WRITE_FAILED',
      message: error instanceof Error ? error.message : String(error),
    }
  }

  const confined = confinePathToProjectRoot(input.projectRootPath, AETHEL_DEVCONTAINER_RELATIVE_PATH)
  if (!confined.ok) {
    return {
      ok: false,
      code: confined.reason === 'root_not_found' ? 'ROOT_INVALID' : 'PATH_ESCAPE',
      message: confined.message,
    }
  }

  const absolutePath = confined.resolved
  const dir = path.dirname(absolutePath)

  try {
    await fs.mkdir(dir, { recursive: true })
    const payload = `${JSON.stringify(manifest, null, 2)}\n`
    await fs.writeFile(absolutePath, payload, 'utf8')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    log.error('devcontainer_persist_write_failed', { absolutePath, error: message })
    return { ok: false, code: 'WRITE_FAILED', message: `Failed to write ${AETHEL_DEVCONTAINER_RELATIVE_PATH}: ${message}` }
  }

  const verified = await readDevContainerManifestFromDisk(input.projectRootPath)
  if (!verified.ok) {
    return {
      ok: false,
      code: 'VERIFY_FAILED',
      message: verified.message,
    }
  }

  log.info('devcontainer_persisted', {
    absolutePath,
    name: verified.manifest.name,
    templateId: input.templateId,
  })

  return {
    ok: true,
    absolutePath,
    relativePath: AETHEL_DEVCONTAINER_RELATIVE_PATH,
    manifest: verified.manifest,
  }
}

export type ReadDevContainerResult =
  | {
      ok: true
      absolutePath: string
      relativePath: typeof AETHEL_DEVCONTAINER_RELATIVE_PATH
      manifest: DevContainerManifest
    }
  | {
      ok: false
      code: 'ROOT_INVALID' | 'PATH_ESCAPE' | 'NOT_FOUND' | 'PARSE_FAILED'
      message: string
    }

/** Read + Zod-validate `.aethel/devcontainer.json` from a project root (fail-closed). */
export async function readDevContainerManifestFromDisk(
  projectRootPath: string,
): Promise<ReadDevContainerResult> {
  const confined = confinePathToProjectRoot(projectRootPath, AETHEL_DEVCONTAINER_RELATIVE_PATH)
  if (!confined.ok) {
    return {
      ok: false,
      code: confined.reason === 'root_not_found' ? 'ROOT_INVALID' : 'PATH_ESCAPE',
      message: confined.message,
    }
  }

  try {
    const raw = await fs.readFile(confined.resolved, 'utf8')
    const manifest = parseDevContainerManifest(raw)
    return {
      ok: true,
      absolutePath: confined.resolved,
      relativePath: AETHEL_DEVCONTAINER_RELATIVE_PATH,
      manifest,
    }
  } catch (error) {
    const err = error as NodeJS.ErrnoException
    if (err?.code === 'ENOENT') {
      return {
        ok: false,
        code: 'NOT_FOUND',
        message: `${AETHEL_DEVCONTAINER_RELATIVE_PATH} not found under project root`,
      }
    }
    return {
      ok: false,
      code: 'PARSE_FAILED',
      message: error instanceof Error ? error.message : String(error),
    }
  }
}
