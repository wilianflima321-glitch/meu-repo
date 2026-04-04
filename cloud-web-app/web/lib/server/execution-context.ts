import { getFileSystemRuntime } from './filesystem-runtime'
import { analyzeDependencyImpact } from './dependency-impact-guard'
import { resolveScopedWorkspacePath, toVirtualWorkspacePath } from './workspace-scope'

export type ExecutionContextFile = {
  virtualPath: string
  content: string
  language?: string
  dependencyImpact: {
    localImports: string[]
    externalImports: string[]
  }
}

export type ExecutionContext = {
  files: ExecutionContextFile[]
}

export async function loadExecutionContext(params: {
  userId: string
  projectId: string
  filePaths: string[]
}): Promise<ExecutionContext> {
  const fsRuntime = getFileSystemRuntime()
  const files: ExecutionContextFile[] = []

  for (const filePath of params.filePaths) {
    const { absolutePath, root } = resolveScopedWorkspacePath({
      userId: params.userId,
      projectId: params.projectId,
      requestedPath: filePath,
    })
    const virtualPath = toVirtualWorkspacePath(absolutePath, root)
    const current = await fsRuntime.readFile(absolutePath)
    const dependencyImpact = await analyzeDependencyImpact({
      workspaceRoot: root,
      absolutePath,
    }).catch(() => ({
      localImports: [],
      externalImports: [],
    }))

    files.push({
      virtualPath,
      content: current.content,
      language: current.language,
      dependencyImpact: dependencyImpact.localImports
        ? {
            localImports: dependencyImpact.localImports,
            externalImports: dependencyImpact.externalImports ?? [],
          }
        : {
            localImports: [],
            externalImports: [],
          },
    })
  }

  return { files }
}
