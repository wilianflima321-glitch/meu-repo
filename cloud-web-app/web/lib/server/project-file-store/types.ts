/**
 * Unified project file storage contract.
 *
 * The platform historically grew two parallel file backends:
 *  - Postgres `prisma.file` rows (survives serverless, ephemeral-disk deploys)
 *  - Real on-disk workspace under `.aethel/workspaces/<user>/<project>`
 *    (what the live IDE file tree, apply pipeline, and semantic search use)
 *
 * `ProjectFileStore` is the single logical source of truth that both the agent
 * tool registry and the apply pipeline address, with one implementation per
 * runtime so web (serverless) and desktop/local stay architecturally coherent.
 */
export type ProjectFileBackendKind = 'disk' | 'db'

export interface ProjectFileRef {
  userId: string
  projectId: string
  /** Virtual project-relative path, e.g. `src/app.ts` or `/src/app.ts`. */
  path: string
}

export interface ProjectFileRecord {
  /** Backend-specific id (DB row id). Undefined for disk-backed files. */
  id?: string
  /** Normalized virtual path (leading slash). */
  path: string
  content: string
  language?: string
  updatedAt?: Date
}

export interface ProjectFileWriteOptions {
  language?: string
}

export interface ProjectFileStore {
  readonly backend: ProjectFileBackendKind
  read(ref: ProjectFileRef): Promise<ProjectFileRecord | null>
  exists(ref: ProjectFileRef): Promise<boolean>
  write(ref: ProjectFileRef, content: string, options?: ProjectFileWriteOptions): Promise<ProjectFileRecord>
  delete(ref: ProjectFileRef): Promise<boolean>
}
