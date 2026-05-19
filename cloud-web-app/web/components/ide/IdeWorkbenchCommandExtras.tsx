'use client'

import { useEffect } from 'react'
import { useCommandPalette } from '@/components/ide/CommandPalette'

/**
 * Registra comandos extras do workbench na paleta do IDE.
 */
export function IdeWorkbenchCommandExtras() {
  const { registerCommand, unregisterCommand } = useCommandPalette()

  useEffect(() => {
    registerCommand({
      id: 'ai.openChatDiff',
      label: 'IA: abrir painel Diff',
      description: 'Mostra o separador Diff no painel avancado do chat',
      category: 'ai',
      icon: 'git-compare',
      action: () => {
        window.dispatchEvent(new Event('aethel.ide.openChatDiff'))
      },
      keywords: ['diff', 'ia', 'chat', 'comparar', 'monaco'],
    })

    registerCommand({
      id: 'ai.openChatExecution',
      label: 'IA: abrir Execucao (tarefas)',
      description: 'Mostra o separador Execucao no painel avancado do chat',
      category: 'ai',
      icon: 'tasklist',
      action: () => {
        window.dispatchEvent(new Event('aethel.ide.openChatExecution'))
      },
      keywords: ['execution', 'tasks', 'agent', 'plan', 'task'],
    })

    return () => {
      unregisterCommand('ai.openChatDiff')
      unregisterCommand('ai.openChatExecution')
    }
  }, [registerCommand, unregisterCommand])

  return null
}
