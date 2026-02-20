'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type PromptOptions = {
  title: string
  placeholder?: string
  defaultValue?: string
}

type PromptState = PromptOptions & {
  open: boolean
}

type ConfirmState = {
  open: boolean
  message: string
}

export function usePromptDialog() {
  const resolverRef = useRef<((value: string | null) => void) | null>(null)
  const [state, setState] = useState<PromptState>({
    open: false,
    title: '',
    placeholder: '',
    defaultValue: '',
  })
  const [value, setValue] = useState('')

  const openPrompt = useCallback((options: PromptOptions) => {
    return new Promise<string | null>((resolve) => {
      resolverRef.current = resolve
      setValue(options.defaultValue || '')
      setState({
        open: true,
        title: options.title,
        placeholder: options.placeholder,
        defaultValue: options.defaultValue,
      })
    })
  }, [])

  const closePrompt = useCallback((nextValue: string | null) => {
    const resolver = resolverRef.current
    resolverRef.current = null
    setState((prev) => ({ ...prev, open: false }))
    resolver?.(nextValue)
  }, [])

  return { state, value, setValue, openPrompt, closePrompt }
}

export function useConfirmDialog() {
  const resolverRef = useRef<((value: boolean) => void) | null>(null)
  const [state, setState] = useState<ConfirmState>({
    open: false,
    message: '',
  })

  const openConfirm = useCallback((message: string) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
      setState({ open: true, message })
    })
  }, [])

  const closeConfirm = useCallback((accepted: boolean) => {
    const resolver = resolverRef.current
    resolverRef.current = null
    setState({ open: false, message: '' })
    resolver?.(accepted)
  }, [])

  return { state, openConfirm, closeConfirm }
}

export function PromptDialog({
  title,
  placeholder,
  value,
  open,
  onChange,
  onCancel,
  onConfirm,
}: {
  title: string
  placeholder?: string
  value: string
  open: boolean
  onChange: (next: string) => void
  onCancel: () => void
  onConfirm: () => void
}) {
  if (!open) return null
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/45">
      <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 p-4 shadow-2xl">
        <div className="text-sm font-semibold text-slate-100">{title}</div>
        <input
          autoFocus
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              onConfirm()
            }
            if (event.key === 'Escape') {
              onCancel()
            }
          }}
          placeholder={placeholder}
          className="mt-3 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500"
        />
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 focus-visible:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded border border-blue-500/50 bg-blue-600/30 px-3 py-1.5 text-xs text-blue-100 hover:bg-blue-600/40 focus-visible:bg-blue-600/40"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

export function ConfirmDialog({
  open,
  message,
  onCancel,
  onConfirm,
}: {
  open: boolean
  message: string
  onCancel: () => void
  onConfirm: () => void
}) {
  if (!open) return null
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/45">
      <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 p-4 shadow-2xl">
        <div className="text-sm font-semibold text-slate-100">Confirm action</div>
        <div className="mt-2 text-xs leading-5 text-slate-300">{message}</div>
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 focus-visible:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded border border-red-500/50 bg-red-600/30 px-3 py-1.5 text-xs text-red-100 hover:bg-red-600/40 focus-visible:bg-red-600/40"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

export function useStatusMessage() {
  const [message, setMessage] = useState<string | null>(null)
  const timeoutRef = useRef<number | null>(null)

  const pushMessage = useCallback((next: string) => {
    setMessage(next)
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    timeoutRef.current = window.setTimeout(() => setMessage(null), 3000)
  }, [])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    }
  }, [])

  return { message, pushMessage }
}
