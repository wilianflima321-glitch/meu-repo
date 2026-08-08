'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { getAgentsOpsMemory, setAgentsOpsMemory } from '@/lib/storage/ui-persistence-spine'

export interface AIChatPendingDiff {
  path: string
  oldContent: string
  newContent: string
}

export interface AIChatMemoryItem {
  id: string
  scope: 'workspace' | 'project' | 'session'
  key: string
  value: string
  timestamp: number
}

export interface AIChatApprovalChange {
  filePath: string
  oldContent: string
  newContent: string
  lineChanges: number
}

interface UseAIChatOpsArtifactsParams {
  pendingDiffs?: AIChatPendingDiff[]
  projectId?: string
}

function countChangedLines(oldContent: string, newContent: string) {
  const oldLines = oldContent.split('\n')
  const newLines = newContent.split('\n')
  const maxLength = Math.max(oldLines.length, newLines.length)
  let changed = 0

  for (let index = 0; index < maxLength; index += 1) {
    if (oldLines[index] !== newLines[index]) {
      changed += 1
    }
  }

  return changed
}

export function useAIChatOpsArtifacts({
  pendingDiffs,
  projectId,
}: UseAIChatOpsArtifactsParams) {
  const [memories, setMemories] = useState<AIChatMemoryItem[]>([])
  const storageProjectId = useMemo(() => projectId, [projectId])

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const parsed = getAgentsOpsMemory<unknown>(storageProjectId, [])
      if (!Array.isArray(parsed)) {
        setMemories([])
        return
      }

      setMemories(
        parsed.filter((item): item is AIChatMemoryItem => {
          return (
            Boolean(item) &&
            typeof item === 'object' &&
            typeof (item as AIChatMemoryItem).id === 'string' &&
            typeof (item as AIChatMemoryItem).scope === 'string' &&
            typeof (item as AIChatMemoryItem).key === 'string' &&
            typeof (item as AIChatMemoryItem).value === 'string' &&
            typeof (item as AIChatMemoryItem).timestamp === 'number'
          )
        })
      )
    } catch {
      setMemories([])
    }
  }, [storageProjectId])

  useEffect(() => {
    if (typeof window === 'undefined') return
    setAgentsOpsMemory(storageProjectId, memories)
  }, [memories, storageProjectId])

  const addMemory = useCallback(
    (memory: Omit<AIChatMemoryItem, 'id' | 'timestamp'>) => {
      setMemories((previous) => [
        ...previous,
        {
          ...memory,
          id: `memory-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          timestamp: Date.now(),
        },
      ])
    },
    []
  )

  const deleteMemory = useCallback((id: string) => {
    setMemories((previous) => previous.filter((item) => item.id !== id))
  }, [])

  const updateMemory = useCallback((id: string, value: string) => {
    setMemories((previous) =>
      previous.map((item) =>
        item.id === id
          ? {
              ...item,
              value,
              timestamp: Date.now(),
            }
          : item
      )
    )
  }, [])

  const approvalChanges = useMemo<AIChatApprovalChange[]>(() => {
    if (!pendingDiffs || pendingDiffs.length === 0) return []

    return pendingDiffs.map(diff => ({
      filePath: diff.path,
      oldContent: diff.oldContent,
      newContent: diff.newContent,
      lineChanges: countChangedLines(diff.oldContent, diff.newContent),
    }))
  }, [pendingDiffs])

  return {
    addMemory,
    approvalChanges,
    deleteMemory,
    memories,
    updateMemory,
  }
}
