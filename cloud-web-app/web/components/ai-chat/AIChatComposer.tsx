'use client'

import type { ChangeEvent, FormEvent, KeyboardEvent, Ref } from 'react'
import { AlertTriangle, ImageIcon, Mic, MicOff, Paperclip, Send, StopCircle } from 'lucide-react'
import { CodebaseContextPanel, MentionContextPanel } from '@/components/ide/AIChatContextPanels'
import { AttachmentPreview } from '@/components/ide/AIChatPanelChrome'
import type {
  Attachment,
  CodebaseContextPreview,
  MentionContextPreviewBlock,
} from '@/components/ide/AIChatPanelPro.types'
import type { UseChatContextPreviewsReturn } from './useChatContextPreviews'
import {
  MentionChip,
  SuggestionList,
  type Mention,
  type MentionSuggestion,
} from '@/lib/copilot/mention-parser'
import { QUICK_MENTIONS } from './presets'

interface AIChatComposerProps {
  input: string
  inputRef: Ref<HTMLTextAreaElement>
  isLoading: boolean
  onSubmit: (event?: FormEvent) => void
  onInputChange: (value: string, cursor: number) => void
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void
  mentionState: {
    parsedMentions: Mention[]
    showSuggestions: boolean
    suggestions: MentionSuggestion[]
    activeSuggestionIndex: number
    setActiveSuggestionIndex: (index: number) => void
    applySuggestion: (suggestion: MentionSuggestion) => void
  }
  allowAttachments: boolean
  attachments: Attachment[]
  onRemoveAttachment: (id: string) => void
  onFileAttach: () => void
  onImageAttach: () => void
  onFileSelect: (event: ChangeEvent<HTMLInputElement>, type: 'file' | 'image') => void
  fileInputRef: Ref<HTMLInputElement>
  imageInputRef: Ref<HTMLInputElement>
  supportsVision: boolean
  isRecording: boolean
  transcript: string
  voiceError?: string | null
  onStopRecording: () => void
  onClearVoiceError: () => void
  onToggleVoice: () => void
  showAdvancedControls: boolean
  onInsertQuickMention: (value: string) => void
  codebaseContextPreview: CodebaseContextPreview
  mentionContextPreview: UseChatContextPreviewsReturn['mentionContextPreview']
  onRefreshCodebaseContext: () => void
  onCopy: (content: string) => Promise<void>
  onOpenCodeContextResult: (filePath: string, startLine?: number, endLine?: number) => void
  onOpenMentionContextBlock: (block: MentionContextPreviewBlock) => void
}

