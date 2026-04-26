'use client'

import React, { useState } from 'react'
import { tokens } from '@/lib/design-tokens'
import {
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
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
  stripCodeBlocks,
  type InlineAIChatProps,
  type InlineAIMessage,
} from './InlineAIChat.helpers'
import {
  ACCENT_CYAN,
  ACCENT_SUCCESS,
  BORDER_FOCUS,
  BORDER_PRIMARY,
  BORDER_SECONDARY,
  FOCUS_RING,
  MESSAGE_TIME_FORMATTER,
  PRIMARY_GRADIENT,
  SURFACE_PRIMARY,
  SURFACE_QUATERNARY,
  SURFACE_SECONDARY,
  SURFACE_TERTIARY,
  TEXT_INVERSE,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
  mixColor,
} from './InlineAIChat.styles'
import { CodeBlock, ContextBadge, FormattedMessageBody, LoadingState } from './InlineAIChatPrimitives'

export function InlineAIHeader({
  activeFile,
  bodyId,
  contextId,
  conversationalMessageCount,
  isExpanded,
  isLoading,
  onClose,
  onToggleContext,
  onToggleExpanded,
  showContext,
  summary,
}: {
  activeFile?: InlineAIChatProps['activeFile']
  bodyId: string
  contextId: string
  conversationalMessageCount: number
  isExpanded: boolean
  isLoading: boolean
  onClose?: () => void
  onToggleContext: () => void
  onToggleExpanded: () => void
  showContext: boolean
  summary: ReturnType<typeof buildContextSummary>
}) {
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

export function InlineAIContextPanel({
  activeFile,
  id,
  projectContext,
}: {
  activeFile?: InlineAIChatProps['activeFile']
  id: string
  projectContext?: InlineAIChatProps['projectContext']
}) {
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
        ? `${projectContext.name} - ${projectContext.files.length} arquivos`
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

export function InlineAIStatusCard({
  activeFile,
  projectContext,
  summary,
}: {
  activeFile?: InlineAIChatProps['activeFile']
  projectContext?: InlineAIChatProps['projectContext']
  summary: ReturnType<typeof buildContextSummary>
}) {
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

export function InlineAIMessageList({
  isLoading,
  label,
  messages,
  messagesEndRef,
  onApplyCode,
}: {
  isLoading: boolean
  label: string
  messages: InlineAIMessage[]
  messagesEndRef: React.RefObject<HTMLDivElement>
  onApplyCode?: (code: string) => void
}) {
  return (
    <div
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
        <MessageBubble key={message.id} message={message} onApplyCode={onApplyCode} />
      ))}

      {isLoading && <LoadingState label={label} />}
      <div ref={messagesEndRef} />
    </div>
  )
}

export function SuggestionStrip({
  activeFile,
  onSelect,
}: {
  activeFile?: InlineAIChatProps['activeFile']
  onSelect: (prompt: string) => void
}) {
  const chips = buildSuggestionChips(activeFile)

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

export function InlineAIComposer({
  activeFile,
  canApplyDirectly,
  input,
  inputRef,
  isLoading,
  onChange,
  onKeyDown,
  onSend,
  projectContext,
}: {
  activeFile?: InlineAIChatProps['activeFile']
  canApplyDirectly: boolean
  input: string
  inputRef: React.RefObject<HTMLTextAreaElement>
  isLoading: boolean
  onChange: (value: string) => void
  onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onSend: () => void
  projectContext?: InlineAIChatProps['projectContext']
}) {
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

function MessageBubble({
  message,
  onApplyCode,
}: {
  message: InlineAIMessage
  onApplyCode?: (code: string) => void
}) {
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
          border: `1px solid ${isUser ? mixColor(ACCENT_CYAN, 24) : BORDER_SECONDARY}`,
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

