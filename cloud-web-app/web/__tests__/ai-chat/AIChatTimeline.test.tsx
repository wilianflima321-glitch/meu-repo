import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AIChatTimeline } from '@/components/ai-chat/AIChatTimeline'

describe('AIChatTimeline', () => {
  it('starts compact, expands on demand, and advertises the remaining history', () => {
    const onOpenHistory = vi.fn()

    render(
      <AIChatTimeline
        activeThreadTitle="Wave 13"
        hasHistory
        onOpenHistory={onOpenHistory}
        items={[
          { id: '1', tone: 'assistant', title: 'Plano', summary: 'Plano criado', meta: 'agora' },
          { id: '2', tone: 'live', title: 'Execucao', summary: 'Execucao em andamento', meta: '1m' },
          { id: '3', tone: 'system', title: 'Gate', summary: 'Gate verde', meta: '2m' },
          { id: '4', tone: 'user', title: 'Pedido', summary: 'Pedido adicional', meta: '3m' },
        ]}
      />,
    )

    expect(screen.getByText('Plano')).toBeInTheDocument()
    expect(screen.queryByText('Execucao')).not.toBeInTheDocument()
    expect(screen.queryByText('Gate')).not.toBeInTheDocument()
    expect(screen.queryByText('Pedido')).not.toBeInTheDocument()
    expect(screen.getByText('+3 eventos adicionais no historico completo')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Ver detalhes/i }))
    expect(screen.getByText('Execucao')).toBeInTheDocument()
    expect(screen.getByText('Gate')).toBeInTheDocument()
    expect(screen.queryByText('Pedido')).not.toBeInTheDocument()
    expect(screen.getByText('+1 eventos adicionais no historico completo')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Abrir historico/i }))
    expect(onOpenHistory).toHaveBeenCalledTimes(1)
  })
})
