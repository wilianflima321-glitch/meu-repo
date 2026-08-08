/**
 * L.2 / L.9 — Client-safe DevContainer template catalog.
 * No Node fs — safe for browser UI and shared with server registry ids.
 */

export const SUPPORTED_DEVCONTAINER_TEMPLATES = [
  'node-typescript',
  'python-ml',
  'rust-aethel',
  'nextjs-14',
  'vite-react',
] as const

export type SupportedDevContainerTemplate = (typeof SUPPORTED_DEVCONTAINER_TEMPLATES)[number]

export type DevContainerTemplateCatalogEntry = {
  id: SupportedDevContainerTemplate
  name: string
  description: string
  tags: string[]
  defaultPort?: number
}

/** UX catalog mirrored to L.2 TEMPLATE_REGISTRY ids (fail-closed if unknown). */
export const DEVCONTAINER_TEMPLATE_CATALOG: readonly DevContainerTemplateCatalogEntry[] = [
  {
    id: 'nextjs-14',
    name: 'Next.js 14',
    description: 'App Router + TypeScript + Tailwind via create-next-app in Forge sandbox.',
    tags: ['React', 'SSR', 'TypeScript'],
    defaultPort: 3000,
  },
  {
    id: 'vite-react',
    name: 'Vite + React',
    description: 'Fast SPA scaffold with React + TypeScript and npm install.',
    tags: ['React', 'Vite', 'TypeScript'],
    defaultPort: 5173,
  },
  {
    id: 'node-typescript',
    name: 'Node + TypeScript',
    description: 'Standard Node.js TypeScript workspace (npm init).',
    tags: ['Node.js', 'TypeScript'],
  },
  {
    id: 'python-ml',
    name: 'Python ML',
    description: 'Python 3 environment with a local virtualenv scaffold.',
    tags: ['Python', 'ML'],
  },
  {
    id: 'rust-aethel',
    name: 'Rust (Aethel)',
    description: 'Rust cargo init environment tailored for Aethel Engine.',
    tags: ['Rust', 'wgpu'],
  },
] as const

export function isSupportedDevContainerTemplate(id: string): id is SupportedDevContainerTemplate {
  return (SUPPORTED_DEVCONTAINER_TEMPLATES as readonly string[]).includes(id)
}

export function listDevContainerTemplateCatalog(): DevContainerTemplateCatalogEntry[] {
  return DEVCONTAINER_TEMPLATE_CATALOG.map((entry) => ({ ...entry }))
}

export function findDevContainerTemplateCatalogEntry(
  id: string,
): DevContainerTemplateCatalogEntry | undefined {
  return DEVCONTAINER_TEMPLATE_CATALOG.find((entry) => entry.id === id)
}
