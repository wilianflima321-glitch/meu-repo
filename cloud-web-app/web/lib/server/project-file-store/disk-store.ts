import { inferLanguageFromPath, normalizePath } from '@/lib/ai-tools-registry-utils'
import { getFileSystemRuntime } from '@/lib/server/filesystem-runtime'
import { resolveScopedWorkspacePath } from '@/lib/server/workspace-scope'
import type { ProjectFileRecord, ProjectFileRef, ProjectFileStore, ProjectFileWriteOptions } from './types'

/**
 * Disk-backed project files under `.aethel/workspaces/<user>/<project>`.
 * Canonical on local/desktop runtimes — this is what the live IDE file tree,
 * the apply pipeline, and semantic code search already read and write.
 */
export class DiskProjectFileStore implements ProjectFileStore {
  readonly backend = 'disk' as const

  private resolveAbsolute(ref: ProjectFileRef): string {
    const normalized = normalizePath(ref.path)
    const { absolutePath } = resolveScopedWorkspacePath({
      userId: ref.userId,
      projectId: ref.projectId,
      requestedPath: normalized,
    })
    return absolutePath
  }

  async read(ref: ProjectFileRef): Promise<ProjectFileRecord | null> {
    const fs = getFileSystemRuntime()
    const absolutePath = this.resolveAbsolute(ref)
    if (!(await fs.exists(absolutePath))) return null
    const file = await fs.readFile(absolutePath)
    return {
      path: normalizePath(ref.path),
      content: typeof file.content === 'string' ? file.content : String(file.content ?? ''),
      language: file.language ?? inferLanguageFromPath(ref.path),
      updatedAt: file.modified,
    }
  }

  async exists(ref: ProjectFileRef): Promise<boolean> {
    const fs = getFileSystemRuntime()
    return fs.exists(this.resolveAbsolute(ref))
  }

  async write(ref: ProjectFileRef, content: string, options?: ProjectFileWriteOptions): Promise<ProjectFileRecord> {
    const fs = getFileSystemRuntime()
    const absolutePath = this.resolveAbsolute(ref)
    await fs.writeFile(absolutePath, content, { createDirectories: true, atomic: true })
    const info = (await fs.exists(absolutePath)) ? await fs.getFileInfo(absolutePath) : null
    return {
      path: normalizePath(ref.path),
      content,
      language: options?.language ?? inferLanguageFromPath(ref.path),
      updatedAt: info?.modified,
    }
  }

  async delete(ref: ProjectFileRef): Promise<boolean> {
    const fs = getFileSystemRuntime()
    const absolutePath = this.resolveAbsolute(ref)
    if (!(await fs.exists(absolutePath))) return false
    await fs.delete(absolutePath, { force: true })
    return true
  }
}
