/**
 * Inline AI Chat - Context-aware chat integration for the editor
 * Productized to separate session logic from rendering and clarify operator affordances.
 */

'use client'

import React, { Fragment, useEffect, useId, useState } from 'react'
import { tokens } from '@/lib/design-tokens'
import {
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  FileText,
  Loader2,
  Send,
  Sparkles,
  User,
  X,
} from 'lucide-react'

import {
  buildContextSummary,
  buildSuggestionChips,
  getInlineAIFileName,
  getLoadingLabel,
  stripCodeBlocks,
  type InlineAIChatProps,
  type InlineAIMessage,
  type InlineAIMessageCodeBlock,
} from './InlineAIChat.helpers'
import { useInlineAIChatSession } from './useInlineAIChatSession'

const SURFACE_PRIMARY = 'var(--aethel-surface-primary)'
const SURFACE_SECONDARY = 'var(--aethel-surface-secondary)'
const SURFACE_TERTIARY = 'var(--aethel-surface-tertiary)'
const SURFACE_QUATERNARY = 'var(--aethel-surface-quaternary)'
const TEXT_PRIMARY = 'var(--aethel-text-primary)'
const TEXT_SECONDARY = 'var(--aethel-text-secondary)'
const TEXT_TERTIARY = 'var(--aethel-text-tertiary)'
const TEXT_INVERSE = 'var(--aethel-text-primary)'
const BORDER_PRIMARY = 'var(--aethel-border-primary)'
const BORDER_SECONDARY = 'var(--aethel-border-secondary)'
const BORDER_FOCUS = 'var(--aethel-border-focus)'
const ACCENT_CYAN = 'var(--aethel-info)'
const ACCENT_SUCCESS = 'var(--aethel-success-light)'
const PRIMARY_GRADIENT = 'linear-gradient(135deg, var(--aethel-primary), var(--aethel-info))'
const FOCUS_RING = '0 0 0 3px rgba(6, 182, 212, 0.12)'
const MESSAGE_TIME_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
})

const mixColor = (color: string, amount: number) =>
  `color-mix(in srgb, ${color} ${amount}%, transparent)`

export function InlineAIChat({
  activeFile,
  projectContext,
  onApplyCode,
  onClose,
}: InlineAIChatProps) {
  const {
    messages,
    input,
    setInput,
    isLoading,
    isExpanded,
    showContext,
    messagesEndRef,
    inputRef,
    sendMessage,
    stagePrompt,
    toggleExpanded,
    toggleContext,
  } = useInlineAIChatSession(activeFile)

  const bodyId = useId()
  const contextId = useId()
  const suggestionChips = buildSuggestionChips(activeFile)
  const contextSummary = buildContextSummary(activeFile, projectContext)
  const loadingLabel = getLoadingLabel(activeFile, projectContext)
  const conversationalMessageCount = messages.filter((message) => message.role !== 'system').length

  useEffect(() => {
    const textarea = inputRef.current

    if (!textarea) {
      return
    }

    textarea.style.height = '0px'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
  }, [input, inputRef])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendMessage()
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: SURFACE_SECONDARY,
        color: TEXT_PRIMARY,
        fontFamily: tokens.typography.fontFamily.sans,
      }}
    >
      <InlineAIHeader
        activeFile={activeFile}
        contextId={contextId}
        bodyId={bodyId}
        isExpanded={isExpanded}
        isLoading={isLoading}
        showContext={showContext}
        summary={contextSummary}
        conversationalMessageCount={conversationalMessageCount}
        onToggleExpanded={toggleExpanded}
        onToggleContext={toggleContext}
        onClose={onClose}
      />

      {showContext && isExpanded && (
        <InlineAIContextPanel
          id={contextId}
          activeFile={activeFile}
          projectContext={projectContext}
        />
      )}

      {isExpanded && (
        <>
          <InlineAIStatusCard
            activeFile={activeFile}
            projectContext={projectContext}
            summary={contextSummary}
          />

          <div
            id={bodyId}
            aria-live="polite"
            style={{
              flex: 1,
              overflow: 'auto',
              padding: tokens.spacing['4'],
              display: 'flex',
              flexDirection: 'column',
              gap: tokens.spacing['4'],
            }}
          >
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onApplyCode={onApplyCode}
              />
            ))}

            {isLoading && <LoadingState label={loadingLabel} />}
            <div ref={messagesEndRef} />
          </div>

          <SuggestionStrip chips={suggestionChips} onSelect={stagePrompt} />

          <InlineAIComposer
            activeFile={activeFile}
            projectContext={projectContext}
            input={input}
            inputRef={inputRef}
            isLoading={isLoading}
            canApplyDirectly={contextSummary.canApplyDirectly}
            onChange={setInput}
            onKeyDown={handleKeyDown}
            onSend={sendMessage}
          />
        </>
      )}
    </div>
  )
}

