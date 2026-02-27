export type ExecutionTarget = 'web' | 'local'

export type ExecutionTargetProfile = {
  id: ExecutionTarget
  label: string
  status: 'active' | 'planned'
  summary: string
  strengths: string[]
  limits: string[]
}

export function getExecutionTarget(): ExecutionTarget {
  const configured = (process.env.NEXT_PUBLIC_AETHEL_EXECUTION_TARGET || 'web').trim().toLowerCase()
  return configured === 'local' ? 'local' : 'web'
}

export function getExecutionProfiles(activeTarget: ExecutionTarget): ExecutionTargetProfile[] {
  const webProfile: ExecutionTargetProfile = {
    id: 'web',
    label: 'Web Studio',
    status: activeTarget === 'web' ? 'active' : 'planned',
    summary: 'Entrada principal de producao com colaboracao e deploy cloud-native.',
    strengths: [
      'Zero install e onboarding rapido',
      'Fluxo unificado dashboard + ide',
      'Padrao de contratos explicitos e gates',
    ],
    limits: [
      'Limites de browser/GPU continuam reais',
      'Carga pesada depende de infra remota',
      'Sem paridade desktop irrestrita',
    ],
  }

  const localProfile: ExecutionTargetProfile = {
    id: 'local',
    label: 'Local Studio',
    status: activeTarget === 'local' ? 'active' : 'planned',
    summary: 'Perfil para execucao no hardware do usuario com foco em cargas pesadas.',
    strengths: [
      'Aproveita CPU/GPU local para workloads intensivos',
      'Menor latencia para edicao/preview local',
      'Potencial para pipeline offline/hibrido',
    ],
    limits: [
      'Ainda nao promovido como capability de producao',
      'Qualidade e desempenho variam por maquina',
      'Requer politica de compatibilidade por dispositivo',
    ],
  }

  return [webProfile, localProfile]
}

export function getExecutionTargetBadge(target: ExecutionTarget): string {
  return target === 'local' ? 'LOCAL_TARGET' : 'WEB_TARGET'
}
