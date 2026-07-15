import { prisma } from '@/lib/db'
import { normalizePath } from '@/lib/ai-tools-registry-utils'
import type { ProjectFileRecord, ProjectFileRef, ProjectFileStore, ProjectFileWriteOptions } from './types'

/**
 * Postgres-backed project files (`prisma.file`). Canonical on serverless /
 * ephemeral-disk deployments where on-disk workspaces do not persist.
 */
function pathVariants(normalized: string): string[] {
  return Array.from(new Set([normalized, normalized.replace(/^\//, '')]))
}

export class DbProjectFileStore implements ProjectFileStore {
  readonly backend = 'db' as const

  async read(ref: ProjectFileRef): Promise<ProjectFileRecord | null> {
    const normalized = normalizePath(ref.path)
    const file = await prisma.file.findFirst({
      where: { projectId: ref.projectId, OR: pathVariants(normalized).map((path) => ({ path })) },
      select: { id: true, path: true, content: true, language: true, updatedAt: true },
    })
    if (!file) return null
    return {
      id: file.id,
      path: file.path,
      content: String(file.content ?? ''),
      language: file.language ?? undefined,
      updatedAt: file.updatedAt,
    }
  }

  async exists(ref: ProjectFileRef): Promise<boolean> {
    return (await this.read(ref)) !== null
  }

  async write(ref: ProjectFileRef, content: string, options?: ProjectFileWriteOptions): Promise<ProjectFileRecord> {
    const normalized = normalizePath(ref.path)
    const language = options?.language
    const row = await prisma.file.upsert({
      where: { projectId_path: { projectId: ref.projectId, path: normalized } },
      update: { content, ...(language ? { language } : {}) },
      create: { projectId: ref.projectId, path: normalized, content, ...(language ? { language } : {}) },
      select: { id: true, path: true, content: true, language: true, updatedAt: true },
    })
    return {
      id: row.id,
      path: row.path,
      content: String(row.content ?? content),
      language: row.language ?? language,
      updatedAt: row.updatedAt,
    }
  }

  async delete(ref: ProjectFileRef): Promise<boolean> {
    const normalized = normalizePath(ref.path)
    const result = await prisma.file.deleteMany({
      where: { projectId: ref.projectId, OR: pathVariants(normalized).map((path) => ({ path })) },
    })
    return result.count > 0
  }
}