type InlineAIHeaderProps = {
  activeFile?: InlineAIChatProps['activeFile']
  contextId: string
  bodyId: string
  isExpanded: boolean
  isLoading: boolean
  showContext: boolean
  conversationalMessageCount: number
  summary: ReturnType<typeof buildContextSummary>
  onToggleExpanded: () => void
  onToggleContext: () => void
  onClose?: () => void
}

function InlineAIHeader({
  activeFile,
  contextId,
  bodyId,
  isExpanded,
  isLoading,
  showContext,
  conversationalMessageCount,
  summary,
  onToggleExpanded,
  onToggleContext,
  onClose,
}: InlineAIHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'space-between',
        gap: tokens.spacing['2'],
        padding: `${tokens.spacing['3']} ${tokens.spacing['4']}`,
        borderBottom: `1px solid ${BORDER_SECONDARY}`,
        background: mixColor(SURFACE_SECONDARY, 72),
      }}
    >
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-controls={bodyId}
        onClick={onToggleExpanded}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: tokens.spacing['3'],
          padding: 0,
          background: 'transparent',
          border: 'none',
          color: TEXT_PRIMARY,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing['3'], minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: tokens.radius.md,
              background: PRIMARY_GRADIENT,
              flexShrink: 0,
            }}
          >
            <Bot size={16} color={TEXT_INVERSE} />
          </div>

          <div style={{ minWidth: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: tokens.spacing['2'],
              }}
            >
              <span
                style={{
                  fontSize: tokens.typography.fontSize.sm,
                  fontWeight: tokens.typography.fontWeight.semibold,
                }}
              >
                Assistente de IA inline
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: tokens.spacing['1'],
                  padding: `2px ${tokens.spacing['2']}`,
                  borderRadius: tokens.radius.full,
                  background: isLoading ? mixColor(ACCENT_CYAN, 14) : mixColor(SURFACE_QUATERNARY, 68),
                  border: `1px solid ${isLoading ? mixColor(ACCENT_CYAN, 34) : BORDER_SECONDARY}`,
                  color: isLoading ? ACCENT_CYAN : TEXT_SECONDARY,
                  fontSize: tokens.typography.fontSize.xs,
                }}
              >
                {isLoading ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={12} />}
                {isLoading ? 'Respondendo' : summary.statusLabel}
              </span>
            </div>

            <div
              style={{
                marginTop: tokens.spacing['0.5'],
                display: 'flex',
                alignItems: 'center',
                gap: tokens.spacing['2'],
                minWidth: 0,
                color: TEXT_TERTIARY,
                fontSize: tokens.typography.fontSize.xs,
              }}
            >
              <FileText size={12} />
              <span
                style={{
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {activeFile ? activeFile.path : summary.scopeLabel}
              </span>
              <span aria-hidden="true">·</span>
              <span>{conversationalMessageCount} msgs</span>
            </div>
          </div>
        </div>

        {isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing['2'] }}>
        <button
          type="button"
          aria-pressed={showContext}
          aria-controls={contextId}
          aria-label={showContext ? 'Ocultar detalhes do contexto ativo' : 'Mostrar detalhes do contexto ativo'}
          onClick={onToggleContext}
          style={{
            padding: `${tokens.spacing['1']} ${tokens.spacing['2']}`,
            background: showContext ? mixColor(SURFACE_QUATERNARY, 80) : 'transparent',
            border: `1px solid ${showContext ? BORDER_PRIMARY : BORDER_SECONDARY}`,
            borderRadius: tokens.radius.md,
            color: showContext ? TEXT_PRIMARY : TEXT_TERTIARY,
            fontSize: tokens.typography.fontSize.xs,
            cursor: 'pointer',
          }}
        >
          Contexto
        </button>

        {onClose && (
          <button
            type="button"
            aria-label="Fechar chat inline"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: `1px solid ${BORDER_SECONDARY}`,
              borderRadius: tokens.radius.md,
              color: TEXT_TERTIARY,
              cursor: 'pointer',
              padding: tokens.spacing['1'],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  )
}

type InlineAIContextPanelProps = {
  id: string
  activeFile?: InlineAIChatProps['activeFile']
  projectContext?: InlineAIChatProps['projectContext']
}

function InlineAIContextPanel({ id, activeFile, projectContext }: InlineAIContextPanelProps) {
  const detailItems = [
    {
      label: 'Arquivo',
      value: activeFile?.path ?? 'Nenhum arquivo aberto',
    },
    {
      label: 'Linguagem',
      value: activeFile?.language ?? 'Sem linguagem ativa',
    },
    {
      label: 'Tamanho',
      value: activeFile ? `${activeFile.content.length} caracteres` : 'Sem buffer anexado',
    },
    {
      label: 'Projeto',
      value: projectContext
        ? `${projectContext.name} · ${projectContext.files.length} arquivos`
        : 'Sem projeto anexado',
    },
    {
      label: 'Saida do operador',
      value: 'Explicacao, revisao e blocos de codigo aplicaveis',
    },
    {
      label: 'Aplicacao',
      value: 'Sempre manual e explicita pelo botao Aplicar',
    },
  ]

  return (
    <div
      id={id}
      style={{
        padding: tokens.spacing['3'],
        background: mixColor(ACCENT_CYAN, 8),
        borderBottom: `1px solid ${BORDER_SECONDARY}`,
      }}
    >
      <div
        style={{
          marginBottom: tokens.spacing['2'],
          color: ACCENT_CYAN,
          fontWeight: tokens.typography.fontWeight.medium,
          fontSize: tokens.typography.fontSize.xs,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        Contexto ativo
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: tokens.spacing['2'],
        }}
      >
        {detailItems.map((item) => (
          <div
            key={item.label}
            style={{
              padding: tokens.spacing['3'],
              borderRadius: tokens.radius.lg,
              border: `1px solid ${mixColor(BORDER_PRIMARY, 70)}`,
              background: mixColor(SURFACE_PRIMARY, 76),
            }}
          >
            <div
              style={{
                marginBottom: tokens.spacing['1'],
                fontSize: tokens.typography.fontSize.xs,
                color: TEXT_TERTIARY,
              }}
            >
              {item.label}
            </div>
            <div
              style={{
                fontSize: tokens.typography.fontSize.sm,
                color: TEXT_SECONDARY,
                lineHeight: tokens.typography.lineHeight.relaxed,
                wordBreak: 'break-word',
              }}
            >
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

type InlineAIStatusCardProps = {
  activeFile?: InlineAIChatProps['activeFile']
  projectContext?: InlineAIChatProps['projectContext']
  summary: ReturnType<typeof buildContextSummary>
}

function InlineAIStatusCard({ activeFile, projectContext, summary }: InlineAIStatusCardProps) {
  return (
    <div
      style={{
        padding: `${tokens.spacing['3']} ${tokens.spacing['4']} 0`,
      }}
    >
      <div
        style={{
          padding: tokens.spacing['3'],
          borderRadius: tokens.radius.xl,
          border: `1px solid ${BORDER_SECONDARY}`,
          background: mixColor(SURFACE_PRIMARY, 74),
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: tokens.spacing['3'],
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div
              style={{
                fontSize: tokens.typography.fontSize.sm,
                fontWeight: tokens.typography.fontWeight.semibold,
              }}
            >
              {summary.scopeLabel}
            </div>
            <div
              style={{
                marginTop: tokens.spacing['1'],
                fontSize: tokens.typography.fontSize.xs,
                color: TEXT_SECONDARY,
                lineHeight: tokens.typography.lineHeight.relaxed,
              }}
            >
              {summary.operatorLabel}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: tokens.spacing['2'],
              flexWrap: 'wrap',
            }}
          >
            {activeFile && <ContextBadge label={getInlineAIFileName(activeFile.path)} icon={<FileText size={12} />} />}
            {projectContext && <ContextBadge label={`${projectContext.files.length} arquivos`} icon={<Sparkles size={12} />} />}
            <ContextBadge
              label={summary.canApplyDirectly ? 'Aplicacao manual pronta' : 'Modo consulta'}
              icon={<Check size={12} />}
              accent={summary.canApplyDirectly ? ACCENT_SUCCESS : TEXT_SECONDARY}
            />
          </div>
        </div>

        <div
          style={{
            marginTop: tokens.spacing['3'],
            fontSize: tokens.typography.fontSize.xs,
            color: TEXT_TERTIARY,
          }}
        >
          {summary.detailLabel}
        </div>
      </div>
    </div>
  )
}

type ContextBadgeProps = {
  label: string
  icon: React.ReactNode
  accent?: string
}

function ContextBadge({ label, icon, accent = TEXT_SECONDARY }: ContextBadgeProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: tokens.spacing['1'],
        padding: `${tokens.spacing['1']} ${tokens.spacing['2']}`,
        borderRadius: tokens.radius.full,
        border: `1px solid ${mixColor(accent, 32)}`,
        background: mixColor(accent, 12),
        color: accent,
        fontSize: tokens.typography.fontSize.xs,
        whiteSpace: 'nowrap',
      }}
    >
      {icon}
      {label}
    </span>
  )
}

type MessageBubbleProps = {
  message: InlineAIMessage
  onApplyCode?: (code: string) => void
}

function MessageBubble({ message, onApplyCode }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'
  const plainTextContent = stripCodeBlocks(message.content)
  const roleLabel = isUser ? 'Voce' : isSystem ? 'Contexto' : 'Assistente'

  if (isSystem) {
    return (
      <div
        style={{
          maxWidth: '100%',
          padding: tokens.spacing['3'],
          borderRadius: tokens.radius.lg,
          border: `1px solid ${mixColor(ACCENT_CYAN, 24)}`,
          background: mixColor(ACCENT_CYAN, 8),
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing['2'],
            marginBottom: tokens.spacing['2'],
            color: ACCENT_CYAN,
            fontSize: tokens.typography.fontSize.xs,
            fontWeight: tokens.typography.fontWeight.medium,
          }}
        >
          <Sparkles size={12} />
          <span>{roleLabel}</span>
          <span aria-hidden="true">·</span>
          <span>{MESSAGE_TIME_FORMATTER.format(message.timestamp)}</span>
        </div>

        <FormattedMessageBody content={plainTextContent} />
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: tokens.spacing['3'],
        alignItems: 'flex-start',
        flexDirection: isUser ? 'row-reverse' : 'row',
      }}
    >
      <div
        style={{
          width: '30px',
          height: '30px',
          borderRadius: tokens.radius.md,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          background: isUser ? mixColor(SURFACE_TERTIARY, 82) : PRIMARY_GRADIENT,
          border: isUser ? `1px solid ${BORDER_SECONDARY}` : 'none',
        }}
      >
        {isUser ? <User size={14} color={TEXT_SECONDARY} /> : <Bot size={14} color={TEXT_INVERSE} />}
      </div>

      <div
        style={{
          maxWidth: '85%',
          padding: tokens.spacing['3'],
          background: isUser
            ? `linear-gradient(135deg, ${mixColor(ACCENT_CYAN, 16)}, ${mixColor('var(--aethel-primary)', 10)})`
            : mixColor(SURFACE_SECONDARY, 74),
          border: `1px solid ${
            isUser ? mixColor(ACCENT_CYAN, 24) : BORDER_SECONDARY
          }`,
          borderRadius: tokens.radius.lg,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: tokens.spacing['3'],
            marginBottom: tokens.spacing['2'],
            color: TEXT_TERTIARY,
            fontSize: tokens.typography.fontSize.xs,
          }}
        >
          <span>{roleLabel}</span>
          <span>{MESSAGE_TIME_FORMATTER.format(message.timestamp)}</span>
        </div>

        {plainTextContent ? (
          <FormattedMessageBody content={plainTextContent} />
        ) : (
          <div
            style={{
              fontSize: tokens.typography.fontSize.sm,
              color: TEXT_SECONDARY,
            }}
          >
            Codigo sugerido abaixo.
          </div>
        )}

        {message.codeBlocks?.map((block) => (
          <CodeBlock
            key={`${block.language}-${block.code.slice(0, 24)}`}
            block={block}
            onApply={onApplyCode}
          />
        ))}
      </div>
    </div>
  )
}

type CodeBlockProps = {
  block: InlineAIMessageCodeBlock
  onApply?: (code: string) => void
}

function CodeBlock({ block, onApply }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) {
      return
    }

    const timeoutId = setTimeout(() => setCopied(false), 1800)
    return () => clearTimeout(timeoutId)
  }, [copied])

  const copyToClipboard = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(block.code)
      } else {
        fallbackCopy(block.code)
      }

      setCopied(true)
    } catch {
      fallbackCopy(block.code)
      setCopied(true)
    }
  }

  return (
    <div
      style={{
        marginTop: tokens.spacing['3'],
        border: `1px solid ${BORDER_SECONDARY}`,
        borderRadius: tokens.radius.lg,
        overflow: 'hidden',
        background: SURFACE_PRIMARY,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: tokens.spacing['2'],
          padding: `${tokens.spacing['2']} ${tokens.spacing['3']}`,
          background: mixColor(SURFACE_SECONDARY, 76),
          borderBottom: `1px solid ${BORDER_SECONDARY}`,
        }}
      >
        <span
          style={{
            fontSize: tokens.typography.fontSize.xs,
            color: TEXT_TERTIARY,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          {block.language}
        </span>

        <div style={{ display: 'flex', gap: tokens.spacing['2'], flexWrap: 'wrap' }}>
          <button
            type="button"
            aria-label="Copiar bloco de codigo"
            onClick={copyToClipboard}
            style={codeActionButtonStyle}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>

          {onApply && (
            <button
              type="button"
              aria-label="Aplicar bloco de codigo ao editor"
              onClick={() => onApply(block.code)}
              style={{
                ...codeActionButtonStyle,
                background: PRIMARY_GRADIENT,
                border: 'none',
                color: TEXT_PRIMARY,
              }}
            >
              <Sparkles size={12} />
              Aplicar
            </button>
          )}
        </div>
      </div>

      <pre
        style={{
          margin: 0,
          padding: tokens.spacing['3'],
          overflow: 'auto',
          fontSize: tokens.typography.fontSize.xs,
          fontFamily: tokens.typography.fontFamily.mono,
          lineHeight: tokens.typography.lineHeight.normal,
          color: TEXT_SECONDARY,
          maxHeight: '320px',
          tabSize: 2,
        }}
      >
        <code>{block.code}</code>
      </pre>
    </div>
  )
}

const codeActionButtonStyle: React.CSSProperties = {
  padding: `${tokens.spacing['1']} ${tokens.spacing['2']}`,
  background: 'transparent',
  border: `1px solid ${BORDER_SECONDARY}`,
  borderRadius: tokens.radius.md,
  color: TEXT_TERTIARY,
  fontSize: tokens.typography.fontSize.xs,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: tokens.spacing['1'],
}

type SuggestionStripProps = {
  chips: ReturnType<typeof buildSuggestionChips>
  onSelect: (prompt: string) => void
}

function SuggestionStrip({ chips, onSelect }: SuggestionStripProps) {
  return (
    <div
      style={{
        padding: `${tokens.spacing['3']} ${tokens.spacing['4']}`,
        borderTop: `1px solid ${BORDER_SECONDARY}`,
        display: 'flex',
        flexDirection: 'column',
        gap: tokens.spacing['2'],
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: tokens.spacing['2'],
          color: TEXT_TERTIARY,
          fontSize: tokens.typography.fontSize.xs,
        }}
      >
        <span>Atalhos do operador</span>
        <span>Preenchem o composer antes do envio</span>
      </div>

      <div
        style={{
          display: 'flex',
          gap: tokens.spacing['2'],
          overflowX: 'auto',
          paddingBottom: tokens.spacing['1'],
        }}
      >
        {chips.map((chip) => {
          const Icon = chip.icon

          return (
            <button
              key={chip.id}
              type="button"
              aria-label={`Usar sugestao rapida ${chip.label}`}
              onClick={() => onSelect(chip.prompt)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: tokens.spacing['1'],
                minWidth: '164px',
                padding: `${tokens.spacing['2']} ${tokens.spacing['3']}`,
                background: mixColor(SURFACE_SECONDARY, 74),
                border: `1px solid ${BORDER_SECONDARY}`,
                borderRadius: tokens.radius.lg,
                color: TEXT_SECONDARY,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing['2'] }}>
                <Icon size={14} />
                <span
                  style={{
                    fontSize: tokens.typography.fontSize.sm,
                    color: TEXT_PRIMARY,
                  }}
                >
                  {chip.label}
                </span>
              </span>
              <span
                style={{
                  fontSize: tokens.typography.fontSize.xs,
                  color: TEXT_TERTIARY,
                  lineHeight: tokens.typography.lineHeight.relaxed,
                }}
              >
                {chip.operatorHint}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

type InlineAIComposerProps = {
  activeFile?: InlineAIChatProps['activeFile']
  projectContext?: InlineAIChatProps['projectContext']
  input: string
  inputRef: React.RefObject<HTMLTextAreaElement>
  isLoading: boolean
  canApplyDirectly: boolean
  onChange: (value: string) => void
  onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onSend: () => void
}

function InlineAIComposer({
  activeFile,
  projectContext,
  input,
  inputRef,
  isLoading,
  canApplyDirectly,
  onChange,
  onKeyDown,
  onSend,
}: InlineAIComposerProps) {
  const [isFocused, setIsFocused] = useState(false)
  const hasInput = input.trim().length > 0

  const placeholder = activeFile
    ? `Pergunte sobre ${getInlineAIFileName(activeFile.path)} ou peca um patch/refatoracao...`
    : 'Descreva a tarefa ou use um atalho para estruturar o pedido...'

  return (
    <div
      style={{
        padding: tokens.spacing['4'],
        borderTop: `1px solid ${BORDER_SECONDARY}`,
        background: mixColor(SURFACE_SECONDARY, 72),
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: tokens.spacing['2'],
          flexWrap: 'wrap',
          marginBottom: tokens.spacing['3'],
        }}
      >
        {activeFile && <ContextBadge label={getInlineAIFileName(activeFile.path)} icon={<FileText size={12} />} />}
        {projectContext && <ContextBadge label={projectContext.name} icon={<Sparkles size={12} />} />}
        <ContextBadge
          label={canApplyDirectly ? 'Aplicar continua manual' : 'Modo consulta'}
          icon={<Check size={12} />}
          accent={canApplyDirectly ? ACCENT_SUCCESS : TEXT_SECONDARY}
        />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: tokens.spacing['2'],
          padding: tokens.spacing['3'],
          background: SURFACE_PRIMARY,
          border: `1px solid ${isFocused ? BORDER_FOCUS : BORDER_SECONDARY}`,
          borderRadius: tokens.radius.xl,
          boxShadow: isFocused ? FOCUS_RING : 'none',
          transition: `border-color ${tokens.animation.duration.fast}, box-shadow ${tokens.animation.duration.fast}`,
        }}
        onFocusCapture={() => setIsFocused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setIsFocused(false)
          }
        }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: TEXT_PRIMARY,
            fontSize: tokens.typography.fontSize.sm,
            fontFamily: tokens.typography.fontFamily.sans,
            resize: 'none',
            minHeight: '24px',
            maxHeight: '120px',
            lineHeight: '1.5',
          }}
          rows={1}
        />

        <button
          type="button"
          aria-label="Enviar mensagem no chat inline"
          onClick={onSend}
          disabled={!hasInput || isLoading}
          style={{
            padding: `${tokens.spacing['2']} ${tokens.spacing['3']}`,
            background: hasInput && !isLoading ? PRIMARY_GRADIENT : SURFACE_TERTIARY,
            border: 'none',
            borderRadius: tokens.radius.lg,
            color: TEXT_PRIMARY,
            cursor: hasInput && !isLoading ? 'pointer' : 'not-allowed',
            opacity: hasInput && !isLoading ? 1 : 0.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: tokens.spacing['2'],
            minWidth: '96px',
          }}
        >
          {isLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
          <span>{isLoading ? 'Enviando' : 'Enviar'}</span>
        </button>
      </div>

      <div
        style={{
          marginTop: tokens.spacing['2'],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: tokens.spacing['2'],
          flexWrap: 'wrap',
          fontSize: tokens.typography.fontSize.xs,
          color: TEXT_TERTIARY,
        }}
      >
        <span>{hasInput ? `${input.trim().length} caracteres prontos` : 'Nada sera aplicado automaticamente.'}</span>
        <span>Enter envia · Shift+Enter cria nova linha</span>
      </div>
    </div>
  )
}

function LoadingState({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacing['2'],
        padding: tokens.spacing['3'],
        borderRadius: tokens.radius.lg,
        border: `1px solid ${mixColor(ACCENT_CYAN, 28)}`,
        background: mixColor(ACCENT_CYAN, 10),
        color: TEXT_SECONDARY,
        fontSize: tokens.typography.fontSize.sm,
      }}
    >
      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
      <span>{label}</span>
    </div>
  )
}