export function AIChatComposer({
  input,
  inputRef,
  isLoading,
  onSubmit,
  onInputChange,
  onKeyDown,
  mentionState,
  allowAttachments,
  attachments,
  onRemoveAttachment,
  onFileAttach,
  onImageAttach,
  onFileSelect,
  fileInputRef,
  imageInputRef,
  supportsVision,
  isRecording,
  transcript,
  voiceError,
  onStopRecording,
  onClearVoiceError,
  onToggleVoice,
  showAdvancedControls,
  onInsertQuickMention,
  codebaseContextPreview,
  mentionContextPreview,
  onRefreshCodebaseContext,
  onCopy,
  onOpenCodeContextResult,
  onOpenMentionContextBlock,
}: AIChatComposerProps) {
  return (
    <form onSubmit={onSubmit} className="border-t border-[var(--aethel-border-secondary)] p-3">
      {mentionState.parsedMentions.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {mentionState.parsedMentions.map((mention, index) => (
            <MentionChip key={`${mention.displayName}-${index}`} mention={mention} />
          ))}
        </div>
      )}

      {allowAttachments && attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <AttachmentPreview
              key={attachment.id}
              attachment={attachment}
              onRemove={() => onRemoveAttachment(attachment.id)}
            />
          ))}
        </div>
      )}

      {isRecording && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] px-3 py-2" role="status" aria-live="polite">
          <div className="h-2 w-2 animate-pulse rounded-full bg-[var(--aethel-error)]" />
          <span className="flex-1 text-sm text-[var(--aethel-error)]">Gravando... {transcript && `"${transcript}"`}</span>
          <button
            type="button"
            aria-label="Parar gravacao de voz"
            onClick={onStopRecording}
            className="rounded px-2 py-1 text-xs text-[var(--aethel-error)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-error)_26%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-error)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
          >
            Parar
          </button>
        </div>
      )}

      {voiceError && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] px-3 py-2 text-xs text-[var(--aethel-warning)]" role="alert" aria-live="polite">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span className="flex-1">{voiceError}</span>
          <button
            type="button"
            aria-label="Fechar erro de voz"
            onClick={onClearVoiceError}
            className="rounded px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-secondary)] transition hover:text-[var(--aethel-text-primary)]"
          >
            Fechar
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="flex items-center gap-1 pb-1">
          {allowAttachments && (
            <button
              type="button"
              aria-label="Anexar arquivo"
              onClick={onFileAttach}
              className="rounded p-1.5 text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
              title="Anexar arquivo"
            >
              <Paperclip className="h-4 w-4" />
            </button>
          )}

          {allowAttachments && supportsVision && (
            <button
              type="button"
              aria-label="Anexar imagem"
              onClick={onImageAttach}
              className="rounded p-1.5 text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
              title="Anexar imagem"
            >
              <ImageIcon className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            aria-label={isRecording ? 'Parar gravacao por voz' : 'Iniciar gravacao por voz'}
            onClick={onToggleVoice}
            className={`rounded p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] ${
              isRecording
                ? 'bg-[var(--aethel-error)] text-[var(--aethel-text-primary)]'
                : 'text-[var(--aethel-text-tertiary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)]'
            }`}
            title={isRecording ? 'Parar gravacao' : 'Entrada de voz'}
          >
            {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
        </div>

        <div className="relative flex-1">
          {mentionState.showSuggestions && mentionState.suggestions.length > 0 && (
            <SuggestionList
              suggestions={mentionState.suggestions}
              activeIndex={mentionState.activeSuggestionIndex}
              onSelect={mentionState.applySuggestion}
              onHover={mentionState.setActiveSuggestionIndex}
              listboxId="mention-suggestions-list"
            />
          )}

          <textarea
            ref={inputRef}
            value={input}
            onChange={(event) => onInputChange(event.target.value, event.target.selectionStart ?? event.target.value.length)}
            onKeyDown={onKeyDown}
            placeholder={isRecording ? 'Ouvindo...' : 'Pergunte para a IA sobre o seu codigo...'}
            disabled={isLoading}
            aria-controls="mention-suggestions-list"
            aria-label="Mensagem do chat"
            className="min-h-[44px] max-h-[200px] w-full resize-none rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_84%,transparent)] px-4 py-2.5 pr-12 text-sm text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-quaternary)] focus:border-[color-mix(in_srgb,var(--aethel-info)_48%,transparent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
            rows={1}
          />

          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={`absolute bottom-2 right-2 rounded-lg p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] ${
              input.trim() && !isLoading
                ? 'bg-[var(--aethel-primary)] text-[var(--aethel-text-primary)] hover:brightness-110'
                : 'cursor-not-allowed bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_72%,transparent)] text-[var(--aethel-text-quaternary)]'
            }`}
            aria-label={isLoading ? 'Parar resposta' : 'Enviar mensagem'}
            title={isLoading ? 'Parar resposta' : 'Enviar mensagem'}
          >
            {isLoading ? <StopCircle className="h-4 w-4" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {showAdvancedControls && (
        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK_MENTIONS.map((mention) => (
            <button
              key={mention.label}
              type="button"
              onClick={() => onInsertQuickMention(mention.value)}
              className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] px-2.5 py-1 text-[11px] text-[var(--aethel-text-secondary)] transition-colors hover:border-[color-mix(in_srgb,var(--aethel-info)_35%,transparent)] hover:text-[var(--aethel-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
            >
              {mention.label}
            </button>
          ))}
        </div>
      )}

      <CodebaseContextPanel
        input={input}
        preview={codebaseContextPreview}
        onRefresh={onRefreshCodebaseContext}
        onCopy={onCopy}
        onOpenResult={onOpenCodeContextResult}
      />

      <MentionContextPanel
        preview={mentionContextPreview}
        onCopy={onCopy}
        onOpenFileBlock={onOpenMentionContextBlock}
      />

      {allowAttachments && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".ts,.tsx,.js,.jsx,.json,.md,.txt,.py,.css,.html"
            onChange={(event) => onFileSelect(event, 'file')}
          />
          <input
            ref={imageInputRef}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={(event) => onFileSelect(event, 'image')}
          />
        </>
      )}
    </form>
  )
}
