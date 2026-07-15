import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

const rulesHookMocks = vi.hoisted(() => ({
  useAIChatProjectRules: vi.fn(),
}))

vi.mock('@/components/agents/chat/rules/useAIChatProjectRules', () => rulesHookMocks)

import { AIChatRulesPanel } from '@/components/agents/chat/rules/AIChatRulesPanel'

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

    expect(screen.getByText('Project rules')).toBeInTheDocument()
    expect(screen.getByText(/scope/i)).toBeInTheDocument()
    expect(screen.getByText(/\.aethelrules/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Load template/i }))
    expect(loadStarterTemplate).toHaveBeenCalled()
  })

  it('surfaces save state and wiring for edited drafts', () => {
    const saveRules = vi.fn()
    const setDraft = vi.fn()
    rulesHookMocks.useAIChatProjectRules.mockReturnValue({
      draft: '# Aethel Project Rules',
      error: 'Failed to load project rules.',
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

    expect(screen.getByText('Failed to load project rules.')).toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText(/Add project rules/i), {
      target: { value: 'updated rules' },
    })
    expect(setDraft).toHaveBeenCalledWith('updated rules')
    expect(screen.getByRole('button', { name: /Saving rules/i })).toBeDisabled()
  })
})
