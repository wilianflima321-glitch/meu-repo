export type E2BModule = typeof import('e2b')

export async function loadE2BModule(): Promise<E2BModule> {
  const importer = new Function('specifier', 'return import(specifier)') as (
    specifier: string
  ) => Promise<E2BModule>

  return importer('e2b')
}

export function resolveE2BSandboxCtor(e2bModule: E2BModule): any {
  return (e2bModule as { default?: any; Sandbox?: any }).default || (e2bModule as { Sandbox?: any }).Sandbox
}
