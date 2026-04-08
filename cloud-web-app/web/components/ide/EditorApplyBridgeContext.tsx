'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type MutableRefObject,
  type ReactNode,
} from 'react'
import type * as monacoEditor from 'monaco-editor'
import {
  applySnippetAtCursor,
  buildChatDiffFile,
  insertSnippetAtCursor,
  replaceEntireDocument,
  type ApplyBridgeResult,
  type ChatDiffFile,
} from '@/lib/ai/ai-apply-bridge'

export type EditorApplyBridgeContextValue = {
  activeFilePath: string | null
  pendingDiff: ChatDiffFile | null
  clearPendingDiff: () => void
  stageDiffForActiveFile: (newCode: string) => ApplyBridgeResult
  applySnippetToEditor: (code: string) => ApplyBridgeResult
  insertSnippetAtCursor: (code: string) => ApplyBridgeResult
  replaceEntireFile: (code: string) => ApplyBridgeResult
  createFileFromSnippet: (code: string) => Promise<ApplyBridgeResult>
}

const EditorApplyBridgeContext = createContext<EditorApplyBridgeContextValue | null>(null)

export function useEditorApplyBridge(): EditorApplyBridgeContextValue | null {
  return useContext(EditorApplyBridgeContext)
}

type ProviderProps = {
  children: ReactNode
  editorRef: MutableRefObject<monacoEditor.editor.IStandaloneCodeEditor | null>
  activeFilePath: string | null
  activeFileContent: string
  normalizePath: (input: string) => string
  writeFile: (path: string, content: string) => Promise<void>
  readFile: (path: string) => Promise<void>
}

export function EditorApplyBridgeProvider({
  children,
  editorRef,
  activeFilePath,
  activeFileContent,
  normalizePath,
  writeFile,
  readFile,
}: ProviderProps) {
  const [pendingDiff, setPendingDiff] = useState<ChatDiffFile | null>(null)

  const clearPendingDiff = useCallback(() => setPendingDiff(null), [])

  const persistActiveFileFromModel = useCallback(async () => {
    const path = activeFilePath
    const editor = editorRef.current
    if (!path || !editor) return

    const model = editor.getModel()
    if (!model) return

    try {
      await writeFile(path, model.getValue())
    } catch {
      // O `writeFile` do IDE ja expoe o erro no estado global.
    }
  }, [activeFilePath, editorRef, writeFile])

  const stageDiffForActiveFile = useCallback(
    (newCode: string): ApplyBridgeResult => {
      if (!activeFilePath) return { ok: false, message: 'Abra um arquivo no editor.' }
      setPendingDiff(buildChatDiffFile(activeFilePath, activeFileContent, newCode))
      return { ok: true }
    },
    [activeFilePath, activeFileContent]
  )

  const applySnippetToEditor = useCallback(
    (code: string): ApplyBridgeResult => {
      const editor = editorRef.current
      if (!editor) return { ok: false, message: 'Editor nao esta pronto.' }
      const result = applySnippetAtCursor(editor, code)
      if (result.ok && activeFilePath) void persistActiveFileFromModel()
      return result
    },
    [editorRef, activeFilePath, persistActiveFileFromModel]
  )

  const insertAtCursor = useCallback(
    (code: string): ApplyBridgeResult => {
      const editor = editorRef.current
      if (!editor) return { ok: false, message: 'Editor nao esta pronto.' }
      const result = insertSnippetAtCursor(editor, code)
      if (result.ok && activeFilePath) void persistActiveFileFromModel()
      return result
    },
    [editorRef, activeFilePath, persistActiveFileFromModel]
  )

  const replaceFile = useCallback(
    (code: string): ApplyBridgeResult => {
      const editor = editorRef.current
      if (!editor) return { ok: false, message: 'Editor nao esta pronto.' }
      const result = replaceEntireDocument(editor, code)
      if (result.ok && activeFilePath) void persistActiveFileFromModel()
      return result
    },
    [editorRef, activeFilePath, persistActiveFileFromModel]
  )

  const createFileFromSnippet = useCallback(
    async (code: string): Promise<ApplyBridgeResult> => {
      if (typeof window === 'undefined') return { ok: false, message: 'Indisponivel no servidor.' }

      const suggestedPath = activeFilePath
        ? `${activeFilePath.replace(/\/[^/]+$/, '')}/novo-arquivo.ts`
        : '/src/untitled.ts'

      const rawPath = window.prompt('Caminho do novo arquivo (ex: /src/foo.ts)', suggestedPath)
      if (!rawPath?.trim()) return { ok: false, message: 'Operacao cancelada.' }

      const path = normalizePath(rawPath.trim())

      try {
        await writeFile(path, code)
        await readFile(path)
        return { ok: true }
      } catch (error) {
        return { ok: false, message: error instanceof Error ? error.message : 'Falha ao criar arquivo.' }
      }
    },
    [activeFilePath, normalizePath, readFile, writeFile]
  )

  const value = useMemo<EditorApplyBridgeContextValue>(
    () => ({
      activeFilePath,
      pendingDiff,
      clearPendingDiff,
      stageDiffForActiveFile,
      applySnippetToEditor,
      insertSnippetAtCursor: insertAtCursor,
      replaceEntireFile: replaceFile,
      createFileFromSnippet,
    }),
    [
      activeFilePath,
      pendingDiff,
      clearPendingDiff,
      stageDiffForActiveFile,
      applySnippetToEditor,
      insertAtCursor,
      replaceFile,
      createFileFromSnippet,
    ]
  )

  return (
    <EditorApplyBridgeContext.Provider value={value}>{children}</EditorApplyBridgeContext.Provider>
  )
}
