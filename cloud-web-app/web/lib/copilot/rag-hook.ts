'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { RAGIndex } from './rag-index'
import type { IndexStats } from './rag-types'

export function useRAGIndex(options: {
  embeddingProvider?: 'openai' | 'local'
  openAIKey?: string
} = {}) {
  const indexRef = useRef<RAGIndex | null>(null)
  const [stats, setStats] = useState<IndexStats | null>(null)
  const [isIndexing, setIsIndexing] = useState(false)
  
  // Initialize index
  useEffect(() => {
    indexRef.current = new RAGIndex(options)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  
  // Index files
  const indexFiles = useCallback(async (files: Array<{ path: string; content: string; language: string }>) => {
    if (!indexRef.current) return
    
    setIsIndexing(true)
    try {
      await indexRef.current.indexFiles(files)
      setStats(indexRef.current.getStats())
    } finally {
      setIsIndexing(false)
    }
  }, [])
  
  // Search
  const search = useCallback(async (query: string, options?: Parameters<RAGIndex['search']>[1]) => {
    if (!indexRef.current) return []
    return indexRef.current.search(query, options)
  }, [])
  
  // Build context
  const buildContext = useCallback(async (query: string, maxTokens?: number) => {
    if (!indexRef.current) return ''
    return indexRef.current.buildContextForQuery(query, maxTokens)
  }, [])
  
  // Update file
  const updateFile = useCallback(async (path: string, content: string, language: string) => {
    if (!indexRef.current) return
    await indexRef.current.updateFile(path, content, language)
    setStats(indexRef.current.getStats())
  }, [])
  
  // Remove file
  const removeFile = useCallback((path: string) => {
    if (!indexRef.current) return
    indexRef.current.removeFile(path)
    setStats(indexRef.current.getStats())
  }, [])
  
  // Clear index
  const clearIndex = useCallback(() => {
    if (!indexRef.current) return
    indexRef.current.clear()
    setStats(null)
  }, [])
  
  return {
    indexFiles,
    search,
    buildContext,
    updateFile,
    removeFile,
    clearIndex,
    stats,
    isIndexing,
  }
}
