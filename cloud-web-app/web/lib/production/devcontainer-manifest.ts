/**
 * L.2 — DevContainerManifest (Onda L / Aethel Forge)
 * Binding contract from `AETHEL_UNIVERSAL_IDE_FORGE_SPEC.md` §Contracts / §Onda L delivery map L.2.
 * 
 * Provides the schema and template registry for provisioning sandbox environments
 * (Node, Python, Rust, Next, Vite) inside ForgeSandboxExecutor (L.1).
 * This bridges the gap between raw VM provision (L.1) and FullStackScaffoldEngine (L.9).
 */

import { z } from 'zod'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('devcontainer-manifest')

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

export type SupportedDevContainerTemplate = 'node-typescript' | 'python-ml' | 'rust-aethel' | 'nextjs-14' | 'vite-react'

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
