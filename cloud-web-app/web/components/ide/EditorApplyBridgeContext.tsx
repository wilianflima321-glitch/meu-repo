'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from 'react'
import type * as monacoEditor from 'monaco-editor'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
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

type PendingCreateFileRequest = {
  code: string
  resolve: (result: ApplyBridgeResult) => void
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
  const [createFileModalOpen, setCreateFileModalOpen] = useState(false)
  const [createFilePath, setCreateFilePath] = useState('/src/untitled.ts')
  const [createFileError, setCreateFileError] = useState<string | null>(null)
  const [createFileBusy, setCreateFileBusy] = useState(false)
  const pendingCreateFileRequestRef = useRef<PendingCreateFileRequest | null>(null)

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

  const resolveCreateFileRequest = useCallback((result: ApplyBridgeResult) => {
    pendingCreateFileRequestRef.current?.resolve(result)
    pendingCreateFileRequestRef.current = null
    setCreateFileBusy(false)
    setCreateFileError(null)
    setCreateFileModalOpen(false)
  }, [])

  const handleCancelCreateFile = useCallback(() => {
    resolveCreateFileRequest({ ok: false, message: 'Operacao cancelada.' })
  }, [resolveCreateFileRequest])

  const handleConfirmCreateFile = useCallback(async () => {
    const request = pendingCreateFileRequestRef.current
    if (!request) {
      setCreateFileModalOpen(false)
      return
    }

    const rawPath = createFilePath.trim()
    if (!rawPath) {
      setCreateFileError('Informe o caminho do novo arquivo.')
      return
    }

    const path = normalizePath(rawPath)
    setCreateFileBusy(true)
    setCreateFileError(null)

    try {
      await writeFile(path, request.code)
      await readFile(path)
      resolveCreateFileRequest({ ok: true })
    } catch (error) {
      setCreateFileBusy(false)
      setCreateFileError(error instanceof Error ? error.message : 'Falha ao criar arquivo.')
    }
  }, [createFilePath, normalizePath, readFile, resolveCreateFileRequest, writeFile])

  const createFileFromSnippet = useCallback(
    async (code: string): Promise<ApplyBridgeResult> => {
      if (typeof window === 'undefined') return { ok: false, message: 'Indisponivel no servidor.' }
      if (createFileBusy) return { ok: false, message: 'Ja existe uma criacao de arquivo em andamento.' }

      const suggestedPath = activeFilePath
        ? `${activeFilePath.replace(/\/[^/]+$/, '')}/novo-arquivo.ts`
        : '/src/untitled.ts'

      setCreateFilePath(suggestedPath)
      setCreateFileError(null)
      setCreateFileModalOpen(true)

      return await new Promise<ApplyBridgeResult>((resolve) => {
        pendingCreateFileRequestRef.current = { code, resolve }
      })
    },
    [activeFilePath, createFileBusy]
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
    <EditorApplyBridgeContext.Provider value={value}>
      {children}
      <Modal
        isOpen={createFileModalOpen}
        onClose={createFileBusy ? () => undefined : handleCancelCreateFile}
        title="Criar novo arquivo"
        description="Escolha onde o snippet deve ser salvo no workspace."
        size="md"
        closeOnOverlayClick={!createFileBusy}
        closeOnEscape={!createFileBusy}
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancelCreateFile}
              disabled={createFileBusy}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleConfirmCreateFile()}
              loading={createFileBusy}
            >
              Criar arquivo
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            autoFocus
            label="Caminho do arquivo"
            value={createFilePath}
            onChange={(event) => {
              setCreateFilePath(event.target.value)
              if (createFileError) setCreateFileError(null)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void handleConfirmCreateFile()
              }
            }}
            placeholder="/src/foo.ts"
            error={createFileError ?? undefined}
            disabled={createFileBusy}
            hint="Exemplo: /src/lib/nova-feature.ts"
          />
        </div>
      </Modal>
    </EditorApplyBridgeContext.Provider>
  )
}
