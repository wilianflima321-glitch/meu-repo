export type E2BModule = typeof import('e2b')
export type E2BFilePayload = string | ArrayBuffer

export interface E2BSandboxLike {
  sandboxId?: string
  files: {
    exists(path: string): Promise<boolean>
    write(path: string, data: E2BFilePayload): Promise<unknown>
    writeFiles(files: Array<{ path: string; data: E2BFilePayload }>): Promise<unknown>
  }
  commands: {
    run(command: string, options?: { cwd?: string; timeoutMs?: number; background?: boolean }): Promise<unknown>
  }
  getHost(port: number): string
}

export interface E2BSandboxConstructor {
  create(templateId: string, options: { apiKey: string; timeoutMs: number }): Promise<E2BSandboxLike>
  connect(sandboxId: string, options: { apiKey: string }): Promise<E2BSandboxLike>
}

type E2BModuleWithSandbox = E2BModule & {
  default?: E2BSandboxConstructor
  Sandbox?: E2BSandboxConstructor
}

export async function loadE2BModule(): Promise<E2BModule> {
  const importer = new Function('specifier', 'return import(specifier)') as (
    specifier: string
  ) => Promise<E2BModule>

  return importer('e2b')
}

export function resolveE2BSandboxCtor(e2bModule: E2BModule): E2BSandboxConstructor | undefined {
  const resolved = e2bModule as E2BModuleWithSandbox
  return resolved.default || resolved.Sandbox
}
