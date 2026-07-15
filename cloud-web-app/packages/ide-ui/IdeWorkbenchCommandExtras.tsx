'use client'

import { useEffect } from 'react'
import { useCommandPalette } from './CommandPalette'

/**
 * Registers extra workbench commands in the IDE command palette.
 */
export function IdeWorkbenchCommandExtras() {
  const { registerCommand, unregisterCommand } = useCommandPalette()

  useEffect(() => {
    registerCommand({
      id: 'ai.openChatDiff',
      label: 'AI: open Diff panel',
      description: 'Shows the Diff tab in the advanced chat panel',
      category: 'ai',
      icon: 'git-compare',
      action: () => {
        window.dispatchEvent(new Event('aethel.ide.openChatDiff'))
      },
      keywords: ['diff', 'ia', 'chat', 'comparar', 'monaco'],
    })

    registerCommand({
      id: 'ai.openChatExecution',
      label: 'AI: open Execution tasks',
      description: 'Shows the Execution tab in the advanced chat panel',
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
