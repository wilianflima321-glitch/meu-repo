'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { CommandPaletteUI } from './CommandPaletteUI'
import {
  createDefaultCommands,
  type CommandItem,
  type CommandPaletteContextType,
  type FileItem,
  type CommandPaletteProviderProps,
  type PaletteMode,
} from './CommandPalette.parts'

export type { FileItem } from './CommandPalette.parts'

const CommandPaletteContext = createContext<CommandPaletteContextType | null>(null)

export function useCommandPalette() {
  const context = useContext(CommandPaletteContext)
  if (!context) {
    throw new Error('useCommandPalette must be used within CommandPaletteProvider')
  }
  return context
}

export function CommandPaletteProvider({
  children,
  onOpenFile,
  onOpenFileDialog,
  onSaveFile,
  onSaveAll,
  onUndo,
  onRedo,
  onFind,
  onReplace,
  onNewFile,
  onNewFolder,
  onSwitchProject,
  onToggleSidebar,
  onToggleTerminal,
  onAIChat,
  onOpenSettings,
  files = [],
  scriptingNodes = [],
  onInsertScriptingNode,
}: CommandPaletteProviderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<PaletteMode>('commands')
  const [commands, setCommands] = useState<CommandItem[]>(() =>
    createDefaultCommands({
      openFile: onOpenFileDialog,
      saveFile: onSaveFile,
      saveAll: onSaveAll,
      undo: onUndo,
      redo: onRedo,
      find: onFind,
      replace: onReplace,
      newFile: onNewFile,
      newFolder: onNewFolder,
      switchProject: onSwitchProject,
      toggleSidebar: onToggleSidebar,
      toggleTerminal: onToggleTerminal,
      aiChat: onAIChat,
      openSettings: onOpenSettings,
    })
  )

  useEffect(() => {
    setCommands(
      createDefaultCommands({
        openFile: onOpenFileDialog,
        saveFile: onSaveFile,
        saveAll: onSaveAll,
        undo: onUndo,
        redo: onRedo,
        find: onFind,
        replace: onReplace,
        newFile: onNewFile,
        newFolder: onNewFolder,
        switchProject: onSwitchProject,
        toggleSidebar: onToggleSidebar,
        toggleTerminal: onToggleTerminal,
        aiChat: onAIChat,
        openSettings: onOpenSettings,
      })
    )
  }, [
    onOpenFileDialog,
    onSaveFile,
    onSaveAll,
    onUndo,
    onRedo,
    onFind,
    onReplace,
    onNewFile,
    onNewFolder,
    onSwitchProject,
    onToggleSidebar,
    onToggleTerminal,
    onAIChat,
    onOpenSettings,
  ])

  const open = useCallback((nextMode: PaletteMode = 'commands') => {
    setMode(nextMode)
    setIsOpen(true)
  }, [])

  const close = useCallback(() => setIsOpen(false), [])

  const toggle = useCallback(
    (nextMode: PaletteMode = 'commands') => {
      if (isOpen && mode === nextMode) {
        setIsOpen(false)
        return
      }
      setMode(nextMode)
      setIsOpen(true)
    },
    [isOpen, mode]
  )

  const registerCommand = useCallback((command: CommandItem) => {
    setCommands((prev) => {
      const existing = prev.findIndex((item) => item.id === command.id)
      if (existing >= 0) {
        const next = [...prev]
        next[existing] = command
        return next
      }
      return [...prev, command]
    })
  }, [])

  const unregisterCommand = useCallback((id: string) => {
    setCommands((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const executeCommand = useCallback(
    async (id: string) => {
      const command = commands.find((item) => item.id === id)
      if (!command) return
      if (command.when && !command.when()) return
      await command.action()
    },
    [commands]
  )

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      const accel = event.ctrlKey || event.metaKey
      // Universal Search (FASE 3.5) — hierarchical search across commands,
      // files, and scripting nodes in a single list. Industry-standard
      // "Ctrl/Cmd+K" binding, additive to the existing Ctrl+Shift+P / Ctrl+P.
      if (accel && !event.shiftKey && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        toggle('all')
        return
      }
      if (accel && event.shiftKey && event.key.toLowerCase() === 'p') {
        event.preventDefault()
        toggle('commands')
        return
      }
      if (accel && !event.shiftKey && event.key.toLowerCase() === 'p') {
        event.preventDefault()
        toggle('files')
        return
      }
      if (accel && event.shiftKey && event.key.toLowerCase() === 'o') {
        event.preventDefault()
        toggle('symbols')
        return
      }
      if (accel && !event.shiftKey && event.key.toLowerCase() === 'g') {
        event.preventDefault()
        toggle('lines')
        return
      }
      if (event.key === 'Escape' && isOpen) {
        event.preventDefault()
        close()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggle, close, isOpen])

  useEffect(() => {
    const onOpen = (event: Event) => {
      const custom = event as CustomEvent<{ mode?: PaletteMode }>
      open(custom.detail?.mode || 'commands')
    }
    window.addEventListener('aethel.commandPalette.open', onOpen as EventListener)
    return () => window.removeEventListener('aethel.commandPalette.open', onOpen as EventListener)
  }, [open])

  const value: CommandPaletteContextType = {
    isOpen,
    mode,
    open,
    close,
    toggle,
    registerCommand,
    unregisterCommand,
    executeCommand,
    commands,
  }

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      <CommandPaletteUI
        isOpen={isOpen}
        mode={mode}
        commands={commands}
        files={files}
        scriptingNodes={scriptingNodes}
        close={close}
        executeCommand={executeCommand}
        onOpenFile={onOpenFile}
        onInsertScriptingNode={onInsertScriptingNode}
      />
    </CommandPaletteContext.Provider>
  )
}

export function useRegisterCommand(command: CommandItem, deps: unknown[] = []) {
  const { registerCommand, unregisterCommand } = useCommandPalette()

  useEffect(() => {
    registerCommand(command)
    return () => unregisterCommand(command.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerCommand, unregisterCommand, command.id, ...deps])
}

export default CommandPaletteProvider
