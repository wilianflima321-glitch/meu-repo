import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

const rulesHookMocks = vi.hoisted(() => ({
  useAIChatProjectRules: vi.fn(),
}))

vi.mock('@/components/ai-chat/useAIChatProjectRules', () => rulesHookMocks)

import { AIChatRulesPanel } from '@/components/ai-chat/AIChatRulesPanel'

describe('AIChatRulesPanel', () => {
  it('renders current rules metadata and lets the operator load a starter template', () => {
    const loadStarterTemplate = vi.fn()
    const setDraft = vi.fn()
    rulesHookMocks.useAIChatProjectRules.mockReturnValue({
      draft: '- keep previews honest',
      error: null,
      hasRules: true,
      isDirty: false,
      isLoading: false,
      isSaving: false,
      loadRules: vi.fn(),
      loadStarterTemplate,
      resetDraft: vi.fn(),
      saveRules: vi.fn(),
      scope: 'workspace',
      setDraft,
      sourcePath: '.aethel/workspaces/user-1/demo/.aethelrules',
    })

    render(<AIChatRulesPanel projectId="demo" />)

    expect(screen.getByText('Rules do projeto')).toBeInTheDocument()
    expect(screen.getByText(/escopo workspace/i)).toBeInTheDocument()
    expect(screen.getByText(/\.aethelrules/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Carregar modelo/i }))
    expect(loadStarterTemplate).toHaveBeenCalled()
  })

  it('surfaces save state and wiring for edited drafts', () => {
    const saveRules = vi.fn()
    const setDraft = vi.fn()
    rulesHookMocks.useAIChatProjectRules.mockReturnValue({
      draft: '# Aethel Project Rules',
      error: 'Falha ao carregar regras do projeto.',
      hasRules: false,
      isDirty: true,
      isLoading: false,
      isSaving: true,
      loadRules: vi.fn(),
      loadStarterTemplate: vi.fn(),
      resetDraft: vi.fn(),
      saveRules,
      scope: 'repo',
      setDraft,
      sourcePath: '.aethelrules',
    })

    render(<AIChatRulesPanel />)

    expect(screen.getByText('Falha ao carregar regras do projeto.')).toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText(/Adicione aqui as rules/i), {
      target: { value: 'updated rules' },
    })
    expect(setDraft).toHaveBeenCalledWith('updated rules')
    expect(screen.getByRole('button', { name: /A guardar rules/i })).toBeDisabled()
  })
})
