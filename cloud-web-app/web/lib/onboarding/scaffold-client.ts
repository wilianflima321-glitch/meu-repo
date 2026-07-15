'use client'

const TEMPLATE_MAP: Record<string, string> = {
  nextjs: 'nextjs-saas',
  'react-vite': 'react-vite',
  'api-express': 'api-express',
  'react-native': 'react-native-companion',
  'game-3d': 'game-3d',
  film: 'film-story',
  blank: 'blank',
}

export function resolveScaffoldTemplateId(templateId: string): string {
  return TEMPLATE_MAP[templateId] || templateId
}

export async function scaffoldProjectFromTemplate(input: {
  templateId: string
  name: string
  description?: string
  headers?: Record<string, string>
}): Promise<{ ok: boolean; projectId?: string; openUrl?: string; error?: string }> {
  const scaffoldId = resolveScaffoldTemplateId(input.templateId)
  const response = await fetch(`/api/onboarding/scaffold/${encodeURIComponent(scaffoldId)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(input.headers || {}),
    },
    body: JSON.stringify({
      name: input.name,
      description: input.description || '',
    }),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    return {
      ok: false,
      error: typeof payload?.error === 'string' ? payload.error : `Scaffold failed (${response.status})`,
    }
  }

  return {
    ok: true,
    projectId: typeof payload?.project?.id === 'string' ? payload.project.id : undefined,
    openUrl: typeof payload?.openUrl === 'string' ? payload.openUrl : typeof payload?.studioUrl === 'string' ? payload.studioUrl : undefined,
  }
}
