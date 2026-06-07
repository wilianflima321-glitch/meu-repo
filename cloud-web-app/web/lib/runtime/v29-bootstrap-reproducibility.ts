export type V29BootstrapStatus = 'available' | 'missing' | 'held' | 'needs-review'

export type V29BootstrapDependencyCategory =
  | 'package-manager'
  | 'lockfile'
  | 'node-workspace'
  | 'rust-workspace'
  | 'desktop-sidecar'
  | 'binary-toolchain'
  | 'environment'

export type V29BootstrapDependency = {
  id: string
  category: V29BootstrapDependencyCategory
  status: V29BootstrapStatus
  requiredFor: string[]
  evidenceRefs: string[]
  nextAction: string
}

export type V29BootstrapWorkspace = {
  id: 'root' | 'web' | 'studio-local' | 'studio-local-tauri' | string
  path: string
  packageManager: 'npm' | 'pnpm' | 'yarn' | 'bun' | 'cargo' | 'unknown'
  packageJsonPresent?: boolean
  cargoTomlPresent?: boolean
  lockfilePresent: boolean
  evidenceRefs: string[]
}

export type V29BootstrapReproducibilityReport = {
  version: 1
  generatedAt: string
  capability: 'AETHEL_V29_BOOTSTRAP_REPRODUCIBILITY'
  workspaces: V29BootstrapWorkspace[]
  dependencies: V29BootstrapDependency[]
  summary: {
    workspaces: number
    lockfilesPresent: number
    lockfilesMissing: number
    missingCriticalDependencies: number
    heldDependencies: number
    releaseReady: false
  }
  blockers: string[]
  claimPolicy: {
    allowedClaims: string[]
    prohibitedClaims: string[]
  }
  nextAction: string
}

export type V29BootstrapReproducibilityInput = {
  generatedAt?: string
  workspaces: V29BootstrapWorkspace[]
  dependencies: V29BootstrapDependency[]
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

function workspaceBlockers(workspace: V29BootstrapWorkspace): string[] {
  const blockers: string[] = []
  if (!workspace.lockfilePresent) blockers.push(`${workspace.id}: lockfile is missing, reproducible bootstrap is not proven`)
  return blockers
}

function dependencyBlockers(dependency: V29BootstrapDependency): string[] {
  const blockers: string[] = []
  if (dependency.status === 'missing') blockers.push(`${dependency.id}: required dependency is missing`)
  if (dependency.status === 'held') blockers.push(`${dependency.id}: dependency is held and cannot support release claims`)
  return blockers
}

function workspaceStructuralErrors(workspace: V29BootstrapWorkspace): string[] {
  const failures: string[] = []
  if (!workspace.path.trim()) failures.push(`${workspace.id}: workspace path is required`)
  if (workspace.packageManager === 'unknown') failures.push(`${workspace.id}: package manager is unknown`)
  if (workspace.evidenceRefs.length === 0) failures.push(`${workspace.id}: evidence refs are required`)
  return failures
}

function dependencyStructuralErrors(dependency: V29BootstrapDependency): string[] {
  const failures: string[] = []
  if (!dependency.id.trim()) failures.push('dependency id is required')
  if (dependency.requiredFor.length === 0) failures.push(`${dependency.id}: requiredFor lanes are missing`)
  if (dependency.evidenceRefs.length === 0) failures.push(`${dependency.id}: evidence refs are required`)
  return failures
}

export function buildV29BootstrapReproducibilityReport(
  input: V29BootstrapReproducibilityInput,
): V29BootstrapReproducibilityReport {
  const blockers = unique([
    ...input.workspaces.flatMap(workspaceBlockers),
    ...input.dependencies.flatMap(dependencyBlockers),
    'Human review is required before claiming reproducible setup, desktop readiness, or native runtime readiness.',
  ])
  const lockfilesPresent = input.workspaces.filter((workspace) => workspace.lockfilePresent).length
  const missingCriticalDependencies = input.dependencies.filter((dependency) => dependency.status === 'missing').length
  const heldDependencies = input.dependencies.filter((dependency) => dependency.status === 'held').length

  return {
    version: 1,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    capability: 'AETHEL_V29_BOOTSTRAP_REPRODUCIBILITY',
    workspaces: input.workspaces,
    dependencies: input.dependencies,
    summary: {
      workspaces: input.workspaces.length,
      lockfilesPresent,
      lockfilesMissing: input.workspaces.length - lockfilesPresent,
      missingCriticalDependencies,
      heldDependencies,
      releaseReady: false,
    },
    blockers,
    claimPolicy: {
      allowedClaims: [
        'bootstrap reproducibility measured',
        'desktop sidecar readiness audited',
        'missing toolchains blocked release claims',
      ],
      prohibitedClaims: [
        'desktop ready',
        'native renderer ready',
        'production ready',
        'releaseReady=true',
        'autonomous execution ready',
        'signed installer',
        'Unreal-grade',
      ],
    },
    nextAction:
      blockers.length > 1
        ? 'Add missing lockfiles/toolchain evidence, persist sidecar manifests, and rerun bootstrap readiness before stronger claims.'
        : 'Bootstrap evidence is measured; keep release claims held until human review.',
  }
}

export function validateV29BootstrapReproducibilityReport(
  report: V29BootstrapReproducibilityReport,
): string[] {
  const failures: string[] = []
  if (report.version !== 1) failures.push('invalid bootstrap reproducibility report version')
  if (report.capability !== 'AETHEL_V29_BOOTSTRAP_REPRODUCIBILITY') failures.push('invalid bootstrap capability')
  if (report.summary.releaseReady !== false) failures.push('bootstrap reproducibility cannot set releaseReady=true')
  if (report.workspaces.length === 0) failures.push('at least one workspace is required')
  if (!report.workspaces.some((workspace) => workspace.id === 'web')) failures.push('web workspace must be included')
  if (!report.workspaces.some((workspace) => workspace.id === 'studio-local-tauri')) {
    failures.push('studio-local-tauri workspace must be included')
  }
  if (!report.claimPolicy.prohibitedClaims.includes('desktop ready')) failures.push('desktop ready claim must be prohibited')
  if (!report.claimPolicy.prohibitedClaims.includes('native renderer ready')) {
    failures.push('native renderer ready claim must be prohibited')
  }
  if (!report.claimPolicy.prohibitedClaims.includes('releaseReady=true')) {
    failures.push('releaseReady=true claim must be prohibited')
  }
  if (!report.blockers.some((blocker) => blocker.includes('Human review is required'))) {
    failures.push('human review blocker is required')
  }
  for (const workspace of report.workspaces) failures.push(...workspaceStructuralErrors(workspace))
  for (const dependency of report.dependencies) failures.push(...dependencyStructuralErrors(dependency))
  return unique(failures)
}

export function buildV29BootstrapDependency(params: {
  id: string
  category: V29BootstrapDependencyCategory
  status: V29BootstrapStatus
  requiredFor: string[]
  evidenceRefs: string[]
  nextAction?: string
}): V29BootstrapDependency {
  return {
    id: params.id,
    category: params.category,
    status: params.status,
    requiredFor: params.requiredFor,
    evidenceRefs: params.evidenceRefs,
    nextAction:
      params.nextAction ??
      (params.status === 'available'
        ? 'Keep evidence current in the bootstrap manifest.'
        : 'Attach evidence or keep stronger market claims held.'),
  }
}
