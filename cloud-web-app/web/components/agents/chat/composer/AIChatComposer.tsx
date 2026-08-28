'use client'

import type { ChangeEvent, FormEvent, KeyboardEvent, Ref } from 'react'
import { AlertTriangle, ImageIcon, Loader2, Mic, MicOff, Paperclip, Send, StopCircle } from 'lucide-react'
import { CodebaseContextPanel, MentionContextPanel } from '@aethel/ide-ui/AIChatContextPanels'
import { AttachmentPreview } from '@aethel/ide-ui/AIChatPanelChrome'
import type {
  Attachment,
  CodebaseContextPreview,
  MentionContextPreviewBlock,
} from '@aethel/ide-ui/AIChatPanelPro.types'
import type { UseChatContextPreviewsReturn } from '@/components/agents/chat/context'
import {
  MentionChip,
  SuggestionList,
  type Mention,
  type MentionSuggestion,
} from '@/lib/copilot/mention-parser'
import type { AIChatModePreset } from '@/components/agents/chat/presets'
import { ComposerCostChip } from '@/components/billing/ComposerCostChip'
import { isByokEnabledFlag } from '@/lib/ai/byok-idb-store'

interface AIChatComposerProps {
  input: string
  inputRef: Ref<HTMLTextAreaElement>
  isLoading: boolean
  onSubmit: (event?: FormEvent) => void
  onInterrupt?: () => void
  modePreset: AIChatModePreset
  /** Block 6H.3 — model for pre-send cost chip */
  currentModel?: string
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
  isTranscribing: boolean
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
  onInterrupt,
  modePreset,
  currentModel = 'openai/gpt-4o-mini',
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
  isTranscribing,
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
    <form
      data-ai-composer="calm"
      onSubmit={onSubmit}
      className="border-t border-[var(--aethel-border-secondary)] p-3"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <ComposerCostChip
          modelId={currentModel}
          promptText={input}
          byokActive={isByokEnabledFlag()}
        />
      </div>
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
          <span className="flex-1 text-sm text-[var(--aethel-error)]">Recording... {transcript && `"${transcript}"`}</span>
          <button
            type="button"
            aria-label="Stop voice recording"
            onClick={onStopRecording}
            className="rounded px-2 py-1 text-xs text-[var(--aethel-error)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-error)_26%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-error)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
          >
            Stop
          </button>
        </div>
      )}

      {isTranscribing && !isRecording && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] px-3 py-2 text-xs text-[var(--aethel-info-light)]" role="status" aria-live="polite">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Transcribing audio with safe server fallback...</span>
        </div>
      )}

      {voiceError && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] px-3 py-2 text-xs text-[var(--aethel-warning)]" role="alert" aria-live="polite">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span className="flex-1">{voiceError}</span>
          <button
            type="button"
            aria-label="Dismiss voice error"
            onClick={onClearVoiceError}
            className="rounded px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-secondary)] transition hover:text-[var(--aethel-text-primary)]"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="flex items-center gap-1 pb-1">
          {allowAttachments && (
            <button
              type="button"
              aria-label="Attach file"
              onClick={onFileAttach}
              className="rounded p-1.5 text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
              title="Attach file"
            >
              <Paperclip className="h-4 w-4" />
            </button>
          )}

          {allowAttachments && supportsVision && (
            <button
              type="button"
              aria-label="Attach image"
              onClick={onImageAttach}
              className="rounded p-1.5 text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
              title="Attach image"
            >
              <ImageIcon className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            aria-label={isRecording ? 'Stop voice recording' : 'Start voice recording'}
            onClick={onToggleVoice}
            disabled={isTranscribing}
            className={`rounded p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] ${
              isRecording
                ? 'bg-[var(--aethel-error)] text-[var(--aethel-text-primary)]'
                : 'text-[var(--aethel-text-tertiary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)] disabled:cursor-wait disabled:opacity-60'
            }`}
            title={isRecording ? 'Stop recording' : 'Voice input'}
          >
            {isTranscribing ? <Loader2 className="h-4 w-4 animate-spin" /> : isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
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
            placeholder={isRecording ? 'Listening...' : modePreset.placeholder}
            disabled={isLoading}
            aria-controls="mention-suggestions-list"
            aria-label="Chat message"
            className="min-h-[44px] max-h-[200px] w-full resize-none rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_84%,transparent)] px-4 py-2.5 pr-12 text-sm text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-quaternary)] focus:border-[color-mix(in_srgb,var(--aethel-info)_48%,transparent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
            rows={1}
          />

          <button
            type={isLoading ? 'button' : 'submit'}
            disabled={isLoading ? !onInterrupt : !input.trim()}
            onClick={isLoading ? onInterrupt : undefined}
            className={`absolute bottom-2 right-2 rounded-lg p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] ${
              (isLoading && onInterrupt) || (input.trim() && !isLoading)
                ? 'bg-[var(--aethel-text-primary)] text-[var(--aethel-surface-primary)] hover:bg-[var(--aethel-text-secondary)]'
                : 'cursor-not-allowed bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_72%,transparent)] text-[var(--aethel-text-quaternary)]'
            }`}
            aria-label={isLoading ? 'Stop response' : modePreset.submitLabel}
            title={isLoading ? 'Stop response' : modePreset.submitLabel}
          >
            {isLoading ? <StopCircle className="h-4 w-4" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {showAdvancedControls ? (
        <details className="group mt-2 text-[11px] text-[var(--aethel-text-quaternary)]">
          <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-full border border-[var(--aethel-border-subtle)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-secondary)]">
            Composer context
            <span className="text-[var(--aethel-text-quaternary)] group-open:hidden">show</span>
            <span className="hidden text-[var(--aethel-text-quaternary)] group-open:inline">hide</span>
          </summary>
          <div className="mt-2 text-[11px] text-[var(--aethel-text-quaternary)]">{modePreset.helper}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {modePreset.quickMentions.map((mention) => (
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
        </details>
      ) : (
        <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--aethel-text-quaternary)]">
          <div className="flex items-center gap-2">
            <span>{modePreset.helper}</span>
            <ComposerCostChip modelId={currentModel} promptText={input} byokActive={isByokEnabledFlag()} />
          </div>
          <span className="flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] px-2 py-0.5 text-[9px] uppercase tracking-[0.08em] text-[var(--aethel-info)]" title="Use Alt+D no Preview para carregar elementos visuais e Blueprints direto no Chat">
             <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--aethel-info)]" />
             Visual Diff (Alt+D)
          </span>
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