function FormattedMessageBody({ content }: { content: string }) {
  const lines = content.split('\n')

  return (
    <div
      style={{
        fontSize: tokens.typography.fontSize.sm,
        color: TEXT_PRIMARY,
        lineHeight: tokens.typography.lineHeight.relaxed,
      }}
    >
      {lines.map((line, index) => {
        const trimmedLine = line.trim()

        if (!trimmedLine) {
          return <div key={`spacer-${index}`} style={{ height: tokens.spacing['2'] }} />
        }

        const listMatch = trimmedLine.match(/^(\d+\.|-)\s+(.*)$/)

        if (listMatch) {
          const prefix = listMatch[1] === '-' ? '•' : listMatch[1]
          return (
            <div
              key={`line-${index}`}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: tokens.spacing['2'],
                marginTop: tokens.spacing['1'],
              }}
            >
              <span style={{ color: TEXT_TERTIARY, minWidth: '16px' }}>{prefix}</span>
              <span>{renderInlineFormatting(listMatch[2])}</span>
            </div>
          )
        }

        return (
          <div key={`line-${index}`} style={{ marginTop: index === 0 ? 0 : tokens.spacing['1'] }}>
            {renderInlineFormatting(line)}
          </div>
        )
      })}
    </div>
  )
}

function renderInlineFormatting(content: string): React.ReactNode[] {
  return content
    .split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g)
    .filter(Boolean)
    .map((segment, index) => {
      if (segment.startsWith('**') && segment.endsWith('**')) {
        return <strong key={`segment-${index}`}>{segment.slice(2, -2)}</strong>
      }

      if (segment.startsWith('`') && segment.endsWith('`')) {
        return (
          <code
            key={`segment-${index}`}
            style={{
              padding: '2px 4px',
              borderRadius: tokens.radius.sm,
              background: mixColor(SURFACE_QUATERNARY, 76),
              color: TEXT_SECONDARY,
              fontFamily: tokens.typography.fontFamily.mono,
              fontSize: '0.95em',
            }}
          >
            {segment.slice(1, -1)}
          </code>
        )
      }

      if (segment.startsWith('*') && segment.endsWith('*')) {
        return <em key={`segment-${index}`}>{segment.slice(1, -1)}</em>
      }

      return <Fragment key={`segment-${index}`}>{segment}</Fragment>
    })
}

function fallbackCopy(content: string) {
  if (typeof document === 'undefined') {
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = content
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'absolute'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

export default InlineAIChat
