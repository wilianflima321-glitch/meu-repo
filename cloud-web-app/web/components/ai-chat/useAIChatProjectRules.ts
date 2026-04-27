'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

type ProjectRulesPayload = {
  hasRules: boolean
  scope: 'workspace' | 'repo' | null
  sourcePath: string | null
  content: string
}

function buildProjectRulesUrl(projectId?: string) {
  const search = new URLSearchParams()
  if (projectId?.trim()) {
    search.set('projectId', projectId.trim())
  }
  const query = search.toString()
  return query ? `/api/project-rules?${query}` : '/api/project-rules'
}

export function createStarterProjectRules() {
  return [
    '# Aethel Project Rules',
    '',
    '- Prefer route-safe, benchmark-grade UX over speculative feature drift.',
    '- Preserve preview/deploy honesty: never imply remote review is healthy before health/readiness confirms it.',
    '- Keep AI edits explainable, diff-friendly, and scoped to the current artifact.',
    '- Favor small seams, testable modules, and logger-based observability over hidden side effects.',
  ].join('\n')
}

export function useAIChatProjectRules(projectId?: string) {
  const [content, setContent] = useState('')
  const [draft, setDraft] = useState('')
  const [scope, setScope] = useState<'workspace' | 'repo' | null>(null)
  const [sourcePath, setSourcePath] = useState<string | null>(null)
  const [hasRules, setHasRules] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadRules = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(buildProjectRulesUrl(projectId), {
        method: 'GET',
        cache: 'no-store',
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        setError(payload?.message || payload?.error || 'Falha ao carregar regras do projeto.')
        return
      }

      const rules = (payload?.rules ?? {}) as Partial<ProjectRulesPayload>
      const nextContent = typeof rules.content === 'string' ? rules.content : ''

      setContent(nextContent)
      setDraft(nextContent)
      setScope(rules.scope === 'workspace' || rules.scope === 'repo' ? rules.scope : null)
      setSourcePath(typeof rules.sourcePath === 'string' ? rules.sourcePath : null)
      setHasRules(Boolean(rules.hasRules))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Falha ao carregar regras do projeto.')
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void loadRules()
  }, [loadRules])

  const saveRules = useCallback(async () => {
    setIsSaving(true)
    setError(null)
    try {
      const response = await fetch('/api/project-rules', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          projectId,
          content: draft,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        setError(payload?.message || payload?.error || 'Falha ao salvar regras do projeto.')
        return false
      }

      const rules = (payload?.rules ?? {}) as Partial<ProjectRulesPayload>
      const nextContent = typeof rules.content === 'string' ? rules.content : ''

      setContent(nextContent)
      setDraft(nextContent)
      setScope(rules.scope === 'workspace' || rules.scope === 'repo' ? rules.scope : null)
      setSourcePath(typeof rules.sourcePath === 'string' ? rules.sourcePath : null)
      setHasRules(Boolean(rules.hasRules))
      return true
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Falha ao salvar regras do projeto.')
      return false
    } finally {
      setIsSaving(false)
    }
  }, [draft, projectId])

  const resetDraft = useCallback(() => {
    setDraft(content)
  }, [content])

  const loadStarterTemplate = useCallback(() => {
    setDraft(createStarterProjectRules())
  }, [])

  const isDirty = useMemo(() => draft !== content, [content, draft])

  return {
    content,
    draft,
    error,
    hasRules,
    isDirty,
    isLoading,
    isSaving,
    loadRules,
    loadStarterTemplate,
    resetDraft,
    saveRules,
    scope,
    setDraft,
    sourcePath,
  }
}
