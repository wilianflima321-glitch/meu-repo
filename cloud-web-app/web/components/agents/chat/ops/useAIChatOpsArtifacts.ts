'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

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
  pendingDiff?: AIChatPendingDiff | null
  projectId?: string
}

function getOpsMemoryStorageKey(projectId?: string) {
  return `aethel.ai.ops.memory.${projectId || 'default'}`
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
  pendingDiff,
  projectId,
}: UseAIChatOpsArtifactsParams) {
  const [memories, setMemories] = useState<AIChatMemoryItem[]>([])
  const storageKey = useMemo(() => getOpsMemoryStorageKey(projectId), [projectId])

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const raw = window.localStorage.getItem(storageKey)
      if (!raw) {
        setMemories([])
        return
      }

      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) {
        setMemories([])
        return
      }

      setMemories(
        parsed.filter((item): item is AIChatMemoryItem => {
          return (
            item &&
            typeof item === 'object' &&
            typeof item.id === 'string' &&
            typeof item.scope === 'string' &&
            typeof item.key === 'string' &&
            typeof item.value === 'string' &&
            typeof item.timestamp === 'number'
          )
        })
      )
    } catch {
      setMemories([])
    }
  }, [storageKey])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(storageKey, JSON.stringify(memories))
  }, [memories, storageKey])

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
    if (!pendingDiff) return []

    return [
      {
        filePath: pendingDiff.path,
        oldContent: pendingDiff.oldContent,
        newContent: pendingDiff.newContent,
        lineChanges: countChangedLines(pendingDiff.oldContent, pendingDiff.newContent),
      },
    ]
  }, [pendingDiff])

  return {
    addMemory,
    approvalChanges,
    deleteMemory,
    memories,
    updateMemory,
  }
}
